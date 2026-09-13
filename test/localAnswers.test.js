const test = require('node:test');
const assert = require('node:assert/strict');
const { findLocalReferenceAnswers } = require('../src/localAnswers');

test('loads reference answers from matching local content metadata', async () => {
    const calls = [];
    const result = await findLocalReferenceAnswers('http://localhost:8080/api', ['What did Carver want to be at first?'], async (url, options) => {
        calls.push({ url, options });
        return {
            ok: true,
            status: 200,
            async json() {
                return {
                    structure_type: 'collector.role',
                    info: {
                        question: [{ ask: 'What did Carver want to be at first?', std: [{ value: 'An artist.' }] }]
                    }
                };
            }
        };
    });

    assert.equal(calls[0].url, 'http://localhost:8080/api/find_local_answers');
    assert.equal(calls[0].options.body, 'What did Carver want to be at first?');
    assert.deepEqual(result, [{ label: 'What did Carver want to be at first?', value: 'An artist.' }]);
});

test('treats an unmatched local cache as an empty result', async () => {
    const result = await findLocalReferenceAnswers('http://localhost:8080/api', ['missing question'], async () => ({
        ok: false,
        status: 404
    }));
    assert.deepEqual(result, []);
});
