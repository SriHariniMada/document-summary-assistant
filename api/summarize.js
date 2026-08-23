import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing",
      });
    }

    const { text, length } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "No document text was provided.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    let instruction;

    if (length === "short") {
      instruction = `
Create a short and clear summary of the document.
Use 4-6 bullet points.
Include only the most important information.
`;
    } else if (length === "long") {
      instruction = `
Create a detailed summary of the document.
Organize it using clear headings and bullet points.
Include important facts, key ideas, findings, and conclusions.
`;
    } else {
      instruction = `
Create a medium-length summary of the document.
Use clear headings and bullet points.
Include the important ideas without unnecessary details.
`;
    }

    const prompt = `
You are a document summarization assistant.

${instruction}

Do not invent information.
Use only information present in the provided document.

DOCUMENT:
${text}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const summary = response.text;

    return res.status(200).json({
      summary,
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Failed to generate summary.",
    });
  }
}