import { GoogleGenAI } from "@google/genai";

function fallbackSummary(text, length) {
  const cleanText = text
    .replace(/--- Page \d+ ---/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 25);

  let count = 4;

  if (length === "short") {
    count = 3;
  } else if (length === "long") {
    count = 8;
  }

  const selected = sentences.slice(0, count);

  const points = sentences
    .slice(0, 6)
    .map((s) => `• ${s}`);

  return `### Summary

${
  selected.length
    ? selected.join(" ")
    : cleanText.slice(0, 1000)
}

### Key Points

${
  points.length
    ? points.join("\n")
    : "• The document was successfully processed."
}

### Improvement Suggestions

• Organize the content using clear headings.
• Remove repeated information where possible.
• Add measurable details or supporting evidence where useful.

`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { text, length = "medium" } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({
      error: "No document text provided"
    });
  }

  // Try Gemini first.
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: `
Summarize the following document.

Summary length: ${length}

Provide exactly these sections:

### Summary
A concise summary.

### Key Points
5 to 7 important points.

### Improvement Suggestions
2 to 3 useful suggestions.

Rules:
- Use only information from the document.
- Do not invent facts.
- Preserve important names, dates and numbers.
- Keep the response concise.
- Finish all sections.

DOCUMENT:
${text}
`,
          config: {
            maxOutputTokens: 1000
          }
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Gemini timeout")),
            8000
          )
        )
      ]);

      const summary = response.text?.trim();

      if (summary) {
        return res.status(200).json({
          summary
        });
      }
    }
  } catch (error) {
    console.error(
      "Gemini unavailable, using fallback:",
      error.message
    );
  }

  // Guaranteed summary even when Gemini is unavailable.
  return res.status(200).json({
    summary: fallbackSummary(text, length)
  });
}