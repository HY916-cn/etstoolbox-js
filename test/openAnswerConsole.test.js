const test = require('node:test');
const assert = require('node:assert/strict');
const { openAnswerConsole } = require('../src/openAnswerConsole');

function installRequestMock({ status = 200, networkError = false } = {}) {
    const calls = [];
    global.window = { _etb_api: 'http://localhost:8080/api' };
    global.XMLHttpRequest = class {
        open(method, url) {
            calls.push({ method, url });
        }

        send() {
            this.status = status;
            if (networkError) this.onerror();
            else this.onload();
        }
    };
    return calls;
}

test('requests the fixed local endpoint that opens the answer console', async () => {
    const calls = installRequestMock();
    await openAnswerConsole();
    assert.deepEqual(calls, [{ method: 'post', url: 'http://localhost:8080/api/open_answer_console' }]);
});

test('reports local service and HTTP failures', async () => {
    installRequestMock({ status: 500 });
    await assert.rejects(openAnswerConsole(), /HTTP 500/);

    installRequestMock({ networkError: true });
    await assert.rejects(openAnswerConsole(), /本地服务/);
});

test.afterEach(() => {
    delete global.window;
    delete global.XMLHttpRequest;
});
