const { extractAnswerLookupTerms, extractReferenceAnswers } = require('./answers');

const MESSAGE_SOURCE = 'etstoolbox';
const CAPTURE_INTERVAL_MS = 100;
let lastPublishedSignature;

function publishAnswers(data, target = parent) {
    const answers = extractReferenceAnswers(data);
    const lookupTerms = extractAnswerLookupTerms(data);
    const signature = JSON.stringify({ answers, lookupTerms });
    if (signature === lastPublishedSignature) return;
    lastPublishedSignature = signature;
    console.info(`[ETSToolbox 答案] 已捕获当前题目数据，参考内容 ${answers.length} 项`);
    target.postMessage(
        {
            source: MESSAGE_SOURCE,
            type: 'reference-answers',
            answers,
            lookupTerms
        },
        '*'
    );
}

function wrapSetData(setData, target = parent) {
    if (typeof setData !== 'function' || setData.__etstoolboxWrapped) return setData;
    function wrappedSetData(...args) {
        publishAnswers(args[0], target);
        return setData.apply(this, args);
    }
    wrappedSetData.__etstoolboxWrapped = true;
    return wrappedSetData;
}

function startAnswerCapture(win = window, target = parent) {
    let lastShowData;

    function checkForQuestionData() {
        try {
            if (typeof win.setData === 'function' && !win.setData.__etstoolboxWrapped) {
                win.setData = wrapSetData(win.setData, target);
            }

            // The question page stores the current payload here. This fallback is
            // essential when its late global `function setData` declaration replaces
            // our wrapper and is called before the next polling pass.
            if (win.showData && win.showData !== lastShowData) {
                lastShowData = win.showData;
                publishAnswers(win.showData, target);
            }
        } catch (error) {
            console.error('[ETSToolbox 答案] 题目数据捕获失败：', error);
        }
    }

    checkForQuestionData();
    const timer = win.setInterval(checkForQuestionData, CAPTURE_INTERVAL_MS);
    win.addEventListener('unload', () => win.clearInterval(timer), { once: true });
    return { checkForQuestionData, stop: () => win.clearInterval(timer) };
}

startAnswerCapture();

document.addEventListener('keydown', event => {
    if (event.key === 'F1') parent.postMessage('show-dialog', '*');
});

module.exports = { CAPTURE_INTERVAL_MS, publishAnswers, startAnswerCapture, wrapSetData };
