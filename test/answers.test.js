const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanText, extractReferenceAnswers } = require('../src/answers');

test('extracts choice answers and their option text', () => {
    const result = extractReferenceAnswers([
        {
            info: {
                xtlist: [
                    {
                        xt_xh: '2',
                        xt_nr: '{{th2}} What time will the lecture begin?',
                        answer: 'B',
                        xxlist: [
                            { xx_mc: 'A', xx_nr: 'At 7:00.' },
                            { xx_mc: 'B', xx_nr: 'At 7:30.' }
                        ]
                    }
                ]
            }
        }
    ]);
    assert.deepEqual(result, [{ label: '第 2 题 · What time will the lecture begin?', value: 'B：At 7:30.' }]);
});

test('extracts ordered fill answers', () => {
    const result = extractReferenceAnswers({
        info: {
            std: [
                { xth: '1', value: 'middle' },
                { xth: '2', value: 'Asia' }
            ]
        }
    });
    assert.deepEqual(result, [
        { label: '第 1 题', value: 'middle' },
        { label: '第 2 题', value: 'Asia' }
    ]);
});

test('shows every oral reference sample for the current question', () => {
    const result = extractReferenceAnswers({
        ask: 'How did he feel?',
        std: [{ value: 'Excited.' }, { value: 'He felt excited.' }, { value: 'So excited.' }, { value: 'Happy.' }]
    });
    assert.deepEqual(result, [{ label: 'How did he feel?', value: 'Excited.\n或：He felt excited.\n或：So excited.\n或：Happy.' }]);
});

test('extracts every recognized answer field from nested and JSON-encoded questions', () => {
    const input = {
        sections: [
            { order: 1, question_text: 'Question one', correctAnswer: 'A' },
            { order: 2, question_text: 'Question two', right_answer: ['first', 'second'] },
            '{"xh":3,"ask":"Question three","standardAnswer":{"value":"sample"}}'
        ],
        user_answer: 'must not be shown'
    };
    assert.deepEqual(extractReferenceAnswers(input), [
        { label: '第 1 题 · Question one', value: 'A' },
        { label: '第 2 题 · Question two', value: 'first\n或：second' },
        { label: '第 3 题 · Question three', value: 'sample' }
    ]);
});

test('cleans markup without interpreting it as HTML', () => {
    assert.equal(cleanText('</p><p>A &amp; B<br>C'), 'A & B\nC');
});
