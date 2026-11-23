/**
 * BalansCheck — SVG таразының күйі мен анимациясы.
 * SVG элементтері: #beam, #panL, #panR, #piv және #bst.
 */

let scaleIdleFrame = null;
let scaleIdleStartedAt = null;

function getScaleElements() {
    return {
        beam: document.getElementById("beam"),
        panL: document.getElementById("panL"),
        panR: document.getElementById("panR"),
        pivot: document.getElementById("piv"),
        indicator: document.getElementById("bst"),
        status: document.getElementById("scaleStatus"),
        difference: document.getElementById("differenceValue")
    };
}

function getPivotPoint(pivot) {
    if (pivot && pivot.tagName.toLowerCase() === "circle") {
        return {
            x: Number(pivot.getAttribute("cx")) || 170,
            y: Number(pivot.getAttribute("cy")) || 55
        };
    }

    return { x: 170, y: 55 };
}

function setScaleAngle(angle, elements, animate = true) {
    const scale = elements || getScaleElements();
    const center = getPivotPoint(scale.pivot);
    const safeAngle = Number.isFinite(angle)
        ? Math.max(-14, Math.min(14, angle))
        : 0;

    if (scale.beam) {
        scale.beam.style.transition = animate
            ? "transform 550ms ease"
            : "none";
        scale.beam.setAttribute(
            "transform",
            `rotate(${safeAngle} ${center.x} ${center.y})`
        );
    }
}

function stopScaleIdle() {
    if (scaleIdleFrame !== null) {
        cancelAnimationFrame(scaleIdleFrame);
        scaleIdleFrame = null;
    }
    scaleIdleStartedAt = null;
}

function idleScale() {
    const elements = getScaleElements();
    if (!elements.beam) return;

    stopScaleIdle();
    const animate = timestamp => {
        if (scaleIdleStartedAt === null) scaleIdleStartedAt = timestamp;
        const elapsed = timestamp - scaleIdleStartedAt;
        setScaleAngle(Math.sin(elapsed / 850) * 1.8, elements, false);
        scaleIdleFrame = requestAnimationFrame(animate);
    };

    scaleIdleFrame = requestAnimationFrame(animate);
}

function updateScale(result) {
    const elements = getScaleElements();
    const { beam, indicator, status, difference } = elements;

    if (!beam) return;
    stopScaleIdle();

    const state = result && (
        result.status === "ok" || result.status === "BALANCED" ||
        result.status === "balanced"
    )
        ? "ok"
        : result && (
            result.status === "bad" || result.status === "ERROR" ||
            result.status === "discrepancy"
        )
            ? "bad"
            : "insufficient";

    if (indicator) {
        indicator.classList.remove("ok", "bad", "insufficient", "active");
        indicator.classList.add(state);
    }

    if (state === "insufficient") {
        setScaleAngle(0, elements);
        if (status) status.textContent = "Таразыны тексеруге дерек жеткіліксіз";
        if (difference) difference.textContent = "—";
        return;
    }

    const differenceValue = Number(result.difference);
    const absoluteDifference = Number.isFinite(result.absoluteDifference)
        ? result.absoluteDifference
        : Math.abs(differenceValue);

    if (difference) {
        difference.textContent = `${absoluteDifference.toLocaleString("ru-RU")} ${result.currency || "KZT"}`;
    }

    if (state === "ok") {
        setScaleAngle(0, elements);
        if (status) status.textContent = "Баланс тең — таразы тепе-тең";
        return;
    }

    const denominator = Math.max(Math.abs(Number(result.assets)) || 0, 1);
    const angle = Math.max(
        -14,
        Math.min(14, -(differenceValue / denominator) * 300)
    );

    setScaleAngle(angle, elements);
    if (status) status.textContent = "Сәйкессіздік анықталды";
}

function analyzeFinancialData(data, options = {}) {
    const result = validateFinancialBalance(data, options);
    updateScale(result);
    return result;
}
