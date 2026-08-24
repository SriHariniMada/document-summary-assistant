import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        step: "environment",
        error: "GEMINI_API_KEY is missing in Vercel"
      });
    }

    const ai = new GoogleGenAI({
      apiKey
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Reply with exactly: Gemini API is working."
    });

    return res.status(200).json({
      success: true,
      step: "gemini",
      response: response.text
    });
  } catch (error) {
    console.error("Gemini test error:", error);

    return res.status(500).json({
      success: false,
      step: "gemini",
      error: error?.message || "Gemini request failed"
    });
  }
}