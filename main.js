
/*
  BalansCheck — Frontend Controller
  Бұл файлды 3-адам басқарады.

  Басқа модульдермен келісілген функциялар:
  parser.js:
    extractPDF(file)

  validation.js:
    checkBalance(data)

  scale.js:
    updateScale(result, data)

  export.js:
    exportJSON(data, result)
    exportCSV(data, result)
*/

import { extractPDF } from "./js/parser.js";
import { checkBalance } from "./js/validation.js";
import { updateScale } from "./js/scale.js";
import {
  exportJSON,
  exportCSV
} from "./js/export.js";

// HTML элементтері
const $ = (selector) => document.querySelector(selector);

const elements = {
  drop: $("#drop"),
  file: $("#file"),
  demo: $("#demo"),
  run: $("#run"),
  msg: $("#msg"),
  text: $("#txt"),
  output: $("#out"),
  verdict: $("#verdict"),
  stats: $("#stats"),
  kpi: $("#kpi"),
  checks: $("#chk"),
  extracted: $("#ext"),
  json: $("#bj"),
  csv: $("#bc")
};

let currentData = null;
let currentResult = null;
let selectedFile = null;

// Форматтау
function formatMoney(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("kk-KZ", {
    maximumFractionDigits: 2
  }) + " ₸";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Демо деректері
function getDemoData() {
  return {
    assets: 15000000,
    liabilities: 6000000,
    equity: 9000000,
    page: 3,
    companyName: "Demo Company",
    period: "2025",
    source: "demo"
  };
}

// Деректердің дұрыстығын тексеру
function validateData(data) {
  const required = ["assets", "liabilities", "equity"];

  for (const key of required) {
    if (
      data[key] === null ||
      data[key] === undefined ||
      !Number.isFinite(Number(data[key]))
    ) {
      return false;
    }
  }

  return true;
}

// Нәтижені экранға шығару
function renderResult(data, result) {
  elements.output.hidden = false;

  const status = result.status;

  let title = "";
  let description = "";
  let className = "warn";

  if (status === "BALANCED") {
    title = "Баланс теңгерілген";
    description = "Активтер міндеттемелер мен капитал сомасына тең.";
    className = "ok";
  } else if (status === "ERROR") {
    title = "Баланс сәйкес емес";
    description = "Қаржылық есептілікте арифметикалық айырмашылық анықталды.";
    className = "bad";
  } else {
    title = "Деректер жеткіліксіз";
    description = "Тексеру үшін қажетті қаржылық көрсеткіштердің барлығы табылмады.";
  }

  elements.verdict.innerHTML = `
    <div class="verdict ${className}" role="status">
      <strong>${title}</strong>
      <p>${description}</p>
    </div>
  `;

  const difference = result.difference;

  elements.stats.innerHTML = `
    <div class="st">
      <small>Активтер</small>
      <strong>${formatMoney(data.assets)}</strong>
    </div>

    <div class="st">
      <small>Міндеттемелер</small>
      <strong>${formatMoney(data.liabilities)}</strong>
    </div>

    <div class="st">
      <small>Капитал</small>
      <strong>${formatMoney(data.equity)}</strong>
    </div>

    <div class="st">
      <small>Айырмашылық</small>
      <strong>${formatMoney(difference)}</strong>
    </div>
  `;

  elements.checks.innerHTML = `
    <tr>
      <th>Көрсеткіш</th>
      <th class="n">Мәні</th>
    </tr>
    <tr>
      <td>Активтер</td>
      <td class="n">${formatMoney(data.assets)}</td>
    </tr>
    <tr>
      <td>Міндеттемелер + Капитал</td>
      <td class="n">${formatMoney(data.liabilities + data.equity)}</td>
    </tr>
    <tr>
      <td>Айырмашылық</td>
      <td class="n">${formatMoney(difference)}</td>
    </tr>
    <tr>
      <td>Тексеру нәтижесі</td>
      <td>
        <span class="b ${className}">
          ${status === "BALANCED" ? "Сәйкес" :
            status === "ERROR" ? "Сәйкес емес" : "Дерек жеткіліксіз"}
        </span>
      </td>
    </tr>
  `;

  elements.extracted.innerHTML = `
    <tr>
      <th>Құжат ақпараты</th>
      <th>Мәні</th>
    </tr>
    <tr>
      <td>Компания</td>
      <td>${escapeHTML(data.companyName || "Көрсетілмеген")}</td>
    </tr>
    <tr>
      <td>Есепті кезең</td>
      <td>${escapeHTML(data.period || "Көрсетілмеген")}</td>
    </tr>
    <tr>
      <td>PDF беті</td>
      <td>${escapeHTML(data.page ?? "—")}</td>
    </tr>
  `;

  // Қосымша KPI әзірше бос.
  // Кейін қажетті есептеу көрсеткіштерін қосуға болады.
  elements.kpi.innerHTML = "";

  // Таразыны жаңарту
  updateScale(result, data);
}

// Негізгі талдау функциясы
async function analyzeFile(file) {
  if (!file) {
    elements.msg.textContent = "Алдымен PDF файлын таңдаңыз.";
    return;
  }

  if (file.type !== "application/pdf") {
    elements.msg.textContent = "Тек PDF файлын жүктеуге болады.";
    return;
  }

  selectedFile = file;

  try {
    elements.msg.textContent = "PDF құжаты талданып жатыр...";
    elements.run.disabled = true;

    // 1. PDF-тен деректерді алу
    const data = await extractPDF(file);

    // 2. Деректерді тексеру
    if (!validateData(data)) {
      currentData = data;
      currentResult = {
        status: "INCOMPLETE",
        difference: null
      };

      renderResult(data, currentResult);
      elements.msg.textContent = "Қажетті қаржылық деректер толық табылмады.";
      return;
    }

    // 3. Арифметикалық тексеру
    const result = checkBalance(data);

    currentData = data;
    currentResult = result;

    // 4. Экранға шығару
    renderResult(data, result);

    // PDF-тен алынған мәтін болса көрсету
    if (data.rawText) {
      elements.text.value = data.rawText;
    }

    elements.msg.textContent = "Құжатты талдау аяқталды.";

  } catch (error) {
    console.error("BalansCheck error:", error);

    elements.msg.textContent =
      "Құжатты оқу кезінде қате пайда болды: " + error.message;

  } finally {
    elements.run.disabled = false;
  }
}

// PDF таңдау
elements.drop.addEventListener("click", () => {
  elements.file.click();
});

elements.drop.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.file.click();
  }
});

