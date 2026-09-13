const test = require('node:test');
const assert = require('node:assert/strict');

test('iframe setData hook publishes the current reference answers', () => {
    const messages = [];
    global.window = {};
    global.parent = {
        postMessage(message) {
            messages.push(message);
        }
    };
    global.document = { addEventListener() {} };

    const modulePath = require.resolve('../src/index.iframe');
    delete require.cache[modulePath];
    require(modulePath);

    let originalCalled = false;
    window.setData = data => {
        originalCalled = Boolean(data);
    };
    window.setData({ info: { xtlist: [{ xt_xh: 1, answer: 'C' }] } });

    assert.equal(originalCalled, true);
    assert.deepEqual(messages, [
        {
            source: 'etstoolbox',
            type: 'reference-answers',
            answers: [{ label: '第 1 题', value: 'C' }]
        }
    ]);

    delete require.cache[modulePath];
    delete global.window;
    delete global.parent;
    delete global.document;
});
