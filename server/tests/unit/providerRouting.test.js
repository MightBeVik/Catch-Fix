import { afterEach, describe, expect, jest, test } from "@jest/globals";

import { testServiceConnection } from "../../src/services/anthropicService.js";

describe("provider routing", () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    global.fetch = undefined;
  });

  test("openai-compatible services send bearer auth only when configured", async () => {
    process.env.OPENAI_PROXY_KEY = "openai-test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"status":"ok"}' } }],
      }),
    });

    const result = await testServiceConnection(
      {
        provider_type: "openai-compatible",
        model_name: "gpt-4.1-mini",
        api_endpoint: "https://example.com/v1/chat/completions",
        api_key_env_var: "OPENAI_PROXY_KEY",
      },
      "Return JSON.",
    );

    expect(result.status).toBe("success");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer openai-test-key",
        }),
      }),
    );
  });

  test("ollama services use the local generate payload shape", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: '{"status":"ok"}',
      }),
    });

    const result = await testServiceConnection(
      {
        provider_type: "ollama",
        model_name: "llama3.2",
        api_endpoint: "http://127.0.0.1:11434/api/generate",
        api_key_env_var: "",
      },
      "Return JSON.",
    );

    expect(result.status).toBe("success");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({
        body: expect.stringContaining('"stream":false'),
      }),
    );
  });
});