const test = require('node:test');
const assert = require('node:assert/strict');
const { RECORD_BUTTON_SELECTOR, findRecordButton, takeRecordButton } = require('../src/recordAutomation');

function createDocument(result) {
    return {
        selector: null,
        querySelector(selector) {
            this.selector = selector;
            return result;
        }
    };
}

test('only targets the enabled recording button in the exam action bar', () => {
    const button = { getClientRects: () => [1] };
    const documentObject = createDocument(button);
    assert.equal(findRecordButton(documentObject), button);
    assert.equal(documentObject.selector, '.exam-action-bar button.btn-record:not([disabled])');
    assert.equal(RECORD_BUTTON_SELECTOR.includes('btn-play'), false);
    assert.equal(RECORD_BUTTON_SELECTOR.includes('btn-stopRecord'), false);
});

test('does not target hidden recording buttons', () => {
    assert.equal(findRecordButton(createDocument({ getClientRects: () => [] })), null);
});

test('clicks once per recording state even when the same DOM node is reused', () => {
    const button = { getClientRects: () => [1] };
    let currentButton = button;
    const documentObject = {
        querySelector() {
            return currentButton;
        }
    };
    const state = { button: null };
    assert.equal(takeRecordButton(documentObject, state), button);
    assert.equal(takeRecordButton(documentObject, state), null);
    currentButton = null;
    assert.equal(takeRecordButton(documentObject, state), null);
    currentButton = button;
    assert.equal(takeRecordButton(documentObject, state), button);
});
