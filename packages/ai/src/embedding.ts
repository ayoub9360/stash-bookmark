import OpenAI from "openai";
import { truncate } from "@stash/shared";

export async function generateEmbedding(
  openai: OpenAI,
  text: string,
): Promise<number[]> {
  const truncatedText = truncate(text, 8000);

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: truncatedText,
  });

  return response.data[0]!.embedding;
}
