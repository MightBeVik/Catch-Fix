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
  get openAiApiKey() {
    return process.env.OPENAI_API_KEY || "";
  },
  get anthropicModel() {
    return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  },
  get openAiModel() {
    return process.env.OPENAI_MODEL || "gpt-4.1-mini";
  },
  get ollamaModel() {
    return process.env.OLLAMA_MODEL || "llama3.2";
  },
  get anthropicEndpoint() {
    return process.env.ANTHROPIC_ENDPOINT || "https://api.anthropic.com/v1/messages";
  },
  get openAiEndpoint() {
    return process.env.OPENAI_ENDPOINT || "https://api.openai.com/v1/chat/completions";
  },
  get ollamaEndpoint() {
    return process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434/api/generate";
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