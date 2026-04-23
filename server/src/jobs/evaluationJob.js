import cron from "node-cron";

import { appConfig } from "../config.js";
import { completePlan, listDueApprovedPlans } from "../repositories/maintenanceRepository.js";
import { getServiceById, listServices } from "../repositories/servicesRepository.js";
import { runEvaluationForService, runScheduledEvaluationForAllServices } from "../services/evaluationService.js";

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

  // Main eval cron — runs all services on the configured interval (default every 30 min)
  scheduledTask = cron.schedule(appConfig.evaluationCron, async () => {
    await triggerEvaluationJobNow("scheduler");
  });

  // Maintenance watcher — checks every minute for due approved plans and evaluates just that service
  cron.schedule("* * * * *", async () => {
    const duePlans = listDueApprovedPlans();
    for (const plan of duePlans) {
      const service = getServiceById(plan.service_id);
      if (!service) {
        completePlan(plan.id);
        continue;
      }
      try {
        await runEvaluationForService(service, "maintenance", plan.eval_mode || "full");
      } catch {
        // eval failed — still complete the plan so it doesn't re-fire next minute
      }
      completePlan(plan.id);
    }
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