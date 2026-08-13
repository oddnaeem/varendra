// ============================================================
// STATE
// ============================================================
let QUESTIONS = [];
let answers = {};        // { questionIndex: selectedOptionIndex }
let visited = {};        // { questionIndex: true }  -> for "skipped once" marker
let current = 0;
let overallSecondsLeft = 0;
let perQSecondsLeft = 0;
let overallTimerId = null;
let perQTimerId = null;
let candidateName = "";
let quizStartedAt = null;

const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

// ============================================================
// INIT — load questions from jsonbin
// ============================================================
async function loadQuestions() {
  const subEl = document.getElementById("start-sub");
  const startBtn = document.getElementById("btn-start");
  const errEl = document.getElementById("start-error");

  try {
    const res = await fetch(`${JSONBIN_BASE}/${CONFIG.QUESTIONS_BIN_ID}/latest`, {
      headers: { "X-Access-Key": CONFIG.API_KEY }
    });
    if (!res.ok) throw new Error(`jsonbin responded ${res.status}`);
    const data = await res.json();
    QUESTIONS = Array.isArray(data.record) ? data.record : data.record.questions;

    if (!Array.isArray(QUESTIONS) || QUESTIONS.length === 0) {
      throw new Error("No questions found in bin.");
    }

    subEl.textContent = "Read the rules below, enter your name, and begin when ready.";
    document.getElementById("rule-count").textContent = QUESTIONS.length;
    document.getElementById("rule-time").textContent = `${CONFIG.OVERALL_TIME_MINUTES} min`;
    document.getElementById("rule-perq").textContent = `${CONFIG.PER_QUESTION_SECONDS}s / question`;
    document.getElementById("rule-marking").textContent =
      `+${CONFIG.MARKS_CORRECT} correct, ${CONFIG.MARKS_WRONG} wrong`;
    document.getElementById("rules-box").hidden = false;
    startBtn.disabled = false;
  } catch (err) {
    subEl.textContent = "Could not load the question paper.";
    errEl.textContent = `Error: ${err.message}. Check your config.js bin ID and API key.`;
    errEl.hidden = false;
  }
}

document.getElementById("candidate-name").addEventListener("input", (e) => {
  candidateName = e.target.value.trim();
});

document.getElementById("btn-start").addEventListener("click", () => {
  if (!candidateName) {
    const errEl = document.getElementById("start-error");
    errEl.textContent = "Please enter your name to begin.";
    errEl.hidden = false;
    return;
  }
  startQuiz();
});

// ============================================================
// QUIZ FLOW
// ============================================================
function startQuiz() {
  quizStartedAt = Date.now();
  overallSecondsLeft = CONFIG.OVERALL_TIME_MINUTES * 60;
  showScreen("screen-quiz");
  buildNavigator();
  renderQuestion(0);
  startOverallTimer();

  document.getElementById("btn-next").addEventListener("click", () => goTo(current + 1));
  document.getElementById("btn-prev").addEventListener("click", () => goTo(current - 1));
  document.getElementById("btn-clear").addEventListener("click", clearCurrentAnswer);
  document.getElementById("btn-submit").addEventListener("click", () => submitQuiz(false));
}

function buildNavigator() {
  const nav = document.getElementById("navigator");
  nav.innerHTML = "";
  QUESTIONS.forEach((_, i) => {
    const b = document.createElement("button");
    b.className = "nav-bubble";
    b.textContent = i + 1;
    b.id = `nav-${i}`;
    b.addEventListener("click", () => goTo(i));
    nav.appendChild(b);
  });
}

function renderQuestion(index) {
  current = index;
  visited[index] = true;
  const q = QUESTIONS[index];

  document.getElementById("q-index").textContent = `Q${index + 1} of ${QUESTIONS.length}`;
  document.getElementById("q-text").textContent = q.question;

  const statusEl = document.getElementById("q-status");
  const answered = answers[index] !== undefined;
  statusEl.textContent = answered ? "Answered" : "Not answered";
  statusEl.classList.toggle("done", answered);

  const optionsEl = document.getElementById("omr-options");
  optionsEl.innerHTML = "";
  const letters = ["A", "B", "C", "D", "E", "F"];
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "omr-option" + (answers[index] === i ? " selected" : "");
    btn.innerHTML = `<span class="omr-bubble">${letters[i]}</span><span>${escapeHtml(opt)}</span>`;
    btn.addEventListener("click", () => selectAnswer(index, i));
    optionsEl.appendChild(btn);
  });

  document.getElementById("btn-prev").disabled = index === 0;
  document.getElementById("btn-next").textContent = index === QUESTIONS.length - 1 ? "Finish →" : "Next →";

  updateNavigatorStyles();
  resetPerQuestionTimer();
}

function selectAnswer(qIndex, optIndex) {
  answers[qIndex] = optIndex;
  renderQuestion(qIndex); // re-render to reflect selection + status
}

function clearCurrentAnswer() {
  delete answers[current];
  renderQuestion(current);
}

function goTo(index) {
  if (index < 0 || index >= QUESTIONS.length) {
    if (index >= QUESTIONS.length) submitQuiz(false);
    return;
  }
  renderQuestion(index);
}

function updateNavigatorStyles() {
  QUESTIONS.forEach((_, i) => {
    const el = document.getElementById(`nav-${i}`);
    el.classList.toggle("answered", answers[i] !== undefined);
    el.classList.toggle("current", i === current);
    el.classList.toggle("skipped-once", visited[i] && answers[i] === undefined && i !== current);
  });
}

