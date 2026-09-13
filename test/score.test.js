const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateAdjustedScores, normalizePercentage } = require('../src/score');

test('normalizes percentages to zero through one hundred with two decimal places', () => {
    assert.equal(normalizePercentage(-1), 0);
    assert.equal(normalizePercentage(65), 65);
    assert.equal(normalizePercentage(33.333), 33.33);
    assert.equal(normalizePercentage(101), 100);
    assert.equal(normalizePercentage('invalid'), 100);
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

test('rejects an invalid question total', () => {
    assert.equal(calculateAdjustedScores(undefined, 50), null);
    assert.equal(calculateAdjustedScores(-1, 50), null);
});
