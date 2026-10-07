require("dotenv").config();

const models = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
];

async function tryModel(model) {
  console.log("Trying:", model);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say hello in one short sentence." }] }],
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    const data = await res.json();
    if (data.error) {
      console.log("  Error:", data.error.message);
      return;
    }
    console.log("  Worked! Reply:", data.candidates[0].content.parts[0].text);
  } catch (err) {
    console.log("  Failed:", err.message);
  }
}

async function run() {
  for (const model of models) {
    await tryModel(model);
  }
}

run();