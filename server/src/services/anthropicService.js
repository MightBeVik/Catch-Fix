/**
 * LLM provider service.
 *
 * Supports three provider types:
 *   - anthropic          → Anthropic Messages API
 *   - openai-compatible  → OpenAI / LM Studio / any chat-completions endpoint
 *   - ollama             → Local Ollama REST generation endpoint
 *
 * All outbound calls go through callLLMProvider().
 * No provider-specific assumptions are made outside of buildProviderRequest().
 */

import { appConfig } from "../config.js";
import { createHttpError } from "../lib/httpError.js";

const supportedProviders = [
  {
    id: "anthropic",
    name: "Anthropic Claude",
    category: "cloud",
    interface: "anthropic-rest",
    default_model: appConfig.anthropicModel,
    default_endpoint: appConfig.anthropicEndpoint,
    default_api_key_env_var: "ANTHROPIC_API_KEY",
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "cloud",
    interface: "openai-chat-completions",
    default_model: appConfig.openAiModel,
    default_endpoint: "https://api.openai.com/v1/chat/completions",
    default_api_key_env_var: "OPENAI_API_KEY",
  },
  {
    id: "openai-compatible",
    name: "LM Studio / OpenAI-Compatible",
    category: "local",
    interface: "openai-chat-completions",
    default_model: appConfig.openAiModel,
    default_endpoint: "http://127.0.0.1:1234/v1/chat/completions",
    default_api_key_env_var: "",
  },
  {
    id: "ollama",
    name: "Ollama",
    category: "local",
    interface: "ollama-generate",
    default_model: appConfig.ollamaModel,
    default_endpoint: appConfig.ollamaEndpoint,
    default_api_key_env_var: "",
  },
];

// ── text extractors ───────────────────────────────────────────────────────────

function extractAnthropicText(payload) {
  const content = Array.isArray(payload?.content) ? payload.content : [];
  return content
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function extractOpenAiCompatibleText(payload) {
  const choice = Array.isArray(payload?.choices) ? payload.choices[0] : null;
  const content = choice?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((item) => item?.type === "text")
      .map((item) => item.text)
      .join("\n")
      .trim();
  }
  return "";
}

