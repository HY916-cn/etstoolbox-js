const roundScore = value => Math.round((value + Number.EPSILON) * 100) / 100;

function normalizePercentage(value) {
    const percentage = Number(value);
    if (!Number.isFinite(percentage)) return 100;
    return roundScore(Math.min(100, Math.max(0, percentage)));
}

function calculateAdjustedScores(questionTotal, percentage, graduation) {
    const total = Number(questionTotal);
    if (!Number.isFinite(total) || total < 0) return null;

    const normalizedPercentage = normalizePercentage(percentage);
    const rawQuestionScore = (total * normalizedPercentage) / 100;
    const scoreStep = Number(graduation);
    let questionScore = rawQuestionScore;
    if (Number.isFinite(scoreStep) && scoreStep > 0) {
        questionScore = Math.min(total, scoreStep * Math.ceil((rawQuestionScore - Number.EPSILON) / scoreStep));
    }
    return {
        percentage: normalizedPercentage,
        questionScore: roundScore(questionScore),
        normalizedScore: roundScore((5 * normalizedPercentage) / 100)
    };
}

module.exports = { calculateAdjustedScores, normalizePercentage };
