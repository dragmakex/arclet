import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
export type ModelConfig = { baseUrl: string; apiKey: string; model: string };
export function createConfiguredModel(config: ModelConfig) {
  if (!config.baseUrl.startsWith("https://")) throw new Error("AI_BASE_URL must use HTTPS");
  const provider = createOpenAICompatible({ name: "arclet-model", baseURL: config.baseUrl, apiKey: config.apiKey, supportsStructuredOutputs: true });
  return provider(config.model);
}
