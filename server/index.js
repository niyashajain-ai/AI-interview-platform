const express = require("express");
const cors = require("cors");
const mammoth = require("mammoth");
require("dotenv").config();

const pool = require("./db");
const requireAuth = require("./middleware/auth");
const { reviewAnswer, generateQuestions, reviewResume } = require("./ai");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb"}));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use("/api/auth", require("./routes/auth"));

// ---------- Questions ----------

app.get("/api/questions", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, topic, difficulty, company FROM questions ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get questions" });
  }
});

app.get("/api/questions/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, topic, difficulty, company, link FROM questions WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get question" });
  }
});

app.post("/api/questions", requireAuth, async (req, res) => {
  const title = String(req.body.title || "").trim().slice(0, 300);
  const topic = String(req.body.topic || "").trim().slice(0, 40);
  const difficulty = ["Easy", "Medium", "Hard"].includes(req.body.difficulty)
    ? req.body.difficulty
    : "Medium";
  const answer = String(req.body.answer || "").trim().slice(0, 2000);

  if (!title || !topic) {
    return res.status(400).json({ error: "Please enter a question and a topic" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO questions (title, topic, difficulty, company, correct_answer) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [title, topic, difficulty, "User Submitted", answer]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save the question" });
  }
});

app.post("/api/questions/generate", requireAuth, async (req, res) => {
  const topic = String(req.body.topic || "").trim().slice(0, 40);
  const difficulty = ["Easy", "Medium", "Hard"].includes(req.body.difficulty)
    ? req.body.difficulty
    : "Medium";
  const count = Math.min(Math.max(parseInt(req.body.count) || 3, 1), 5);

  if (!topic) {
    return res.status(400).json({ error: "Please enter a topic" });
  }

  let list;
  try {
    list = await generateQuestions(topic, difficulty, count);
  } catch (aiErr) {
    console.error(aiErr);
    return res.status(503).json({ error: aiErr.message });
  }

  if (list.length === 0) {
    return res
      .status(502)
      .json({ error: "The AI did not give usable questions, please try again" });
  }

  try {
    for (const q of list) {
      await pool.query(
        "INSERT INTO questions (title, topic, difficulty, company, correct_answer) VALUES ($1, $2, $3, $4, $5)",
        [q.title.trim(), topic, difficulty, "AI Generated", q.correct_answer.trim()]
      );
    }
    res.status(201).json({ added: list.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save the questions" });
  }
});

// ---------- Attempts and AI review ----------

app.post("/api/attempts", requireAuth, async (req, res) => {
  const { questionId, answer, sessionId } = req.body;

  if (!questionId || typeof answer !== "string" || !answer.trim()) {
    return res.status(400).json({ error: "Please write an answer first" });
  }
  const cleanAnswer = answer.trim().slice(0, 5000);

  try {
    const q = await pool.query(
      "SELECT title, correct_answer FROM questions WHERE id = $1",
      [questionId]
    );
    if (q.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    let validSessionId = null;
    if (sessionId) {
      const s = await pool.query(
        "SELECT id FROM mock_sessions WHERE id = $1 AND user_id = $2",
        [sessionId, req.userId]
      );
      if (s.rows.length === 0) {
        return res.status(400).json({ error: "Mock session not found" });
      }
      validSessionId = s.rows[0].id;
    }

    const saved = await pool.query(
      "INSERT INTO attempts (user_id, question_id, answer, session_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [req.userId, questionId, cleanAnswer, validSessionId]
    );
    const attemptId = saved.rows[0].id;

    try {
      const review = await reviewAnswer(
        q.rows[0].title,
        q.rows[0].correct_answer,
        cleanAnswer
      );
      const score = Math.max(0, Math.min(10, Math.round(Number(review.score)) || 0));
      review.score = score;
      await pool.query(
        "UPDATE attempts SET score = $1, feedback = $2 WHERE id = $3",
        [score, JSON.stringify(review), attemptId]
      );
      return res.status(201).json({ id: attemptId, review });
    } catch (aiErr) {
      console.error(aiErr);
      return res
        .status(201)
        .json({ id: attemptId, review: null, aiError: aiErr.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save answer" });
  }
});

app.get("/api/history", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.question_id, a.answer, a.score, a.feedback, a.created_at, a.session_id, q.title
       FROM attempts a JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get history" });
  }
});

// ---------- Bookmarks ----------

app.get("/api/bookmarks", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT question_id FROM bookmarks WHERE user_id = $1",
      [req.userId]
    );
    res.json(result.rows.map((row) => row.question_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get bookmarks" });
  }
});

app.post("/api/bookmarks/:questionId", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO bookmarks (user_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.userId, req.params.questionId]
    );
    res.status(201).json({ bookmarked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save bookmark" });
  }
});

app.delete("/api/bookmarks/:questionId", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM bookmarks WHERE user_id = $1 AND question_id = $2",
      [req.userId, req.params.questionId]
    );
    res.json({ bookmarked: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not remove bookmark" });
  }
});

// ---------- Notes ----------

app.get("/api/notes/:questionId", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT content FROM notes WHERE user_id = $1 AND question_id = $2",
      [req.userId, req.params.questionId]
    );
    res.json({ content: result.rows.length ? result.rows[0].content : "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get note" });
  }
});

