require("dotenv").config();
const pool = require("./db");

const TOPICS = {
  greedy: "Greedy",
  math: "Math",
  strings: "Strings",
  sortings: "Sorting",
  "binary search": "Binary Search",
  dp: "Dynamic Programming",
  graphs: "Graphs",
  "two pointers": "Two Pointers",
};

const LEVELS = {
  Easy: [800, 1000],
  Medium: [1200, 1500],
  Hard: [1700, 2000],
};

const PER_GROUP = 1;

async function run() {
  const res = await fetch("https://codeforces.com/api/problemset.problems", {
    signal: AbortSignal.timeout(60000),
  });
  const data = await res.json();
  if (data.status !== "OK") throw new Error(data.comment || "Codeforces error");

  const solved = new Map();
  data.result.problemStatistics.forEach((s) => {
    solved.set(`${s.contestId}-${s.index}`, s.solvedCount);
  });

  const used = new Set();
  let added = 0;

  for (const [tag, label] of Object.entries(TOPICS)) {
    for (const [level, [min, max]] of Object.entries(LEVELS)) {
      const picks = data.result.problems
        .filter(
          (p) =>
            p.rating >= min &&
            p.rating <= max &&
            p.tags.includes(tag) &&
            !used.has(`${p.contestId}-${p.index}`)
        )
        .sort(
          (a, b) =>
            (solved.get(`${b.contestId}-${b.index}`) || 0) -
            (solved.get(`${a.contestId}-${a.index}`) || 0)
        )
        .slice(0, PER_GROUP);

      for (const p of picks) {
        used.add(`${p.contestId}-${p.index}`);
        const link = `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
        const result = await pool.query(
          `INSERT INTO questions (title, topic, difficulty, company, correct_answer, link)
           SELECT $1::text, 'DSA', $2::text, 'Codeforces', '', $3::text
           WHERE NOT EXISTS (SELECT 1 FROM questions WHERE link = $3::text)`,
          [`${p.name} (${label})`, level, link]
        );
        added += result.rowCount;
      }
    }
  }

  console.log(`Done! Added ${added} questions.`);
  await pool.end();
}

run().catch((err) => {
  console.log("Failed:", err.message);
  process.exit(1);
});