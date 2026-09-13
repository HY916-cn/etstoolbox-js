const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateAdjustedScores, normalizeMaxOffset, normalizePercentage, randomizePercentage } = require('../src/score');

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
