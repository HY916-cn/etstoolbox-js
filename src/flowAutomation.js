const ACTION_BAR_SELECTOR = '.exam-action-bar';
const RECORD_SELECTOR = `${ACTION_BAR_SELECTOR} button.btn-record:not([disabled])`;
const STOP_RECORD_SELECTOR = `${ACTION_BAR_SELECTOR} button.btn-stopRecord:not([disabled])`;
const ACTION_BUTTON_SELECTOR = `${ACTION_BAR_SELECTOR} button.btn:not([disabled])`;
const MIN_RECORDING_MS = 2000;
const RETRY_MS = { 'start-recording': 1500, 'stop-recording': 1500, next: 900 };

function isUsable(button) {
    return Boolean(button && !button.disabled && !button.classList?.contains('is-disabled') && button.getClientRects().length);
}

function findButton(documentObject, selector) {
    const button = documentObject.querySelector(selector);
    return isUsable(button) ? button : null;
}

function findNextButton(documentObject) {
    const buttons = Array.from(documentObject.querySelectorAll(ACTION_BUTTON_SELECTOR));
    return (
        buttons.find(button => isUsable(button) && (button.querySelector?.('.icon-nextQuestion') || button.textContent?.trim() === '下一步')) ?? null
    );
}

function createFlowState() {
    return {
        started: false,
        phase: 'waiting-for-user',
        recordingSince: null,
        lastAction: null
    };
}

function setPhase(state, phase, now) {
    if (state.phase === phase) return null;
    state.phase = phase;
    return { type: 'phase', phase, at: now };
}

function canAct(state, type, button, now) {
    const previous = state.lastAction;
    return !previous || previous.type !== type || previous.button !== button || now - previous.at >= RETRY_MS[type];
}

function rememberAction(state, type, button, now) {
    const previous = state.lastAction;
    const attempts = previous?.type === type && previous.button === button ? previous.attempts + 1 : 1;
    state.lastAction = { type, button, at: now, attempts };
    return { type, button, attempts, at: now };
}

function nextFlowAction(documentObject, state, options = {}, now = Date.now()) {
    const allowRecording = Boolean(options.allowRecording);
    const allowNext = Boolean(options.allowNext);
    const actionBar = documentObject.querySelector(ACTION_BAR_SELECTOR);
    if (!actionBar) {
        state.recordingSince = null;
        return { event: setPhase(state, state.started ? 'waiting-for-completion' : 'waiting-for-user', now), action: null };
    }

    const stopButton = findButton(documentObject, STOP_RECORD_SELECTOR);
    if (stopButton) {
        state.started = true;
        if (state.phase !== 'recording') state.recordingSince = now;
        const event = setPhase(state, 'recording', now);
        if (!allowRecording) return { event, action: null };
        if (now - state.recordingSince < MIN_RECORDING_MS || !canAct(state, 'stop-recording', stopButton, now)) return { event, action: null };
        return { event, action: rememberAction(state, 'stop-recording', stopButton, now) };
    }

    state.recordingSince = null;
    const recordButton = findButton(documentObject, RECORD_SELECTOR);
    if (recordButton) {
        state.started = true;
        const event = setPhase(state, 'record-ready', now);
        if (!allowRecording) return { event, action: null };
        if (!canAct(state, 'start-recording', recordButton, now)) return { event, action: null };
        return { event, action: rememberAction(state, 'start-recording', recordButton, now) };
    }

    const nextButton = findNextButton(documentObject);
    if (nextButton) {
        state.started = true;
        const event = setPhase(state, 'next-ready', now);
        if (!allowNext) return { event, action: null };
        if (!canAct(state, 'next', nextButton, now)) return { event, action: null };
        return { event, action: rememberAction(state, 'next', nextButton, now) };
    }

    return { event: setPhase(state, state.started ? 'running' : 'waiting-for-user', now), action: null };
}

function actionTookEffect(documentObject, action) {
    if (action.type === 'start-recording') return Boolean(findButton(documentObject, STOP_RECORD_SELECTOR));
    if (action.type === 'stop-recording') return !findButton(documentObject, STOP_RECORD_SELECTOR);
    if (action.type === 'next') return !action.button.isConnected || !isUsable(action.button) || Boolean(findButton(documentObject, RECORD_SELECTOR));
    return false;
}

module.exports = {
    ACTION_BAR_SELECTOR,
    RECORD_SELECTOR,
    STOP_RECORD_SELECTOR,
    MIN_RECORDING_MS,
    createFlowState,
    findNextButton,
    nextFlowAction,
    actionTookEffect
};
