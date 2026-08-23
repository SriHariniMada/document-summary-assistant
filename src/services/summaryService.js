export const generateSummary = async (text, length) => {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      length
    })
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const errorText = await response.text();
    throw new Error(
      `Server returned ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to generate summary"
    );
  }

  return data.result;
};
