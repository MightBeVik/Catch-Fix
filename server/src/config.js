import dotenv from "dotenv";

dotenv.config();

export const appConfig = {
  get port() {
    return Number(process.env.PORT || 3001);
  },
  get databasePath() {
    return process.env.DATABASE_PATH || "./data/catch_fix.db";
  },
  get anthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY || "";
  },
  get anthropicModel() {
    return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  },
  get anthropicEndpoint() {
    return process.env.ANTHROPIC_ENDPOINT || "https://api.anthropic.com/v1/messages";
  },
  get anthropicTimeoutMs() {
    return Number(process.env.ANTHROPIC_TIMEOUT_MS || 15000);
  },
  get anthropicMaxRetries() {
    return Number(process.env.ANTHROPIC_MAX_RETRIES || 2);
  },
  get evaluationCron() {
    return process.env.EVALUATION_CRON || "*/30 * * * *";
  },
  get driftThreshold() {
    return Number(process.env.DRIFT_THRESHOLD || 70);
  },
};