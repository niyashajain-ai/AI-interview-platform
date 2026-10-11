const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const requireAuth = require("./middleware/auth");
const { reviewAnswer } = require("./ai");

const app = express();
app.use(cors());
app.use(express.json());

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
      "SELECT id, title, topic, difficulty, company FROM questions WHERE id = $1",
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

app.post("/api/attempts", requireAuth, async (req, res) => {
  const { questionId, answer } = req.body;

  if (!questionId || !answer || !answer.trim()) {
    return res.status(400).json({ error: "Please write an answer first" });
  }

  try {
    const q = await pool.query(
      "SELECT title, correct_answer FROM questions WHERE id = $1",
      [questionId]
    );
    if (q.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    const saved = await pool.query(
      "INSERT INTO attempts (user_id, question_id, answer) VALUES ($1, $2, $3) RETURNING id",
      [req.userId, questionId, answer.trim()]
    );
    const attemptId = saved.rows[0].id;

    try {
      const review = await reviewAnswer(
        q.rows[0].title,
        q.rows[0].correct_answer,
        answer.trim()
      );
      await pool.query(
        "UPDATE attempts SET score = $1, feedback = $2 WHERE id = $3",
        [Math.round(Number(review.score)), JSON.stringify(review), attemptId]
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));