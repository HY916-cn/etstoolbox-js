const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanText, extractAnswerLookupTerms, extractReferenceAnswers } = require('../src/answers');

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

test('extracts reference text for listening-speaking reading and repeat structures', () => {
    const result = extractReferenceAnswers([
        { structure_type: 'collector.read', info: { ai: '<p>Read this passage.</p>' } },
        { structure_type: 'collector.repeat', info: { ai: 'Repeat this sentence.' } },
        { structure_type: 'collector.word', info: { value_pf: 'ets_th1 Read this sentence aloud.' } }
    ]);
    assert.deepEqual(result, [
        { label: '模仿朗读参考文本', value: 'Read this passage.' },
        { label: '跟读参考文本', value: 'Repeat this sentence.' },
        { label: '朗读句子参考文本', value: 'Read this sentence aloud.' }
    ]);
});

test('cleans markup without interpreting it as HTML', () => {
    assert.equal(cleanText('</p><p>A &amp; B<br>C'), 'A & B\nC');
});

test('extracts stable question text for matching the local exercise cache', () => {
    const result = extractAnswerLookupTerms({
        title: '二、信息获取(共10分)',
        hint: '听第二段对话，回答第3-4两个问题。现在你有10秒的阅题时间。',
        content: "3. What did Carver want to be at first?<br>(An artist. / A farmer. / An agricultural scientist.)</br>4. Why did Carver change his mind?<br>(He loved nature. / He discovered his real talent. / He wanted to improve farmers' lives.)"
    });
    assert.ok(result.includes('What did Carver want to be at first?'));
    assert.ok(result.includes('Why did Carver change his mind?'));
    assert.ok(!result.some(term => term.startsWith('二、信息获取')));
});

test('extracts reading-writing choice, cloze, and fill answers with option text', () => {
    const result = extractReferenceAnswers({
        question: [
            {
                type: 4,
                info: [
                    {
                        order: 0,
                        content: 'Where does Betty come from?',
                        choose: [
                            { option: 'A', value: 'Germany.' },
                            { option: 'B', value: 'France.' }
                        ],
                        answer: 'A',
                        user_answer: [{ value: 'B' }]
                    }
                ]
            },
            { type: 2, info: [{ order: 1, content: 'Complete the sentence.', answer: 'working' }] }
        ]
    });
    assert.deepEqual(result, [
        { label: '第 1 题 · Where does Betty come from?', value: 'A：Germany.' },
        { label: '第 2 题 · Complete the sentence.', value: 'working' }
    ]);
});

test('extracts additional model and reference answer fields', () => {
    assert.deepEqual(
        extractReferenceAnswers({
            sections: [
                { questionText: 'Writing', modelAnswer: 'Model paragraph.' },
                { stem: 'Translation', std_answer: 'Standard translation.' },
                { question_content: 'Practice', pranswer: 'Practice answer.' }
            ]
        }),
        [
            { label: 'Writing', value: 'Model paragraph.' },
            { label: 'Translation', value: 'Standard translation.' },
            { label: 'Practice', value: 'Practice answer.' }
        ]
    );
});
