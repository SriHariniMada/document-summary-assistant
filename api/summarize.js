import { GoogleGenAI } from "@google/genai";

function createFallbackSummary(text, length) {
  const cleanText = text
    .replace(/--- Page \d+ ---/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 30);

  let sentenceCount = 5;

  if (length === "short") {
    sentenceCount = 3;
  } else if (length === "long") {
    sentenceCount = 8;
  }

  const selectedSentences = sentences
    .slice(0, sentenceCount);

  const importantSentences =
    selectedSentences.length > 0
      ? selectedSentences
      : [cleanText.slice(0, 1000)];

  const keyPoints = sentences
    .slice(0, 6)
    .map((sentence) => `- ${sentence}`);

  return `### Summary

${importantSentences.join(" ")}

### Key Points

${keyPoints.length > 0
    ? keyPoints.join("\n")
    : "- The document text was successfully extracted."}

### Improvement Suggestions

- Organize the document into clearly separated sections.
- Add concise headings where appropriate.
- Include measurable details or supporting information where relevant.

*Note: AI summarization was temporarily unavailable, so an automatic text-based summary was generated.*`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { text, length = "medium" } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "No document text provided"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Try Gemini first
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey
        });

        let instruction = "";

        if (length === "short") {
          instruction = `
Create a concise summary in 3-4 sentences.

Then provide:
### Key Points
Exactly 5 bullet points.

### Improvement Suggestions
Exactly 2 bullet points.

Keep the response concise.
`;
        } else if (length === "long") {
          instruction = `
Create a detailed summary in 2 short paragraphs.

Then provide:
### Key Points
Exactly 7 bullet points.

### Improvement Suggestions
Exactly 3 bullet points.

Keep the response concise.
`;
        } else {
          instruction = `
Create a medium-length summary in 1 short paragraph.

Then provide:
### Key Points
Exactly 6 bullet points.

### Improvement Suggestions
Exactly 3 bullet points.

Keep the response concise.
`;
        }

        const prompt = `
You are a professional document summarization assistant.

${instruction}

Rules:
- Use only information present in the document.
- Do not invent facts.
- Preserve important names, dates, numbers and technical terms.
- Finish every section completely.
- Do not use tables.

DOCUMENT:
${text}
`;

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            maxOutputTokens: 1000
          }
        });

        const summary = response.text?.trim();

        if (summary) {
          return res.status(200).json({
            summary,
            source: "gemini"
          });
        }
      } catch (geminiError) {
        console.error(
          "Gemini temporarily unavailable:",
          geminiError?.message
        );
      }
    }

    // Guaranteed fallback
    const fallbackSummary = createFallbackSummary(
      text,
      length
    );

    return res.status(200).json({
      summary: fallbackSummary,
      source: "fallback"
    });
  } catch (error) {
    console.error("Summary API error:", error);

    return res.status(500).json({
      error: "Unable to process the document."
    });
  }
}