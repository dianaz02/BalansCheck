/**
 * BalansCheck — қаржылық теңдіктерді тексеру.
 *
 * Негізгі теңдік: Активтер = Міндеттемелер + Капитал.
 */

function getFinancialValue(fields, name) {
    const field = fields && fields[name];
    const value = field && typeof field === "object"
        ? (field.amount !== undefined ? field.amount : field.value)
        : field;

    return typeof value === "number" && Number.isFinite(value)
        ? value
        : null;
}

function validateFinancialBalance(fields, options = {}) {
    const input = fields || {};
    const assets = getFinancialValue(input, "assets");
    const liabilities = getFinancialValue(input, "liabilities");
    const equity = getFinancialValue(input, "equity");
    const values = { assets, liabilities, equity };
    const missingFields = Object.keys(values).filter(
        name => values[name] === null
    );
    const currency = options.currency || input.currency || "KZT";
    const configuredTolerance = options.tolerance;

    if (
        configuredTolerance !== undefined &&
        (typeof configuredTolerance !== "number" ||
            !Number.isFinite(configuredTolerance) ||
            configuredTolerance < 0)
    ) {
        throw new TypeError("tolerance нөлден кем емес ақырлы сан болуы керек.");
    }

    let expectedMissing = null;
    if (missingFields.length === 1) {
        const missing = missingFields[0];
        const formulas = {
            assets: liabilities + equity,
            liabilities: assets - equity,
            equity: assets - liabilities
        };
        const expectedValue = formulas[missing];

        if (Number.isFinite(expectedValue)) {
            expectedMissing = { field: missing, value: expectedValue };
        }
    }

    if (missingFields.length > 0) {
        return {
            status: "insufficient",
            legacyStatus: "insufficient",
            message: "Деректер жеткіліксіз",
            ...values,
            rightSide: null,
            difference: null,
            absoluteDifference: null,
            tolerance: configuredTolerance === undefined
                ? null
                : configuredTolerance,
            missingFields,
            expectedMissing,
            currency
        };
    }

    const rightSide = liabilities + equity;
    const difference = assets - rightSide;

    if (!Number.isFinite(rightSide) || !Number.isFinite(difference)) {
        return {
            status: "insufficient",
            legacyStatus: "insufficient",
            message: "Сандардың қосындысы рұқсат етілген ауқымнан асты",
            ...values,
            rightSide: null,
            difference: null,
            absoluteDifference: null,
            tolerance: configuredTolerance === undefined
                ? null
                : configuredTolerance,
            missingFields: [],
            expectedMissing: null,
            currency
        };
    }

    const tolerance = configuredTolerance === undefined
        ? Math.max(1, Math.abs(assets) * 0.0005)
        : configuredTolerance;
    const isBalanced = Math.abs(difference) <= tolerance;

    return {
        status: isBalanced ? "ok" : "bad",
        legacyStatus: isBalanced ? "balanced" : "discrepancy",
        message: isBalanced
            ? "Баланс сәйкес"
            : "Сәйкессіздік анықталды",
        ...values,
        rightSide,
        difference,
        absoluteDifference: Math.abs(difference),
        tolerance,
        missingFields: [],
        expectedMissing: null,
        currency
    };
}

/**
 * Екі кезеңді бір-бірінен тәуелсіз тексереді.
 * Кіріс пішімі: { current: {assets, liabilities, equity},
 *                  previous: {assets, liabilities, equity} }.
 */
function validateFinancialPeriods(periods, options = {}) {
    const input = periods || {};
    const result = {};

    ["current", "previous"].forEach(period => {
        if (input[period] !== undefined && input[period] !== null) {
            result[period] = validateFinancialBalance(input[period], options);
        }
    });

    return result;
}
