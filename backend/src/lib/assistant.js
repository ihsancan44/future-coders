import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

let client = null;

export const assistantEnabled = () => Boolean(config.assistant.apiKey);

function getClient() {
  client ??= new Anthropic({ apiKey: config.assistant.apiKey, maxRetries: 2, timeout: 60_000 });
  return client;
}

/**
 * Claude'a sohbeti gönderir ve cevabın metnini döndürür.
 * Güvenlik sınıflandırıcısı reddederse istek aynı çağrıda yedek modelle tekrar denenir ("fallbacks").
 */
export async function askAssistant({ system, messages }) {
  const response = await getClient().beta.messages.create({
    model: config.assistant.model,
    max_tokens: 4000,
    // Sohbet cevabı için düşük efor yeterli; hızlı ve ucuz kalır.
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages,
  });
  if (response.stop_reason === "refusal") return null;
  return response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
