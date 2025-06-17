import { countTokens } from "gpt-tokenizer/model/gpt-4o"

import type { Message } from "~/services/copilot/create-chat-completions"

import { isNullish } from "./is-nullish"

export const getTokenCount = (messages: Array<Message>) => {
  const sanitized = messages.map((message) => ({
    ...message,
    content:
      isNullish((message as { content?: unknown }).content) ? "" : (
        message.content
      ),
  }))

  const input = sanitized.filter(
    (m) => m.role !== "assistant" && typeof m.content === "string",
  )
  const output = sanitized.filter((m) => m.role === "assistant")

  const inputTokens = countTokens(input)
  const outputTokens = countTokens(output)

  return {
    input: inputTokens,
    output: outputTokens,
  }
}
