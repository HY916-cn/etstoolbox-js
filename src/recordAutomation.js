const RECORD_BUTTON_SELECTOR = '.exam-action-bar button.btn-record:not([disabled])';

function findRecordButton(documentObject) {
    const button = documentObject.querySelector(RECORD_BUTTON_SELECTOR);
    if (!button || button.getClientRects().length === 0) return null;
    return button;
}

function takeRecordButton(documentObject, state) {
    const button = findRecordButton(documentObject);
    if (!button) {
        state.button = null;
        return null;
    }
    if (state.button === button) return null;
    state.button = button;
    return button;
}

module.exports = { RECORD_BUTTON_SELECTOR, findRecordButton, takeRecordButton };