function extractOllamaText(payload) {
  return String(payload?.response || "").trim();
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getProviderPreset(providerType) {
  return supportedProviders.find((p) => p.id === providerType) || supportedProviders[0];
}

function normalizeServiceConfig(service = {}) {
  const provider = getProviderPreset(service.provider_type || "anthropic");
  return {
    ...service,
    provider_type: provider.id,
    model_name: service.model_name || provider.default_model,
    api_endpoint: service.api_endpoint || provider.default_endpoint,
    api_key_env_var: service.api_key_env_var ?? "",
  };
}

function resolveApiKey(service) {
  const normalized = normalizeServiceConfig(service);
  if (!normalized.api_key_env_var) return "";
  return process.env[normalized.api_key_env_var] || "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── provider request builder ──────────────────────────────────────────────────

/**
 * Builds the fetch spec (headers, body, extractText fn) for each provider.
 * Throws 503 if a required API key is missing from the server environment.
 */
function buildProviderRequest({ provider, service, prompt, system, maxTokens }) {
  if (provider === "anthropic") {
    const apiKey = resolveApiKey({ ...service, api_key_env_var: service.api_key_env_var || "ANTHROPIC_API_KEY" });
    if (!apiKey) {
      throw createHttpError(
        503,
        `Anthropic API key not found. Set ${service.api_key_env_var || "ANTHROPIC_API_KEY"} in server/.env.`,
      );
    }
    return {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: service.model_name,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      },
      extractText: extractAnthropicText,
    };
  }

  if (provider === "openai") {
    const envVar = service.api_key_env_var || "OPENAI_API_KEY";
    const apiKey = resolveApiKey({ ...service, api_key_env_var: envVar });
    if (!apiKey) {
      throw createHttpError(503, `OpenAI API key not found. Set ${envVar} in server/.env.`);
    }
    return {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: service.model_name,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
      },
      extractText: extractOpenAiCompatibleText,
    };
  }

  if (provider === "openai-compatible") {
    const headers = { "Content-Type": "application/json" };
    // Only attach Authorization if an env var name was specified AND the key exists
    if (service.api_key_env_var) {
      const apiKey = resolveApiKey(service);
      if (!apiKey) {
        throw createHttpError(
          503,
          `API key env var "${service.api_key_env_var}" is not set in server/.env. ` +
          `Clear the field in the registry if this is a local/unauthenticated endpoint (LM Studio, etc.).`,
        );
      }
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return {
      headers,
      body: {
        model: service.model_name,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
      },
      extractText: extractOpenAiCompatibleText,
    };
  }

  if (provider === "ollama") {
    // Ollama /api/generate does not use an API key
    return {
      headers: { "Content-Type": "application/json" },
      body: {
        model: service.model_name,
        prompt,
        system: system || "",
        stream: false,
      },
      extractText: extractOllamaText,
    };
  }

  throw createHttpError(400, `Unsupported provider type: "${provider}". Valid options: anthropic, openai, openai-compatible, ollama.`);
}

// ── core LLM caller ───────────────────────────────────────────────────────────

/**
 * Sends a prompt to whichever provider is configured on the service.
 * Handles retries and timeouts for all providers.
 */
export async function callLLMProvider({ service, prompt, system, model, maxTokens = 400, endpoint }) {
  const normalized = normalizeServiceConfig({
    ...service,
    model_name: model || service?.model_name,
    api_endpoint: endpoint || service?.api_endpoint,
  });
  const provider = normalized.provider_type;
  const providerName = getProviderPreset(provider).name;

  if (!supportedProviders.some((p) => p.id === provider)) {
    throw createHttpError(400, `Unsupported provider type: "${provider}".`);
  }

  const targetEndpoint = normalized.api_endpoint;
  const requestSpec = buildProviderRequest({ provider, service: normalized, prompt, system, maxTokens });

  let lastError = null;
  for (let attempt = 1; attempt <= appConfig.anthropicMaxRetries + 1; attempt += 1) {
    const started = performance.now();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), appConfig.anthropicTimeoutMs);

    try {
      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers: requestSpec.headers,
        body: JSON.stringify(requestSpec.body),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const retriable = response.status === 408 || response.status === 429 || response.status >= 500;
        // Extract a readable error message from the provider's response body
        const providerError =
          payload?.error?.message ||
          payload?.error ||
          payload?.message ||
          payload?.detail ||
          `HTTP ${response.status}`;
        lastError = createHttpError(
          502,
          `${providerName} request failed: ${providerError}`,
          { provider, attempts: attempt, status: response.status, retriable, payload },
        );

        if (!retriable || attempt > appConfig.anthropicMaxRetries) throw lastError;
        await delay(attempt * 250);
        continue;
      }

      const latencyMs = Math.round(performance.now() - started);
      return {
        latency_ms: latencyMs,
        text: requestSpec.extractText(payload),
        raw: payload,
        attempts: attempt,
        provider,
      };
    } catch (error) {
      clearTimeout(timeoutHandle);
      const timedOut = error.name === "AbortError";
      const retriable = timedOut || !error.status;

      lastError = timedOut
        ? createHttpError(504, `${providerName} request timed out after ${appConfig.anthropicTimeoutMs} ms.`, {
          provider,
          attempts: attempt,
          timeout_ms: appConfig.anthropicTimeoutMs,
        })
        : error;

      if (!retriable || attempt > appConfig.anthropicMaxRetries) throw lastError;
      await delay(attempt * 250);
    }
  }

  throw lastError || createHttpError(502, "LLM provider request failed.");
}

/**
 * @deprecated Use callLLMProvider instead.
 * Kept as an alias so existing callers (draftIncidentSummary, draftRollbackPlan) continue to work.
 */
export const callAnthropic = callLLMProvider;

// ── connection status helpers ─────────────────────────────────────────────────

export function getServiceConnectionStatus(service) {
  const normalized = normalizeServiceConfig(service);

  if (normalized.provider_type === "anthropic") {
    const envVarName = normalized.api_key_env_var || "ANTHROPIC_API_KEY";
    const configured = Boolean(process.env[envVarName]);
    return {
      provider_type: normalized.provider_type,
      provider_name: getProviderPreset(normalized.provider_type).name,
      connection_ready: configured,
      connection_message: configured
        ? `Using ${envVarName} for Anthropic authentication.`
        : `Set ${envVarName} in server/.env to enable Anthropic requests.`,
    };
  }

  if (normalized.provider_type === "openai") {
    const envVarName = normalized.api_key_env_var || "OPENAI_API_KEY";
    const configured = Boolean(process.env[envVarName]);
    return {
      provider_type: normalized.provider_type,
      provider_name: getProviderPreset(normalized.provider_type).name,
      connection_ready: configured,
      connection_message: configured
        ? `Using ${envVarName} for OpenAI authentication.`
        : `Set ${envVarName} in server/.env to enable OpenAI requests.`,
    };
  }

  if (normalized.provider_type === "openai-compatible") {
    if (normalized.api_key_env_var) {
      const configured = Boolean(process.env[normalized.api_key_env_var]);
      return {
        provider_type: normalized.provider_type,
        provider_name: getProviderPreset(normalized.provider_type).name,
        connection_ready: configured,
        connection_message: configured
          ? `Using ${normalized.api_key_env_var} for authentication.`
          : `Set ${normalized.api_key_env_var} in server/.env, or clear the field for an unauthenticated local endpoint (LM Studio, etc.).`,
      };
    }
    return {
      provider_type: normalized.provider_type,
      provider_name: getProviderPreset(normalized.provider_type).name,
      connection_ready: true,
      connection_message: "No API key configured — suitable for LM Studio or any local OpenAI-compatible endpoint.",
    };
  }

  // ollama
  return {
    provider_type: normalized.provider_type,
    provider_name: getProviderPreset(normalized.provider_type).name,
    connection_ready: true,
    connection_message: `Ollama endpoint: ${normalized.api_endpoint}. No API key required.`,
  };
}

