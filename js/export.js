/**
 * BalansCheck — тексеру нәтижелерін CSV және JSON форматында жүктеу.
 */

function getExportPeriods(result) {
    if (result && (result.current || result.previous)) {
        return [
            ["Ағымдағы жыл", result.current],
            ["Өткен жыл", result.previous]
        ].filter(entry => entry[1]);
    }

    return [["Есеп", result]];
}

function getBalanceExportRows(result) {
    const rows = [
        ["Кезең", "Көрсеткіш", "Мән", "Валюта", "Күйі", "Хабарлама"]
    ];

    getExportPeriods(result).forEach(([periodName, period]) => {
        const values = [
            ["Активтер", period.assets],
            ["Міндеттемелер", period.liabilities],
            ["Капитал", period.equity],
            ["Міндеттемелер + Капитал", period.rightSide],
            ["Айырмашылық", period.difference],
            ["Абсолют айырмашылық", period.absoluteDifference],
            ["Рұқсат етілген шек", period.tolerance],
            [
                period.expectedMissing
                    ? `Жетіспейтін мән (${period.expectedMissing.field})`
                    : "Есептелген жетіспейтін мән",
                period.expectedMissing ? period.expectedMissing.value : ""
            ]
        ];

        values.forEach(([label, value]) => {
            rows.push([
                periodName,
                label,
                value === null || value === undefined ? "" : value,
                period.currency || "KZT",
                period.status || "",
                period.message || ""
            ]);
        });
    });

    return rows;
}

function escapeCsvCell(value, delimiter) {
    const text = typeof value === "number"
        ? String(value).replace(".", ",")
        : String(value === null || value === undefined ? "" : value);
    if (
        text.includes(delimiter) ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function buildBalanceCSV(result) {
    const delimiter = ";";
    return "\uFEFF" + getBalanceExportRows(result)
        .map(row => row.map(value => escapeCsvCell(value, delimiter)).join(delimiter))
        .join("\r\n");
}

function downloadBalanceFile(content, mimeType, fileName) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBalanceCSV(result, fileName = "BalansCheck_Report.csv") {
    if (!result || typeof result !== "object") {
        throw new TypeError("Экспорттау үшін тексеру нәтижесі қажет.");
    }

    downloadBalanceFile(
        buildBalanceCSV(result),
        "text/csv;charset=utf-8",
        fileName
    );
}

function exportBalanceJSON(result, fileName = "BalansCheck_Report.json") {
    if (!result || typeof result !== "object") {
        throw new TypeError("Экспорттау үшін тексеру нәтижесі қажет.");
    }

    downloadBalanceFile(
        "\uFEFF" + JSON.stringify(result, null, 2),
        "application/json;charset=utf-8",
        fileName
    );
}

function exportBalanceReport(result) {
    exportBalanceCSV(result);
}
