import { GoogleGenAI } from "@google/genai";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(ai, model, prompt) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 900
        }
      });

      const text = response.text?.trim();

      if (text) {
        return text;
      }

      throw new Error("Empty response from Gemini");
    } catch (error) {
      lastError = error;

      const status =
        error?.status ||
        error?.statusCode ||
        error?.code;

      console.error(
        `Gemini ${model} attempt ${attempt} failed:`,
        status,
        error?.message
      );

      if (status === 503 || status === 429) {
        await sleep(attempt * 2000);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

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

    const { text, length = "medium" } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "No document text provided"
      });
    }

    const ai = new GoogleGenAI({
      apiKey
    });

    let instruction;

    if (length === "short") {
      instruction = `
Give:
### Summary
3-4 sentences.

### Key Points
Exactly 5 bullets.

### Improvement Suggestions
Exactly 2 bullets.
`;
    } else if (length === "long") {
      instruction = `
Give:
### Summary
2 short paragraphs.

### Key Points
Exactly 7 bullets.

### Improvement Suggestions
Exactly 3 bullets.
`;
    } else {
      instruction = `
Give:
### Summary
1 short paragraph.

### Key Points
Exactly 6 bullets.

### Improvement Suggestions
Exactly 3 bullets.
`;
    }

    const prompt = `
You are a document summarization assistant.

${instruction}

Rules:
- Use ONLY information from the document.
- Do not invent facts.
- Keep the answer concise.
- Finish every section.
- Preserve important names, dates and numbers.
- Do not use tables.

DOCUMENT:
${text}
`;

    // Try the latest stable aliases/models in sequence.
    const models = [
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-3.6-flash",
      "gemini-2.5-flash"
    ];

    let finalError = null;

    for (const model of models) {
      try {
        const summary = await generateWithRetry(
          ai,
          model,
          prompt
        );

        return res.status(200).json({
          summary
        });
      } catch (error) {
        finalError = error;

        const status =
          error?.status ||
          error?.statusCode ||
          error?.code;

        // Move to the next model only for temporary availability errors.
        if (status === 503 || status === 429) {
          continue;
        }

        throw error;
      }
    }

    return res.status(503).json({
      error:
        "Gemini is temporarily busy. Please try Generate Summary again in a few seconds."
    });
  } catch (error) {
    console.error("Summary API error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Failed to generate summary."
    });
  }
}