import { appConfig } from "../config.js";
import { createHttpError } from "../lib/httpError.js";

function extractText(payload) {
  const content = Array.isArray(payload?.content) ? payload.content : [];
  return content
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

export async function callAnthropic({ prompt, system, model, maxTokens = 400, endpoint }) {
  if (!appConfig.anthropicApiKey) {
    throw createHttpError(503, "ANTHROPIC_API_KEY is not configured on the server.");
  }

  const targetEndpoint = endpoint || appConfig.anthropicEndpoint;
  const requestBody = {
    model: model || appConfig.anthropicModel,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  };

  let lastError = null;
  for (let attempt = 1; attempt <= appConfig.anthropicMaxRetries + 1; attempt += 1) {
    const started = performance.now();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), appConfig.anthropicTimeoutMs);

    try {
      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": appConfig.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const retriable = response.status === 408 || response.status === 429 || response.status >= 500;
        lastError = createHttpError(502, "Anthropic API request failed.", {
          attempts: attempt,
          status: response.status,
          retriable,
          payload,
        });

        if (!retriable || attempt > appConfig.anthropicMaxRetries) {
          throw lastError;
        }

        await delay(attempt * 250);
        continue;
      }

      const latencyMs = Math.round(performance.now() - started);
      return {
        latency_ms: latencyMs,
        text: extractText(payload),
        raw: payload,
        attempts: attempt,
      };
    } catch (error) {
      clearTimeout(timeoutHandle);
      const timedOut = error.name === "AbortError";
      const retriable = timedOut || !error.status;
      lastError = timedOut
        ? createHttpError(504, "Anthropic API request timed out.", { attempts: attempt, timeout_ms: appConfig.anthropicTimeoutMs })
        : error;

      if (!retriable || attempt > appConfig.anthropicMaxRetries) {
        throw lastError;
      }

      await delay(attempt * 250);
    }
  }

  throw lastError || createHttpError(502, "Anthropic API request failed.");
}

export async function testServiceConnection(service, prompt) {
  const result = await callAnthropic({
    prompt,
    system: "Reply very briefly to confirm connectivity.",
    model: service.model_name,
    endpoint: service.api_endpoint,
    maxTokens: 32,
  });

  return {
    success: Boolean(result.text),
    status: result.text ? "success" : "fail",
    latency_ms: result.latency_ms,
    response_preview: result.text.slice(0, 200),
  };
}

export async function draftIncidentSummary({ serviceName, severity, symptoms, timeline, checklist }) {
  const prompt = [
    "Create a concise stakeholder update and likely root causes for this AI service incident.",
    "Do not recommend auto-remediation. Human approval is required before saving.",
    `Service: ${serviceName}`,
    `Severity: ${severity}`,
    `Symptoms: ${symptoms}`,
    `Timeline: ${timeline}`,
    `Checklist: ${JSON.stringify(checklist)}`,
    "Return plain text with two sections: Stakeholder Update and Likely Root Causes.",
  ].join("\n");

  const result = await callAnthropic({
    prompt,
    system: "You are an AI operations incident analyst drafting review-only content.",
    maxTokens: 500,
  });

  return result.text;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function draftRollbackPlan({ serviceName, riskLevel, validationSteps }) {
  const prompt = [
    "Draft a rollback plan for a planned AI service maintenance activity.",
    `Service: ${serviceName}`,
    `Risk level: ${riskLevel}`,
    `Validation steps: ${validationSteps}`,
    "Return a concise rollback plan in plain text.",
  ].join("\n");

  const result = await callAnthropic({
    prompt,
    system: "You are drafting a rollback plan for human review only.",
    maxTokens: 300,
  });

  return result.text;
}