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
        error: "GEMINI_API_KEY is missing in Vercel Production"
      });
    }

    const { text, length } = req.body || {};

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
### Summary
Give 4-5 concise sentences.

### Key Points
Give exactly 5 bullet points.

### Improvement Suggestions
Give exactly 2 bullet points.

Keep the complete response under 350 words.
`;
    } else if (length === "long") {
      instruction = `
### Summary
Give 2-3 concise paragraphs.

### Key Points
Give exactly 7 bullet points.

### Improvement Suggestions
Give exactly 3 bullet points.

Keep the complete response under 700 words.
`;
    } else {
      instruction = `
### Summary
Give 1-2 concise paragraphs.

### Key Points
Give exactly 6 bullet points.

### Improvement Suggestions
Give exactly 3 bullet points.

Keep the complete response under 500 words.
`;
    }

    const prompt = `
You are a document summarization assistant.

${instruction}

Rules:
- Use only information from the document.
- Do not invent facts.
- Preserve important names, dates and numbers.
- Finish every section completely.
- Keep the answer concise.

DOCUMENT:
${text}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 1400,
        temperature: 0.3
      }
    });

    const summary = response.text?.trim();

    if (!summary) {
      return res.status(500).json({
        error: "Gemini returned an empty response"
      });
    }

    return res.status(200).json({
      summary
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return res.status(500).json({
      error: error?.message || "Gemini API request failed"
    });
  }
}