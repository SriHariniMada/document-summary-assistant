import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing"
      });
    }

    const { text, length } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "No document text provided"
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const instructions = {
      short: `
### Summary
Give 4-5 concise sentences.

### Key Points
Give exactly 5 bullet points.

### Improvement Suggestions
Give exactly 2 bullet points.

Keep the complete response below 350 words.
`,
      medium: `
### Summary
Give 1-2 concise paragraphs.

### Key Points
Give exactly 6 bullet points.

### Improvement Suggestions
Give exactly 3 bullet points.

Keep the complete response below 500 words.
`,
      long: `
### Summary
Give 2-3 concise paragraphs.

### Key Points
Give exactly 7 bullet points.

### Improvement Suggestions
Give exactly 3 bullet points.

Keep the complete response below 700 words.
`
    };

    const prompt = `
You are a professional document summarization assistant.

${instructions[length] || instructions.medium}

Rules:
- Use only information present in the document.
- Do not invent facts.
- Preserve important names, dates, numbers and technical terms.
- Finish every section completely.
- Keep the answer concise.

DOCUMENT:
${text}
`;

    const models = [
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash"
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            maxOutputTokens: 1400
          }
        });

        const summary = response.text?.trim();

        if (summary) {
          return res.status(200).json({
            summary,
            model
          });
        }
      } catch (error) {
        lastError = error;

        const status = error?.status || error?.statusCode;

        console.error(`Gemini ${model} failed:`, error);

        // Try the next model for temporary service errors.
        if (status === 503 || status === 429) {
          continue;
        }

        throw error;
      }
    }

    return res.status(503).json({
      error:
        "Gemini is temporarily unavailable. Please try again in a moment.",
      details: lastError?.message || ""
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Failed to generate summary"
    });
  }
}