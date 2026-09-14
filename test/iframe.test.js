const test = require('node:test');
const assert = require('node:assert/strict');

function loadIframeModule() {
    const messages = [];
    let poll;
    let unload;
    global.window = {
        setInterval(callback) {
            poll = callback;
            return 1;
        },
        clearInterval() {},
        addEventListener(type, callback) {
            if (type === 'unload') unload = callback;
        }
    };
    global.parent = {
        postMessage(message) {
            messages.push(message);
        }
    };
    global.document = { addEventListener() {} };

    const modulePath = require.resolve('../src/index.iframe');
    delete require.cache[modulePath];
    const iframeModule = require(modulePath);

    return {
        iframeModule,
        messages,
        poll: () => poll(),
        cleanup() {
            unload?.();
            delete require.cache[modulePath];
            delete global.window;
            delete global.parent;
            delete global.document;
        }
    };
}

test('iframe setData hook publishes the current reference answers', () => {
    const harness = loadIframeModule();

    let originalCalled = false;
    window.setData = data => {
        originalCalled = Boolean(data);
    };
    harness.poll();
    window.setData({ info: { xtlist: [{ xt_xh: 1, answer: 'C' }] } });

    assert.equal(originalCalled, true);
    assert.deepEqual(harness.messages, [
        {
            source: 'etstoolbox',
            type: 'reference-answers',
            answers: [{ label: '第 1 题', value: 'C' }],
            lookupTerms: []
        }
    ]);
    harness.cleanup();
});

test('recovers question data when a late global declaration replaces the hook', () => {
    const harness = loadIframeModule();

    Object.defineProperty(window, 'setData', {
        configurable: true,
        enumerable: true,
        writable: true,
        value(data) {
            window.showData = data;
        }
    });

    // The real page calls its newly declared function before our next polling pass.
    window.setData({ content_fill_answer: '[{"xth":"1","answer":"Asia"}]' });
    assert.deepEqual(harness.messages, []);

    harness.poll();
    assert.deepEqual(harness.messages, [
        {
            source: 'etstoolbox',
            type: 'reference-answers',
            answers: [{ label: '第 1 题', value: 'Asia' }],
            lookupTerms: []
        }
    ]);
    assert.equal(window.setData.__etstoolboxWrapped, true);
    harness.cleanup();
});

test('publishes an empty capture once instead of leaving the console waiting forever', () => {
    const harness = loadIframeModule();

    window.showData = { prompt: 'record now' };
    harness.poll();
    harness.poll();

    assert.deepEqual(harness.messages, [
        {
            source: 'etstoolbox',
            type: 'reference-answers',
            answers: [],
            lookupTerms: []
        }
    ]);
    harness.cleanup();
});

test('publishes answers from reading-writing practice data', () => {
    const harness = loadIframeModule();

    window.setData = data => {
        window.showData = data;
    };
    harness.poll();
    window.setData({
        question: [
            {
                type: 4,
                info: [
                    {
                        order: 0,
                        content: 'Choose the correct word.',
                        choose: [
                            { option: 'A', value: 'first' },
                            { option: 'B', value: 'second' }
                        ],
                        answer: 'B'
                    }
                ]
            }
        ]
    });

    assert.deepEqual(harness.messages[0].answers, [{ label: '第 1 题 · Choose the correct word.', value: 'B：second' }]);
    harness.cleanup();
});
