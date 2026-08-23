import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => item.str)
        .join(" ");

      fullText += `\n\n--- Page ${pageNumber} ---\n\n`;
      fullText += pageText;
    }

    return fullText.trim();
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw error;
  }
};