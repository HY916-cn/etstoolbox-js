const { extractReferenceAnswers } = require('./answers');

const MESSAGE_SOURCE = 'etstoolbox';

function publishAnswers(data) {
    parent.postMessage(
        {
            source: MESSAGE_SOURCE,
            type: 'reference-answers',
            answers: extractReferenceAnswers(data)
        },
        '*'
    );
}

function wrapSetData(setData) {
    if (typeof setData !== 'function' || setData.__etstoolboxWrapped) return setData;
    function wrappedSetData(...args) {
        publishAnswers(args[0]);
        return setData.apply(this, args);
    }
    wrappedSetData.__etstoolboxWrapped = true;
    return wrappedSetData;
}

let currentSetData = wrapSetData(window.setData);
try {
    Object.defineProperty(window, 'setData', {
        configurable: true,
        enumerable: true,
        get() {
            return currentSetData;
        },
        set(value) {
            currentSetData = wrapSetData(value);
        }
    });
} catch (error) {
    const timer = setInterval(() => {
        if (typeof window.setData === 'function' && !window.setData.__etstoolboxWrapped) window.setData = wrapSetData(window.setData);
    }, 100);
    window.addEventListener('unload', () => clearInterval(timer));
}

document.addEventListener('keydown', event => {
    if (event.key === 'F1') parent.postMessage('show-dialog', '*');
});