// ============================================================
// TIMERS
// ============================================================
function startOverallTimer() {
  updateOverallDisplay();
  overallTimerId = setInterval(() => {
    overallSecondsLeft--;
    updateOverallDisplay();
    if (overallSecondsLeft <= 0) {
      clearInterval(overallTimerId);
      submitQuiz(true);
    }
  }, 1000);
}

function updateOverallDisplay() {
  const m = Math.floor(overallSecondsLeft / 60).toString().padStart(2, "0");
  const s = (overallSecondsLeft % 60).toString().padStart(2, "0");
  const el = document.getElementById("time-overall");
  el.textContent = `${m}:${s}`;
  el.classList.toggle("low", overallSecondsLeft <= 60);
}

function resetPerQuestionTimer() {
  clearInterval(perQTimerId);
  perQSecondsLeft = CONFIG.PER_QUESTION_SECONDS;
  updatePerQDisplay();
  perQTimerId = setInterval(() => {
    perQSecondsLeft--;
    updatePerQDisplay();
    if (perQSecondsLeft <= 0) {
      clearInterval(perQTimerId);
      // auto-advance (leaves question unanswered if not already answered)
      if (current < QUESTIONS.length - 1) {
        goTo(current + 1);
      } else {
        submitQuiz(false);
      }
    }
  }, 1000);
}

function updatePerQDisplay() {
  const el = document.getElementById("time-question");
  const ring = document.getElementById("ring-question");
  el.textContent = perQSecondsLeft;
  ring.classList.toggle("low", perQSecondsLeft <= 10);
}

// ============================================================
// SUBMIT & SCORE
// ============================================================
async function submitQuiz(autoSubmitted) {
  clearInterval(overallTimerId);
  clearInterval(perQTimerId);

  let correct = 0, wrong = 0, skipped = 0;
  const reviewData = [];

  QUESTIONS.forEach((q, i) => {
    const given = answers[i];
    if (given === undefined) {
      skipped++;
    } else if (given === q.answer) {
      correct++;
    } else {
      wrong++;
    }
    reviewData.push({
      question: q.question,
      options: q.options,
      given,
      correctIndex: q.answer,
    });
  });

  const score = (correct * CONFIG.MARKS_CORRECT) +
                (wrong * CONFIG.MARKS_WRONG) +
                (skipped * CONFIG.MARKS_SKIPPED);
  const maxScore = QUESTIONS.length * CONFIG.MARKS_CORRECT;

  showScreen("screen-result");
  document.getElementById("result-name").textContent = candidateName || "Candidate";
  document.getElementById("score-number").textContent = score.toFixed(2).replace(/\.00$/, "");
  document.getElementById("score-max").textContent = `/ ${maxScore}`;
  document.getElementById("stat-correct").textContent = correct;
  document.getElementById("stat-wrong").textContent = wrong;
  document.getElementById("stat-skipped").textContent = skipped;

  renderReview(reviewData);

  await saveResult({
    name: candidateName,
    score,
    maxScore,
    correct,
    wrong,
    skipped,
    autoSubmitted,
    startedAt: quizStartedAt,
    submittedAt: Date.now(),
  });
}

function renderReview(reviewData) {
  const el = document.getElementById("review-list");
  el.innerHTML = "";
  const letters = ["A", "B", "C", "D", "E", "F"];
  reviewData.forEach((r, i) => {
    const givenText = r.given === undefined ? "Not answered" : `${letters[r.given]}. ${r.options[r.given]}`;
    const correctText = `${letters[r.correctIndex]}. ${r.options[r.correctIndex]}`;
    const isCorrect = r.given === r.correctIndex;
    const div = document.createElement("div");
    div.className = "review-item";
    div.innerHTML = `
      <div class="rq">Q${i + 1}. ${escapeHtml(r.question)}</div>
      <div class="ra ${isCorrect ? "correct" : (r.given === undefined ? "" : "wrong")}">Your answer: ${escapeHtml(givenText)}</div>
      ${!isCorrect ? `<div class="ra correct-answer">Correct: ${escapeHtml(correctText)}</div>` : ""}
    `;
    el.appendChild(div);
  });
}

// ============================================================
// SAVE RESULT TO JSONBIN
// ============================================================
async function saveResult(record) {
  const statusEl = document.getElementById("save-status");
  statusEl.textContent = "Saving result…";
  statusEl.className = "save-status";

  try {
    // 1. fetch current results array
    const getRes = await fetch(`${JSONBIN_BASE}/${CONFIG.RESULTS_BIN_ID}/latest`, {
      headers: { "X-Access-Key": CONFIG.API_KEY }
    });
    if (!getRes.ok) throw new Error(`GET ${getRes.status}`);
    const getData = await getRes.json();
    const existing = Array.isArray(getData.record) ? getData.record : [];

    // 2. append new record
    const updated = [...existing, record];

    // 3. write back
    const putRes = await fetch(`${JSONBIN_BASE}/${CONFIG.RESULTS_BIN_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": CONFIG.API_KEY
      },
      body: JSON.stringify(updated)
    });
    if (!putRes.ok) throw new Error(`PUT ${putRes.status}`);

    statusEl.textContent = "Result saved.";
    statusEl.className = "save-status ok";
  } catch (err) {
    statusEl.textContent = `Could not save result (${err.message}). Your score above is still valid.`;
    statusEl.className = "save-status err";
  }
}

// ============================================================
// RESTART
// ============================================================
document.getElementById("btn-restart").addEventListener("click", () => {
  answers = {};
  visited = {};
  current = 0;
  candidateName = "";
  document.getElementById("candidate-name").value = "";
  showScreen("screen-start");
});

// ============================================================
// HELPERS
// ============================================================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// kick things off
loadQuestions();
