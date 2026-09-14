const test = require('node:test');
const assert = require('node:assert/strict');
const {
    applyReadingDimensions,
    calculateAdjustedScores,
    calculateReadingDimensions,
    calculateWordScore,
    normalizeMaxOffset,
    normalizePercentage,
    randomizeDistinctPercentages,
    randomizePercentage
} = require('../src/score');

test('normalizes percentages to zero through one hundred with two decimal places', () => {
    assert.equal(normalizePercentage(-1), 0);
    assert.equal(normalizePercentage(65), 65);
    assert.equal(normalizePercentage(33.333), 33.33);
    assert.equal(normalizePercentage(101), 100);
    assert.equal(normalizePercentage('invalid'), 100);
});

test('normalizes the maximum random offset to zero through one hundred', () => {
    assert.equal(normalizeMaxOffset(-1), 0);
    assert.equal(normalizeMaxOffset(5.678), 5.68);
    assert.equal(normalizeMaxOffset(101), 100);
    assert.equal(normalizeMaxOffset('invalid'), 0);
});

test('randomizes each percentage within the configured offset', () => {
    assert.equal(randomizePercentage(80, 5, () => 0), 75);
    assert.equal(randomizePercentage(80, 5, () => 0.5), 80);
    assert.equal(randomizePercentage(80, 5, () => 1), 85);
});

test('rerolls an out-of-range percentage until it is legal', () => {
    const values = [1, 0.25];
    let calls = 0;
    const percentage = randomizePercentage(95, 20, () => {
        calls += 1;
        return values.shift();
    });
    assert.equal(percentage, 85);
    assert.equal(calls, 2);
});

test('creates different legal random values for the three reading dimensions', () => {
    const values = [0, 0, 0, 0, 0, 0];
    const dimensions = calculateReadingDimensions(91, 5, () => values.shift() ?? 0);
    assert.deepEqual(dimensions, { accuracy: 86, fluency: 87, integrity: 88 });
    assert.equal(new Set(Object.values(dimensions)).size, 3);
});

test('uses the base value for every reading dimension when random offset is disabled', () => {
    assert.deepEqual(randomizeDistinctPercentages(88, 0, 3), [88, 88, 88]);
});

test('uses the configured percentage as each word green probability', () => {
    const greenValues = [0.89, 0.25];
    assert.deepEqual(calculateWordScore(90, 0, () => greenValues.shift()), {
        greenProbability: 90,
        band: 'green',
        score: 85
    });

    const orangeValues = [0.91, 0.1, 0.5];
    assert.deepEqual(calculateWordScore(90, 0, () => orangeValues.shift()), {
        greenProbability: 90,
        band: 'orange',
        score: 70
    });

    const redValues = [0.91, 0.9, 0.5];
    assert.deepEqual(calculateWordScore(90, 0, () => redValues.shift()), {
        greenProbability: 90,
        band: 'red',
        score: 30
    });
});

test('writes reading dimensions in the client zero-through-five format', () => {
    const detail = { total_score: 2 };
    assert.deepEqual(applyReadingDimensions(detail, 90, 5, () => 0), {
        accuracy: 85,
        fluency: 86,
        integrity: 87
    });
    assert.deepEqual(detail, {
        total_score: 2,
        accuracy_score: 4.25,
        fluency_score: 4.3,
        integrity_score: 4.35,
        dimension_result: [85, 86, 87]
    });
});

test('does not treat arrays as reading score detail objects', () => {
    const detail = [];
    assert.equal(applyReadingDimensions(detail, 90, 5), null);
    assert.deepEqual(detail, []);
});

test('calculates question and five-point scores with two decimal places', () => {
    assert.deepEqual(calculateAdjustedScores(4, 75), {
        percentage: 75,
        questionScore: 3,
        normalizedScore: 3.75
    });
    assert.deepEqual(calculateAdjustedScores(8, 62.5), {
        percentage: 62.5,
        questionScore: 5,
        normalizedScore: 3.13
    });
    assert.deepEqual(calculateAdjustedScores(4, 33.333), {
        percentage: 33.33,
        questionScore: 1.33,
        normalizedScore: 1.67
    });
});

test('uses the client graduation when the request requires a score step', () => {
    assert.deepEqual(calculateAdjustedScores(4, 33.33, '0.125'), {
        percentage: 33.33,
        questionScore: 1.38,
        normalizedScore: 1.67
    });
});

test('applies a new legal random offset before calculating the question score', () => {
    assert.deepEqual(calculateAdjustedScores(8, 80, undefined, 5, () => 1), {
        percentage: 85,
        questionScore: 6.8,
        normalizedScore: 4.25
    });
    assert.deepEqual(calculateAdjustedScores(8, 2, undefined, 10, () => 0.5), {
        percentage: 2,
        questionScore: 0.16,
        normalizedScore: 0.1
    });
});

test('rejects an invalid question total', () => {
    assert.equal(calculateAdjustedScores(undefined, 50), null);
    assert.equal(calculateAdjustedScores(-1, 50), null);
});