app.put("/api/notes/:questionId", requireAuth, async (req, res) => {
  const content = (req.body.content || "").trim();
  try {
    if (!content) {
      await pool.query(
        "DELETE FROM notes WHERE user_id = $1 AND question_id = $2",
        [req.userId, req.params.questionId]
      );
      return res.json({ content: "" });
    }
    await pool.query(
      `INSERT INTO notes (user_id, question_id, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, question_id)
       DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
      [req.userId, req.params.questionId, content]
    );
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save note" });
  }
});

// ---------- Dashboard stats ----------

app.get("/api/stats", requireAuth, async (req, res) => {
  try {
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS attempts,
              COUNT(DISTINCT question_id)::int AS questions_practiced,
              ROUND(AVG(score), 1) AS avg_score
       FROM attempts WHERE user_id = $1`,
      [req.userId]
    );

    const byTopic = await pool.query(
      `SELECT q.topic, COUNT(*)::int AS attempts, ROUND(AVG(a.score), 1) AS avg_score
       FROM attempts a JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = $1 AND a.score IS NOT NULL
       GROUP BY q.topic
       ORDER BY avg_score ASC`,
      [req.userId]
    );

    const recent = await pool.query(
      `SELECT a.id, a.question_id, a.score, a.created_at, q.title
       FROM attempts a JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [req.userId]
    );

    const days = await pool.query(
      `SELECT created_at AT TIME ZONE 'UTC' AS attempted_at
       FROM attempts WHERE user_id = $1`,
      [req.userId]
    );

    res.json({
      ...totals.rows[0],
      byTopic: byTopic.rows,
      recent: recent.rows,
      attemptTimes: days.rows.map((r) => r.attempted_at),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get stats" });
  }
});

// ---------- Mock rounds ----------

app.get("/api/mock/companies", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT company, COUNT(*)::int AS total
       FROM questions
       WHERE company IS NOT NULL
         AND company NOT IN ('AI Generated', 'Codeforces', 'User Submitted')
       GROUP BY company
       HAVING COUNT(*) >= 2
       ORDER BY company`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get companies" });
  }
});

app.post("/api/mock/start", requireAuth, async (req, res) => {
  try {
    const questions = await pool.query(
      "SELECT id, title FROM questions WHERE LOWER(topic) = 'hr' ORDER BY RANDOM() LIMIT 5"
    );
    if (questions.rows.length === 0) {
      return res.status(404).json({ error: "No HR questions yet, please add some first" });
    }

    const session = await pool.query(
      "INSERT INTO mock_sessions (user_id, round_type, question_count) VALUES ($1, 'HR', $2) RETURNING id",
      [req.userId, questions.rows.length]
    );

    res.status(201).json({
      sessionId: session.rows[0].id,
      questions: questions.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start the mock round" });
  }
});

app.post("/api/mock/company/start", requireAuth, async (req, res) => {
  const company = String(req.body.company || "").trim();
  if (!company) {
    return res.status(400).json({ error: "Please choose a company" });
  }

  try {
    const questions = await pool.query(
      "SELECT id, title FROM questions WHERE company = $1 ORDER BY RANDOM() LIMIT 5",
      [company]
    );
    if (questions.rows.length === 0) {
      return res.status(404).json({ error: "No questions for this company yet" });
    }

    const session = await pool.query(
      "INSERT INTO mock_sessions (user_id, company, round_type, question_count) VALUES ($1, $2, 'Company', $3) RETURNING id",
      [req.userId, company, questions.rows.length]
    );

    res.status(201).json({
      sessionId: session.rows[0].id,
      company,
      questions: questions.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not start the mock round" });
  }
});

app.post("/api/mock/:sessionId/finish", requireAuth, async (req, res) => {
  try {
    const session = await pool.query(
      "SELECT id FROM mock_sessions WHERE id = $1 AND user_id = $2",
      [req.params.sessionId, req.userId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: "Mock session not found" });
    }

    const results = await pool.query(
      `SELECT q.title, a.score
       FROM attempts a JOIN questions q ON q.id = a.question_id
       WHERE a.session_id = $1 AND a.user_id = $2
       ORDER BY a.id`,
      [req.params.sessionId, req.userId]
    );

    const avg = await pool.query(
      `SELECT ROUND(
          COALESCE(SUM(a.score), 0)::numeric
          / GREATEST(COALESCE(MAX(m.question_count), COUNT(a.score)), 1), 1
        ) AS overall
       FROM mock_sessions m
       LEFT JOIN attempts a ON a.session_id = m.id AND a.user_id = m.user_id
       WHERE m.id = $1 AND m.user_id = $2`,
      [req.params.sessionId, req.userId]
    );
    const overall = avg.rows[0].overall;

    await pool.query("UPDATE mock_sessions SET overall_score = $1 WHERE id = $2", [
      overall,
      req.params.sessionId,
    ]);

    res.json({ overall_score: overall, results: results.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not finish the mock round" });
  }
});

// ---------- Resume review ----------

app.post("/api/resume", requireAuth, async (req, res) => {
  const targetRole = String(req.body.targetRole || "").trim().slice(0, 80);
  let resumeText = String(req.body.resumeText || "").trim().slice(0, 8000);
  const fileType = req.body.fileType;
  const fileData = typeof req.body.fileData === "string" ? req.body.fileData : "";

  if (!targetRole) {
    return res.status(400).json({ error: "Please enter a target role" });
  }

  let pdfBase64 = null;

  if (fileData) {
    const buffer = Buffer.from(fileData, "base64");
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "The file must be smaller than 5 MB" });
    }

    if (fileType === "pdf") {
      if (buffer.subarray(0, 4).toString() !== "%PDF") {
        return res.status(400).json({ error: "This does not look like a real PDF file" });
      }
      pdfBase64 = fileData;
    } else if (fileType === "docx") {
      if (buffer.subarray(0, 2).toString() !== "PK") {
        return res.status(400).json({ error: "This does not look like a real Word file" });
      }
      try {
        const extracted = await mammoth.extractRawText({ buffer });
        resumeText = extracted.value.trim().slice(0, 8000);
      } catch (err) {
        console.error(err);
        return res.status(400).json({ error: "Could not read this Word file" });
      }
    } else {
      return res
        .status(400)
        .json({ error: "Only PDF and Word (.docx) files are supported" });
    }
  }

  if (!pdfBase64 && resumeText.length < 100) {
    return res.status(400).json({
      error: "Please upload your resume or paste at least a few lines of it",
    });
  }

  let review;
  try {
    review = await reviewResume(targetRole, resumeText, pdfBase64);
  } catch (aiErr) {
    console.error(aiErr);
    return res.status(503).json({ error: aiErr.message });
  }

  try {
    await pool.query(
      "INSERT INTO resume_reviews (user_id, target_role, feedback) VALUES ($1, $2, $3)",
      [req.userId, targetRole, JSON.stringify(review)]
    );
  } catch (err) {
    console.error(err);
  }

  res.json({ review });
});

const path = require("path");
const fs = require("fs");

const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));