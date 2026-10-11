require("dotenv").config();
const { reviewAnswer } = require("./ai");

reviewAnswer(
  "What is a closure in JavaScript?",
  "A function that remembers variables from the place where it was created.",
  "A closure is when a function remembers the variables around it, even after the outer function has finished."
)
  .then((result) => console.log(result))
  .catch((err) => console.log("Failed:", err.message));