'use strict';

/**
 * jobs.js — In-memory job registry for long-running scan/substitute tasks.
 *
 * Jobs are fire-and-forget: a route creates a job, returns its id, and the
 * worker runs asynchronously. Status/progress are polled via GET /api/jobs/:id.
 *
 * Jobs expire 2h after creation (lazy expiry on read).
 */

const { v4: uuidv4 } = require('uuid');

const JOB_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/** @type {Map<string, object>} */
const jobs = new Map();

const STATUSES = new Set(['queued', 'running', 'paused', 'done', 'failed']);

/**
 * @param {string} type - 'scan' | 'substitute'
 * @param {object} [payload]
 * @returns {object} the job record
 */
function createJob(type, payload = {}) {
  const id = uuidv4();
  const job = {
    id,
    type,
    status: 'queued',
    progress: { done: 0, total: 0 },
    results: [],
    errors: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pauseRequested: false,
    cancelRequested: false,
    finishedAt: null,
  };
  // Payload is internal bookkeeping (may hold session refs); never serialized to clients.
  job._payload = payload;
  jobs.set(id, job);
  return job;
}

function getJob(id) {
  const job = jobs.get(id);
  if (!job) return null;
  if (Date.now() - job.createdAt > JOB_TTL_MS) {
    jobs.delete(id);
    return null;
  }
  return job;
}

/** Public-safe view of a job (no internal payload). */
function toPublic(job) {
  if (!job) return null;
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: { ...job.progress },
    results: job.results,
    errors: job.errors,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt,
  };
}

function setStatus(job, status) {
  if (!STATUSES.has(status)) throw new Error(`invalid job status: ${status}`);
  job.status = status;
  job.updatedAt = Date.now();
  if (status === 'done' || status === 'failed') job.finishedAt = Date.now();
}

function touch(job) {
  job.updatedAt = Date.now();
}

/** @returns {boolean} false if job missing/expired */
function pauseJob(id) {
  const job = getJob(id);
  if (!job) return false;
  if (job.status === 'done' || job.status === 'failed') return true;
  job.pauseRequested = true;
  touch(job);
  return true;
}

/** @returns {boolean} false if job missing/expired */
function resumeJob(id) {
  const job = getJob(id);
  if (!job) return false;
  if (job.status === 'done' || job.status === 'failed') return true;
  job.pauseRequested = false;
  if (job.status === 'paused') {
    setStatus(job, 'running');
    // The worker loop checks job.pauseRequested, so resuming from 'paused'
    // lets it continue; the route also triggers the runner callback if needed.
  }
  touch(job);
  return true;
}

/** @returns {boolean} false if job missing/expired */
function cancelJob(id) {
  const job = getJob(id);
  if (!job) return false;
  if (job.status === 'done' || job.status === 'failed') return true;
  job.cancelRequested = true;
  touch(job);
  return true;
}

/** Sweep helper (optional): remove expired jobs eagerly. */
function pruneExpired() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

module.exports = {
  createJob,
  getJob,
  toPublic,
  setStatus,
  touch,
  pauseJob,
  resumeJob,
  cancelJob,
  pruneExpired,
  JOB_TTL_MS,
};
