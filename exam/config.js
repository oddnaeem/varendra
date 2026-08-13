// ============================================================
// CONFIG — fill these in before deploying
// ============================================================
const CONFIG = {
  // jsonbin.io bin that holds your questions (a JSON array — see questions.sample.json)
  QUESTIONS_BIN_ID: "PASTE_YOUR_QUESTIONS_BIN_ID_HERE",

  // jsonbin.io bin that will store quiz results (start it as an empty array: [])
  RESULTS_BIN_ID: "PASTE_YOUR_RESULTS_BIN_ID_HERE",

  // jsonbin.io API key. Use an "Access Key" scoped to ONLY these two bins with
  // read+create permission — NOT your Master Key. See README for why.
  API_KEY: "PASTE_YOUR_JSONBIN_ACCESS_KEY_HERE",

  // Quiz rules
  OVERALL_TIME_MINUTES: 30,     // total time for the whole quiz
  PER_QUESTION_SECONDS: 60,     // time allowed per question before auto-skip
  MARKS_CORRECT: 1,             // marks awarded for a correct answer
  MARKS_WRONG: -0.25,           // marks deducted for a wrong answer (negative marking)
  MARKS_SKIPPED: 0,             // marks for a skipped / unanswered question
};
