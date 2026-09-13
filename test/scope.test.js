const test = require('node:test');
const assert = require('node:assert/strict');
const { isListeningSpeakingLocation } = require('../src/scope');

test('allows known listening and speaking routes', () => {
    assert.equal(isListeningSpeakingLocation({ hash: '#/mockExamDetail?set_id=1' }), true);
    assert.equal(isListeningSpeakingLocation({ href: 'file:///app/index.html#/listeningSpeakingSynchronousDetail' }), true);
    assert.equal(isListeningSpeakingLocation({ pathname: '/readSentence_resource' }), true);
});

test('rejects reading-writing, words, dubbing, main, and result routes', () => {
    for (const route of ['/specialReadingWritingStart', '/wordPractice', '/recommDub', '/main/home', '/mockExamResult']) {
        assert.equal(isListeningSpeakingLocation({ hash: `#${route}` }), false, route);
    }
});
