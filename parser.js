
/*
  BalansCheck — PDF Parser
  Жауапты: 1-адам

  Міндеттері:
  - PDF оқу
  - Мәтінді шығару
  - KZ / RU / EN қаржылық атауларды тану
  - Сомаларды анықтау
  - PDF бет нөмірін сақтау
*/

const PDFJS_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

const PDF_WORKER_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// Қаржылық көрсеткіштердің атаулары
const FINANCIAL_LABELS = {
  assets: [
    "Жалпы активтер",
    "Активтер барлығы",
    "Итого активы",
    "Всего активов",
    "Total assets"
  ],

  liabilities: [
    "Жалпы міндеттемелер",
    "Міндеттемелер барлығы",
    "Итого обязательства",
    "Всего обязательств",
    "Total liabilities"
  ],

  equity: [
    "Жалпы меншікті капитал",
    "Меншікті капитал барлығы",
    "Итого капитал",
    "Собственный капитал",
    "Total equity",
    "Total shareholders' equity"
  ]
};

// PDF.js кітапханасын тексеру
function getPdfLibrary() {
  const library = globalThis.pdfjsLib;

  if (!library) {
    throw new Error(
      "PDF.js табылмады. HTML файлына PDF.js кітапханасын қосу керек."
    );
  }

  library.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;

  return library;
}

// Сома мәтінін санға айналдыру
function parseAmount(value) {
  if (!value) return null;

  let number = value
    .replace(/\s/g, "")
    .replace(/[₸$€]/g, "")
    .replace(/KZT/gi, "")
    .replace(/[−]/g, "-")
    .replace(/[^\d,.-]/g, "");

  if (!number || !/\d/.test(number)) return null;

  const commaCount = (number.match(/,/g) || []).length;
  const dotCount = (number.match(/\./g) || []).length;

  // 1,234,567 немесе 1.234.567
  if (commaCount > 1 || dotCount > 1) {
    number = number.replace(/[,.]/g, "");
  } else if (commaCount === 1 && dotCount === 0) {
    const parts = number.split(",");

    if (parts[1]?.length === 3) {
      number = number.replace(",", "");
    } else {
      number = number.replace(",", ".");
    }
  } else if (dotCount === 1) {
    const parts = number.split(".");

    if (parts[1]?.length === 3) {
      number = number.replace(".", "");
    }
  }

  const result = Number(number);

  return Number.isFinite(result) ? result : null;
}

// Мәтін ішінен көрсеткішті және соманы табу
function findFinancialValue(text, labels) {
  for (const label of labels) {
    const escaped = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(
      escaped +
      "\\s*[:：=\\-]?\\s*" +
      "((?:KZT\\s*)?[−-]?\\s*\\d[\\d\\s.,]*)",
      "i"
    );

    const match = text.match(regex);

    if (match) {
      const amount = parseAmount(match[1]);

      if (amount !== null) {
        return {
          value: amount,
          label: label
        };
      }
    }
  }

  return null;
}

// PDF ішінен мәтінді бет бойынша оқу
async function extractPdfText(file) {
  if (!file || file.type !== "application/pdf") {
    throw new Error("PDF форматындағы файлды таңдаңыз.");
  }

  const pdfjsLib = getPdfLibrary();

  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer
  }).promise;

  const pages = [];
  let fullText = "";

  for (let pageNumber = 1;
       pageNumber <= pdf.numPages;
       pageNumber++) {

    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str)
      .filter(Boolean)
      .join(" ");

    pages.push({
      page: pageNumber,
      text: pageText
    });

    fullText += `\n--- ${pageNumber}-бет ---\n`;
    fullText += pageText;
  }

  return {
    pageCount: pdf.numPages,
    pages,
    text: fullText
  };
}

// Көрсеткіштің қай бетте тұрғанын анықтау
function findSourcePage(pages, labels) {
  for (const label of labels) {
    for (const page of pages) {
      if (
        page.text.toLowerCase().includes(label.toLowerCase())
      ) {
        return page.page;
      }
    }
  }

  return null;
}

// Негізгі Parser функциясы
async function parseFinancialPdf(file) {
  const extracted = await extractPdfText(file);

  const assets = findFinancialValue(
    extracted.text,
    FINANCIAL_LABELS.assets
  );

  const liabilities = findFinancialValue(
    extracted.text,
    FINANCIAL_LABELS.liabilities
  );

  const equity = findFinancialValue(
    extracted.text,
    FINANCIAL_LABELS.equity
  );

  return {
    fileName: file.name,

    pageCount: extracted.pageCount,

    text: extracted.text,

    fields: {
      assets: {
        value: assets?.value ?? null,
        label: assets?.label ?? null,
        page: findSourcePage(
          extracted.pages,
          FINANCIAL_LABELS.assets
        )
      },

      liabilities: {
        value: liabilities?.value ?? null,
        label: liabilities?.label ?? null,
        page: findSourcePage(
          extracted.pages,
          FINANCIAL_LABELS.liabilities
        )
      },

      equity: {
        value: equity?.value ?? null,
        label: equity?.label ?? null,
        page: findSourcePage(
          extracted.pages,
          FINANCIAL_LABELS.equity
        )
      }
    }
  };
}

// Басқа модульдер пайдалана алатын функциялар
export {
  parseFinancialPdf,
  extractPdfText,
  parseAmount,
  FINANCIAL_LABELS
};
