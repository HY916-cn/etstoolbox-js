const test = require('node:test');
const assert = require('node:assert/strict');
const { isReadingResultPage, randomizeWordArguments, startReadingResultControl } = require('../src/readingResult');

const separator = String.fromCharCode(1);

test('recognizes only the listening-speaking result iframes', () => {
    assert.equal(isReadingResultPage({ pathname: '/common/pc-listen-answer.html' }), true);
    assert.equal(isReadingResultPage({ href: 'file:///common/pc-class-result-index.html?x=1' }), true);
    assert.equal(isReadingResultPage({ pathname: '/common/read-write.html' }), false);
});

test('uses an independent green probability and fallback color for every normal word', () => {
    const values = [0.5, 0.1, 0.25, 0.5, 0.95, 0.1, 0.5, 0.5, 0.95, 0.9, 0.5];
    const input = [
        ['First', '', '', '', '', '10', '100', ''].join(separator),
        ['second', '', '', '', '', '20', '100', ''].join(separator),
        ['third.', '', '', '', '', '30', '100', ''].join(separator),
        '<br>',
        [':', '', '', '', '', '61', '100', ''].join(separator),
        ['Speaker', '', '', '', '', '-20', '100', ''].join(separator)
    ];
    const output = randomizeWordArguments(input, 90, 5, 5, 6, () => values.shift());
    assert.equal(output[0].split(separator)[5], '85');
    assert.equal(output[1].split(separator)[5], '70');
    assert.equal(output[2].split(separator)[5], '30');
    assert.equal(output[3], input[3]);
    assert.equal(output[4], input[4]);
    assert.equal(output[5], input[5]);
});

test('wraps result functions with controlled dimensions and independent word scores', () => {
    const calls = [];
    let poll;
    const win = {
        location: { pathname: '/common/pc-listen-answer.html' },
        setInterval(callback) {
            poll = callback;
            return 1;
        },
        clearInterval() {},
        addEventListener() {},
        showEssay_2(...args) {
            calls.push(['essay', args]);
        },
        showScoreDetail(...args) {
            calls.push(['dimensions', args]);
        }
    };
    const randomValues = [0, 0.1, 0.2, 0.3, 0.4];
    startReadingResultControl(win, {
        getSettings: () => ({ percentage: 90, maxOffset: 5 }),
        random: () => randomValues.shift() ?? 0.5
    });
    poll();

    win.showEssay_2(['word', '', '', '', '', '0', '100'].join(separator));
    win.showScoreDetail(1, 2, 3);
    assert.equal(calls[0][1][0].split(separator)[5], '90');
    assert.equal(new Set(calls[1][1]).size, 3);
    assert.ok(calls[1][1].every(value => value >= 85 && value <= 95));
});
