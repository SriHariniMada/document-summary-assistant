import { useState } from "react";
import "./App.css";
import { extractTextFromPDF } from "./services/pdfExtractor";
import { extractTextFromImage } from "./services/ocrService";
import { generateSummary } from "./services/summaryService";

function App() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const [summary, setSummary] = useState("");
  const [summaryLength, setSummaryLength] = useState("medium");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleFile = async (selectedFile) => {
    setError("");
    setExtractedText("");
    setSummary("");

    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg"
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, PNG, or JPG file.");
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type === "application/pdf") {
      try {
        setLoading(true);

        const text = await extractTextFromPDF(selectedFile);

        if (!text) {
          setError(
            "No readable text found in this PDF. This may be a scanned document."
          );
        } else {
          setExtractedText(text);
        }
      } catch (err) {
        console.error("PDF ERROR:", err);
        setError(err.message || "Failed to extract text from PDF.");
      } finally {
        setLoading(false);
      }
    }

    if (selectedFile.type.startsWith("image/")) {
      try {
        setLoading(true);
        setOcrProgress(0);

        const text = await extractTextFromImage(
          selectedFile,
          setOcrProgress
        );

        if (!text) {
          setError("No readable text found in this image.");
        } else {
          setExtractedText(text);
        }
      } catch (err) {
        console.error("OCR ERROR:", err);
        setError(err.message || "Failed to extract text from image.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleGenerateSummary = async () => {
    if (!extractedText) {
      setError("Please upload a document with readable text first.");
      return;
    }

    try {
      setError("");
      setSummary("");
      setSummaryLoading(true);

      const result = await generateSummary(
        extractedText,
        summaryLength
      );

      setSummary(result);
    } catch (err) {
      console.error("SUMMARY ERROR:", err);
      setError(
        err.message || "Failed to generate summary."
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">

        <h1>Document Summary Assistant</h1>

        <p className="subtitle">
          Upload a PDF or image and generate a smart summary
        </p>

        <div
          className="upload-box"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="upload-icon">📄</div>

          <h2>Upload your document</h2>

          <p>Drag & drop your file here</p>
          <p>or</p>

          <label className="choose-btn">
            Choose File

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) =>
                handleFile(e.target.files[0])
              }
              hidden
            />
          </label>

          <p className="file-types">
            Supported: PDF, PNG, JPG, JPEG
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
            <h3>Selected File</h3>

            <p>
              <strong>Name:</strong> {file.name}
            </p>

            <p>
              <strong>Size:</strong>{" "}
              {(file.size / 1024).toFixed(2)} KB
            </p>
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

        {extractedText && (
          <div className="summary-controls">

            <h3>Summary Length</h3>

            <div className="length-options">

              <button
                className={
                  summaryLength === "short"
                    ? "active"
                    : ""
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
                    ? "active"
                    : ""
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
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSummaryLength("long")
                }
              >
                Long
              </button>

            </div>

            <button
              className="generate-btn"
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
            >
              {summaryLoading
                ? "Generating Summary..."
                : "Generate Summary"}
            </button>

          </div>
        )}

        {summaryLoading && (
          <div className="loading">
            Gemini is analyzing your document...
          </div>
        )}

        {summary && (
          <div className="summary-result">

            <h2>Smart Summary</h2>

            <pre>{summary}</pre>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;