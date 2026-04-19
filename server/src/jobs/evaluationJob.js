import cron from "node-cron";

import { appConfig } from "../config.js";
import { listServices } from "../repositories/servicesRepository.js";
import { runScheduledEvaluationForAllServices } from "../services/evaluationService.js";

let scheduledTask = null;
let jobEnabled = true;
let jobRunning = false;
let lastRunStartedAt = null;
let lastRunCompletedAt = null;
let lastRunStatus = "idle";
let lastRunError = null;
let lastRunServiceCount = 0;

export function startEvaluationJob() {
  jobEnabled = true;
  if (scheduledTask) {
    return scheduledTask;
  }

  scheduledTask = cron.schedule(appConfig.evaluationCron, async () => {
    await triggerEvaluationJobNow("scheduler");
  });

  return scheduledTask;
}

export function stopEvaluationJob() {
  jobEnabled = false;
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

export async function triggerEvaluationJobNow(triggeredBy = "manual") {
  if (jobRunning) {
    return getEvaluationJobStatus();
  }

  const services = listServices();
  lastRunStartedAt = new Date().toISOString();
  lastRunServiceCount = services.length;
  lastRunError = null;
  jobRunning = true;
  lastRunStatus = "running";

  try {
    if (!appConfig.anthropicApiKey) {
      lastRunCompletedAt = new Date().toISOString();
      lastRunStatus = "skipped";
      lastRunError = "Anthropic is not configured.";
      return getEvaluationJobStatus();
    }

    if (services.length > 0) {
      await runScheduledEvaluationForAllServices(services, triggeredBy);
    }
    lastRunCompletedAt = new Date().toISOString();
    lastRunStatus = "success";
  } catch (error) {
    lastRunCompletedAt = new Date().toISOString();
    lastRunStatus = "failed";
    lastRunError = error.message;
    throw error;
  } finally {
    jobRunning = false;
  }

  return getEvaluationJobStatus();
}

export function getEvaluationJobStatus() {
  return {
    enabled: jobEnabled,
    running: jobRunning,
    schedule: appConfig.evaluationCron,
    last_run_started_at: lastRunStartedAt,
    last_run_completed_at: lastRunCompletedAt,
    last_run_status: lastRunStatus,
    last_run_error: lastRunError,
    last_run_service_count: lastRunServiceCount,
  };
}