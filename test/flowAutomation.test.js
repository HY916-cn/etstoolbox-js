const test = require('node:test');
const assert = require('node:assert/strict');
const {
    MIN_RECORDING_MS,
    createFlowState,
    findNextButton,
    nextFlowAction,
    actionTookEffect
} = require('../src/flowAutomation');

function button({ text = '', icon = '', connected = true } = {}) {
    return {
        disabled: false,
        isConnected: connected,
        textContent: text,
        classList: { contains: () => false },
        getClientRects: () => [1],
        querySelector: selector => (selector === icon ? {} : null)
    };
}

function documentState({ actionBar = true, record = null, stop = null, next = null } = {}) {
    return {
        querySelector(selector) {
            if (selector === '.exam-action-bar') return actionBar ? {} : null;
            if (selector.includes('btn-stopRecord')) return stop;
            if (selector.includes('btn-record')) return record;
            return null;
        },
        querySelectorAll() {
            return next ? [next] : [];
        }
    };
}

test('waits for the user to start the exercise', () => {
    const state = createFlowState();
    assert.equal(nextFlowAction(documentState(), state, { allowRecording: true, allowNext: true }, 1000).action, null);
    assert.equal(state.started, false);
    assert.equal(state.phase, 'waiting-for-user');
});

test('starts recording when the real record button becomes available', () => {
    const record = button();
    const state = createFlowState();
    const result = nextFlowAction(documentState({ record }), state, { allowRecording: true }, 1000);
    assert.equal(result.action.type, 'start-recording');
    assert.equal(result.action.button, record);
});

test('stops only after the recording state has lasted two seconds', () => {
    const stop = button();
    const state = createFlowState();
    assert.equal(nextFlowAction(documentState({ stop }), state, { allowRecording: true }, 1000).action, null);
    assert.equal(nextFlowAction(documentState({ stop }), state, { allowRecording: true }, 1000 + MIN_RECORDING_MS - 1).action, null);
    assert.equal(nextFlowAction(documentState({ stop }), state, { allowRecording: true }, 1000 + MIN_RECORDING_MS).action.type, 'stop-recording');
});

test('retries an unchanged control at a bounded interval', () => {
    const record = button();
    const state = createFlowState();
    assert.equal(nextFlowAction(documentState({ record }), state, { allowRecording: true }, 1000).action.type, 'start-recording');
    assert.equal(nextFlowAction(documentState({ record }), state, { allowRecording: true }, 2000).action, null);
    assert.equal(nextFlowAction(documentState({ record }), state, { allowRecording: true }, 2500).action.attempts, 2);
});

test('finds and advances through the next-step control', () => {
    const next = button({ text: '下一步', icon: '.icon-nextQuestion' });
    const doc = documentState({ next });
    const state = createFlowState();
    assert.equal(findNextButton(doc), next);
    assert.equal(nextFlowAction(doc, state, { allowNext: true }, 1000).action.type, 'next');
});

test('keeps automatic recording and automatic next-step independent', () => {
    const record = button();
    const next = button({ text: '下一步' });
    assert.equal(nextFlowAction(documentState({ record }), createFlowState(), { allowNext: true }, 1000).action, null);
    assert.equal(nextFlowAction(documentState({ next }), createFlowState(), { allowRecording: true }, 1000).action, null);
});

test('verifies record, stop, and next state changes', () => {
    const record = button();
    const stop = button();
    assert.equal(actionTookEffect(documentState({ stop }), { type: 'start-recording', button: record }), true);
    assert.equal(actionTookEffect(documentState(), { type: 'stop-recording', button: stop }), true);
    assert.equal(actionTookEffect(documentState({ record }), { type: 'next', button: button() }), true);
});
