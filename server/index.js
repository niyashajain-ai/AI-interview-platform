const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const requireAuth = require("./middleware/auth");

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));