export function decorateServiceConnectionStatus(service) {
  return {
    ...normalizeServiceConfig(service),
    ...getServiceConnectionStatus(service),
  };
}

export function getRuntimeProviderStatus() {
  return {
    supported_providers: supportedProviders,
    secrets: {
      ANTHROPIC_API_KEY: Boolean(appConfig.anthropicApiKey),
      OPENAI_API_KEY: Boolean(appConfig.openAiApiKey),
    },
    defaults: {
      anthropic_endpoint: appConfig.anthropicEndpoint,
      openai_compatible_endpoint: appConfig.openAiEndpoint,
      ollama_endpoint: appConfig.ollamaEndpoint,
    },
  };
}

// ── test connection ───────────────────────────────────────────────────────────

/**
 * Tests connectivity to the configured provider.
 * Always returns a structured result — never throws.
 */
export async function testServiceConnection(service, prompt) {
  const normalized = normalizeServiceConfig(service);
  const providerName = getProviderPreset(normalized.provider_type).name;
  const testedAt = new Date().toISOString();

  try {
    const result = await callLLMProvider({
      service,
      prompt,
      system: "Reply very briefly to confirm connectivity.",
      maxTokens: 32,
    });

    // ── Treat an empty/null response as a failure ────────────────────────────
    // Some endpoints (e.g. LM Studio) return HTTP 200 with no text when the
    // requested model does not exist or is not loaded. Surfacing this as a
    // failure makes misconfigured model names visible to the user.
    if (!result.text || result.text.trim() === "") {
      return {
        success: false,
        status: "error",
        latency_ms: result.latency_ms,
        response_preview: "",
        detail:
          `${providerName} responded in ${result.latency_ms} ms but returned no text. ` +
          `The model "${normalized.model_name}" may not exist, is not loaded, or is not supported by this endpoint.`,
        provider: normalized.provider_type,
        tested_at: testedAt,
        prompt,
      };
    }

    return {
      success: true,
      status: "online",
      latency_ms: result.latency_ms,
      response_preview: result.text.slice(0, 200),
      detail: `${providerName} (${normalized.model_name}) responded in ${result.latency_ms} ms.`,
      provider: normalized.provider_type,
      tested_at: testedAt,
      prompt,
    };
  } catch (error) {
    return {
      success: false,
      status: "error",
      latency_ms: null,
      response_preview: "",
      detail: error?.message || "Connection test failed.",
      provider: normalized.provider_type,
      tested_at: testedAt,
      prompt,
    };
  }
}

// ── LLM-assisted drafting (human-review only) ─────────────────────────────────

export async function draftIncidentSummary({ service, serviceName, severity, symptoms, timeline, checklist }) {
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

  // Fall back to default Anthropic config when no specific service is provided
  const effectiveService = service || {
    provider_type: "anthropic",
    model_name: appConfig.anthropicModel,
    api_endpoint: appConfig.anthropicEndpoint,
    api_key_env_var: "ANTHROPIC_API_KEY",
  };

  const result = await callLLMProvider({
    service: effectiveService,
    prompt,
    system: "You are an AI operations incident analyst drafting review-only content.",
    maxTokens: 500,
  });

  return result.text;
}

export async function draftRollbackPlan({ service, serviceName, riskLevel, validationSteps }) {
  const prompt = [
    "Draft a rollback plan for a planned AI service maintenance activity.",
    `Service: ${serviceName}`,
    `Risk level: ${riskLevel}`,
    `Validation steps: ${validationSteps}`,
    "Return a concise rollback plan in plain text.",
  ].join("\n");

  const effectiveService = service || {
    provider_type: "anthropic",
    model_name: appConfig.anthropicModel,
    api_endpoint: appConfig.anthropicEndpoint,
    api_key_env_var: "ANTHROPIC_API_KEY",
  };

  const result = await callLLMProvider({
    service: effectiveService,
    prompt,
    system: "You are drafting a rollback plan for human review only.",
    maxTokens: 300,
  });

  return result.text;
}