elements.file.addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (file) {
    analyzeFile(file);
  }
});

// PDF сүйреп әкелу
elements.drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.drop.classList.add("on");
});

elements.drop.addEventListener("dragleave", () => {
  elements.drop.classList.remove("on");
});

elements.drop.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.drop.classList.remove("on");

  const file = event.dataTransfer.files[0];

  if (file) {
    analyzeFile(file);
  }
});

// Демо батырмасы
elements.demo.addEventListener("click", () => {
  const data = getDemoData();
  const result = checkBalance(data);

  currentData = data;
  currentResult = result;

  renderResult(data, result);

  elements.msg.textContent =
    "Демо режимі іске қосылды. Баланс теңгерілген.";

  elements.output.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

// Қайта талдау батырмасы
elements.run.addEventListener("click", () => {
  if (selectedFile) {
    analyzeFile(selectedFile);
  } else {
    elements.msg.textContent =
      "Алдымен PDF файлын жүктеңіз.";
  }
});

// JSON экспорты
elements.json.addEventListener("click", () => {
  if (!currentData || !currentResult) {
    elements.msg.textContent = "Алдымен талдау жүргізіңіз.";
    return;
  }

  exportJSON(currentData, currentResult);
});

// CSV экспорты
elements.csv.addEventListener("click", () => {
  if (!currentData || !currentResult) {
    elements.msg.textContent = "Алдымен талдау жүргізіңіз.";
    return;
  }

  exportCSV(currentData, currentResult);
});

console.log("BalansCheck frontend іске қосылды.");
