import OpenAI from "openai";
import type { LLMAnalysis } from "@stash/shared";
import { truncate } from "@stash/shared";

export async function analyzeContent(
  openai: OpenAI,
  content: string,
  title: string | null,
  url: string,
): Promise<LLMAnalysis> {
  const truncatedContent = truncate(content, 8000);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a bookmark categorization assistant. Analyze the provided content and return a JSON object with:
- "summary": a concise 2-3 sentence summary of the content
- "category": a single category from this list: Technology, Programming, Design, Business, Science, Health, Education, News, Entertainment, Finance, Marketing, Security, DevOps, AI/ML, Data, Mobile, Web, Other
- "tags": an array of 3-7 relevant tags (lowercase, no spaces, use hyphens)

Respond ONLY with valid JSON.`,
      },
      {
        role: "user",
        content: `URL: ${url}\nTitle: ${title ?? "N/A"}\n\nContent:\n${truncatedContent}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("No response from LLM");
  }

  const result = JSON.parse(text) as LLMAnalysis;
  return {
    summary: result.summary ?? "",
    category: result.category ?? "Other",
    tags: Array.isArray(result.tags) ? result.tags : [],
  };
}
