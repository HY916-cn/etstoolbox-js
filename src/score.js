const roundScore = value => Math.round((value + Number.EPSILON) * 100) / 100;

function normalizePercentage(value) {
    const percentage = Number(value);
    if (!Number.isFinite(percentage)) return 100;
    return roundScore(Math.min(100, Math.max(0, percentage)));
}

function normalizeMaxOffset(value) {
    const offset = Number(value);
    if (!Number.isFinite(offset)) return 0;
    return roundScore(Math.min(100, Math.max(0, offset)));
}

function randomizePercentage(percentage, maxOffset, random = Math.random) {
    const basePercentage = normalizePercentage(percentage);
    const normalizedMaxOffset = normalizeMaxOffset(maxOffset);
    if (normalizedMaxOffset === 0) return basePercentage;

    // A valid result always exists because the base percentage is already in range.
    // The attempt limit only protects tests or modified runtimes that supply a broken RNG.
    for (let attempt = 0; attempt < 1000; attempt += 1) {
        const randomValue = Number(random());
        if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue > 1) continue;
        const result = roundScore(basePercentage + (randomValue * 2 - 1) * normalizedMaxOffset);
        if (result >= 0 && result <= 100) return result;
    }
    return basePercentage;
}

function calculateAdjustedScores(questionTotal, percentage, graduation, maxOffset = 0, random = Math.random) {
    const total = Number(questionTotal);
    if (!Number.isFinite(total) || total < 0) return null;

    const effectivePercentage = randomizePercentage(percentage, maxOffset, random);
    const rawQuestionScore = (total * effectivePercentage) / 100;
    const scoreStep = Number(graduation);
    let questionScore = rawQuestionScore;
    if (Number.isFinite(scoreStep) && scoreStep > 0) {
        questionScore = Math.min(total, scoreStep * Math.ceil((rawQuestionScore - Number.EPSILON) / scoreStep));
    }
    return {
        percentage: effectivePercentage,
        questionScore: roundScore(questionScore),
        normalizedScore: roundScore((5 * effectivePercentage) / 100)
    };
}

module.exports = { calculateAdjustedScores, normalizeMaxOffset, normalizePercentage, randomizePercentage };
