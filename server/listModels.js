require("dotenv").config();

async function listModels() {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(20000),
    }
  );

  const data = await res.json();
  if (data.error) {
    console.log(data.error);
    return;
  }

  data.models
    .filter((m) => m.supportedGenerationMethods.includes("generateContent"))
    .forEach((m) => console.log(m.name));
}

listModels().catch((err) =>
  console.log("Failed:", err.message, err.cause ? err.cause.code : "")
);