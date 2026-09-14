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

function nextRandom(random = Math.random) {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
        const value = Number(random());
        if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
    }
    return 0.5;
}

function randomScoreBetween(minimum, maximum, random = Math.random) {
    return roundScore(minimum + nextRandom(random) * (maximum - minimum));
}

function calculateWordScore(percentage, maxOffset = 0, random = Math.random) {
    const greenProbability = randomizePercentage(percentage, maxOffset, random);
    const greenRoll = nextRandom(random) * 100;
    if (greenProbability >= 100 || (greenProbability > 0 && greenRoll < greenProbability)) {
        return {
            greenProbability,
            band: 'green',
            score: randomScoreBetween(80, 100, random)
        };
    }

    const band = nextRandom(random) < 0.5 ? 'orange' : 'red';
    return {
        greenProbability,
        band,
        score: band === 'orange' ? randomScoreBetween(60, 79.99, random) : randomScoreBetween(0, 59.99, random)
    };
}

function randomizeDistinctPercentages(percentage, maxOffset, count, random = Math.random) {
    const basePercentage = normalizePercentage(percentage);
    const normalizedMaxOffset = normalizeMaxOffset(maxOffset);
    const requestedCount = Math.max(0, Math.floor(Number(count) || 0));
    if (requestedCount === 0) return [];
    if (normalizedMaxOffset === 0) return Array(requestedCount).fill(basePercentage);

    const results = [];
    const used = new Set();
    for (let index = 0; index < requestedCount; index += 1) {
        let result;
        for (let attempt = 0; attempt < 1000; attempt += 1) {
            const candidate = randomizePercentage(basePercentage, normalizedMaxOffset, random);
            if (!used.has(candidate)) {
                result = candidate;
                break;
            }
        }

        // The UI accepts two decimal places. If a deterministic or low-quality RNG
        // repeats itself, select the first unused legal hundredth as a stable fallback.
        if (result === undefined) {
            const minimum = Math.max(0, basePercentage - normalizedMaxOffset);
            const maximum = Math.min(100, basePercentage + normalizedMaxOffset);
            const firstCent = Math.ceil((minimum - Number.EPSILON) * 100);
            const lastCent = Math.floor((maximum + Number.EPSILON) * 100);
            for (let cent = firstCent; cent <= lastCent; cent += 1) {
                const candidate = cent / 100;
                if (!used.has(candidate)) {
                    result = candidate;
                    break;
                }
            }
        }

        // A zero/tiny range may contain fewer distinct hundredths than requested.
        if (result === undefined) result = randomizePercentage(basePercentage, normalizedMaxOffset, random);
        results.push(result);
        used.add(result);
    }
    return results;
}

function calculateReadingDimensions(percentage, maxOffset = 0, random = Math.random) {
    const basePercentage = normalizePercentage(percentage);
    const normalizedMaxOffset = normalizeMaxOffset(maxOffset);
    const minimumInteger = Math.ceil(Math.max(0, basePercentage - normalizedMaxOffset));
    const maximumInteger = Math.floor(Math.min(100, basePercentage + normalizedMaxOffset));
    const integerCandidates = [];
    for (let candidate = minimumInteger; candidate <= maximumInteger; candidate += 1) integerCandidates.push(candidate);

    let values;
    if (integerCandidates.length >= 3) {
        values = [];
        for (let index = 0; index < 3; index += 1) {
            const randomValue = Number(random());
            const normalizedRandom = Number.isFinite(randomValue) ? Math.min(1, Math.max(0, randomValue)) : 0.5;
            const candidateIndex = Math.min(integerCandidates.length - 1, Math.floor(normalizedRandom * integerCandidates.length));
            values.push(integerCandidates.splice(candidateIndex, 1)[0]);
        }
    } else {
        values = randomizeDistinctPercentages(basePercentage, normalizedMaxOffset, 3, random);
    }
    const [accuracy, fluency, integrity] = values;
    return { accuracy, fluency, integrity };
}

function applyReadingDimensions(detail, percentage, maxOffset = 0, random = Math.random) {
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null;
    const dimensions = calculateReadingDimensions(percentage, maxOffset, random);
    detail.accuracy_score = roundScore(dimensions.accuracy / 20);
    detail.fluency_score = roundScore(dimensions.fluency / 20);
    detail.integrity_score = roundScore(dimensions.integrity / 20);
    detail.dimension_result = [dimensions.accuracy, dimensions.fluency, dimensions.integrity];
    return dimensions;
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

module.exports = {
    applyReadingDimensions,
    calculateAdjustedScores,
    calculateReadingDimensions,
    calculateWordScore,
    normalizeMaxOffset,
    normalizePercentage,
    randomizeDistinctPercentages,
    randomizePercentage
};
