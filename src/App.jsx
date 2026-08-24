import { useState } from "react";
import "./App.css";
import { extractTextFromPDF } from "./services/pdfExtractor";
import { extractTextFromImage } from "./services/ocrService";

function createLocalSummary(text, length) {
  const cleanText = text
    .replace(/--- Page \d+ ---/g, "\n")
    .replace(/\r/g, "")
    .trim();

  const lines = cleanText
    .split(/\n|•/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 25);

  const uniqueLines = [...new Set(lines)];

  let summaryCount = 4;
  let keyPointCount = 5;

  if (length === "short") {
    summaryCount = 3;
    keyPointCount = 5;
  } else if (length === "long") {
    summaryCount = 7;
    keyPointCount = 7;
  } else {
    summaryCount = 4;
    keyPointCount = 6;
  }

  const summaryLines = uniqueLines.slice(0, summaryCount);
  const keyPoints = uniqueLines.slice(0, keyPointCount);

  const summary =
    summaryLines.length > 0
      ? summaryLines.join(" ")
      : cleanText.substring(0, 1000);

  return `### Summary

${summary}

### Key Points

${keyPoints
  .map((point) => `• ${point}`)
  .join("\n")}

### Improvement Suggestions

• Organize the document into clearly defined sections.
• Reduce repeated information and keep the most relevant details.
• Add measurable results or supporting details where appropriate.`;
}

async function generateGeminiSummary(text, length) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 7000);

  try {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        length
      }),
      signal: controller.signal
    });

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error("Invalid server response");
    }

    const data = await response.json();

    if (!response.ok || !data.summary) {
      throw new Error(
        data.error || "Gemini summary unavailable"
      );
    }

    return data.summary;
  } finally {
    clearTimeout(timeout);
  }
}

function App() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [summaryLength, setSummaryLength] = useState("medium");

  const handleFile = async (selectedFile) => {
    setError("");
    setExtractedText("");
    setSummary("");
    setOcrProgress(0);

    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg"
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      let text = "";

      if (selectedFile.type === "application/pdf") {
        text = await extractTextFromPDF(selectedFile);
      } else {
        text = await extractTextFromImage(
          selectedFile,
          setOcrProgress
        );
      }

      if (!text) {
        setError("No readable text found in this document.");
      } else {
        setExtractedText(text);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to process the document."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files[0]);
  };

  const generateSummary = async () => {
    if (!extractedText) {
      setError("Please upload a document first.");
      return;
    }

    setError("");
    setSummary("");
    setSummaryLoading(true);

    try {
      let result;

      try {
        result = await generateGeminiSummary(
          extractedText,
          summaryLength
        );
      } catch (geminiError) {
        console.warn(
          "Gemini unavailable. Using local fallback.",
          geminiError
        );

        result = createLocalSummary(
          extractedText,
          summaryLength
        );
      }

      setSummary(result);
    } catch (err) {
      console.error(err);
      setError("Unable to generate a summary.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      setError("Unable to copy summary.");
    }
  };

  const downloadSummary = () => {
    const blob = new Blob([summary], {
      type: "text/plain"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "document-summary.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const clearDocument = () => {
    setFile(null);
    setError("");
    setExtractedText("");
    setSummary("");
    setLoading(false);
    setSummaryLoading(false);
    setOcrProgress(0);
  };

  return (
    <div className="app">
      <div className="container">

        <div className="header">
          <div className="logo">📄</div>

          <h1>Document Summary Assistant</h1>

          <p>
            Upload a PDF or image and generate a smart summary
          </p>
        </div>

        <div
          className="upload-box"
          onDragOver={(event) =>
            event.preventDefault()
          }
          onDrop={handleDrop}
        >
          <div className="upload-icon">📁</div>

          <h2>Upload your document</h2>

          <p>Drag & drop your file here</p>

          <span className="or">or</span>

          <label className="choose-btn">
            Choose File

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) =>
                handleFile(event.target.files[0])
              }
              hidden
            />
          </label>

          <p className="file-types">
            Supported: PDF, PNG, JPG, JPEG · Max 10 MB
          </p>
        </div>

        {error && (
          <div className="error">
            <strong>Error:</strong>
            <p>{error}</p>
          </div>
        )}

        {file && (
          <div className="file-info">
            <div>
              <h3>Selected File</h3>

              <p className="file-name">
                {file.name}
              </p>

              <p>
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>

            <button
              className="clear-btn"
              onClick={clearDocument}
            >
              Clear
            </button>
          </div>
        )}

        {loading && (
          <div className="loading">
            {file?.type === "application/pdf"
              ? "Extracting text from PDF..."
              : `Reading image with OCR... ${ocrProgress}%`}
          </div>
        )}

        {extractedText && (
          <div className="text-result">
            <h3>Extracted Text</h3>

            <pre>{extractedText}</pre>
          </div>
        )}

        {extractedText && !loading && (
          <div className="summary-section">
            <h2>Summary Length</h2>

            <div className="summary-options">

              <button
                className={
                  summaryLength === "short"
                    ? "length-btn active"
                    : "length-btn"
                }
                onClick={() =>
                  setSummaryLength("short")
                }
              >
                Short
              </button>

              <button
                className={
                  summaryLength === "medium"
                    ? "length-btn active"
                    : "length-btn"
                }
                onClick={() =>
                  setSummaryLength("medium")
                }
              >
                Medium
              </button>

              <button
                className={
                  summaryLength === "long"
                    ? "length-btn active"
                    : "length-btn"
                }
                onClick={() =>
                  setSummaryLength("long")
                }
              >
                Long
              </button>

            </div>

            <button
              className="summary-btn"
              onClick={generateSummary}
              disabled={summaryLoading}
            >
              {summaryLoading
                ? "Generating Summary..."
                : "✨ Generate Summary"}
            </button>
          </div>
        )}

        {summaryLoading && (
          <div className="loading">
            AI is analyzing your document...
          </div>
        )}

        {summary && (
          <div className="summary-result">

            <div className="summary-header">
              <h2>Smart Summary</h2>

              <div className="summary-actions">
                <button onClick={copySummary}>
                  Copy
                </button>

                <button onClick={downloadSummary}>
                  Download
                </button>
              </div>
            </div>

            <div className="summary-text">
              {summary}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;