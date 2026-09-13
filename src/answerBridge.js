import { events, settings } from './modules';
import { writeAnswersToConsole } from './answerConsole';
import { findLocalReferenceAnswers } from './localAnswers';

let latestAnswers = [];
let latestLookupTerms = [];
let lookupGeneration = 0;
const lookupCache = new Map();

function showAnswers(answers, source) {
    latestAnswers = Array.isArray(answers) ? answers : [];
    console.info(`[ETSToolbox 答案] ${source}参考内容 ${latestAnswers.length} 项`);
    if (settings.modules.显示答案) writeAnswersToConsole(latestAnswers);
}

async function resolveLocalAnswers(lookupTerms) {
    const generation = ++lookupGeneration;
    const signature = JSON.stringify(lookupTerms);
    try {
        let answers = lookupCache.get(signature);
        if (!answers) {
            answers = await findLocalReferenceAnswers(window._etb_api, lookupTerms);
            lookupCache.set(signature, answers);
        }
        if (generation === lookupGeneration) showAnswers(answers, '已从本机题库匹配');
    } catch (error) {
        if (generation !== lookupGeneration) return;
        console.error('[ETSToolbox 答案] 本机题库匹配失败：', error);
        showAnswers([], '本机题库未匹配到');
    }
}

window.addEventListener('message', event => {
    if (event.data?.source !== 'etstoolbox' || event.data?.type !== 'reference-answers') return;
    const answers = Array.isArray(event.data.answers) ? event.data.answers : [];
    latestLookupTerms = Array.isArray(event.data.lookupTerms) ? event.data.lookupTerms : [];
    if (answers.length) {
        lookupGeneration++;
        showAnswers(answers, '已接收当前页面');
    } else {
        resolveLocalAnswers(latestLookupTerms);
    }
});

events.on('settings-update', currentSettings => {
    if (!currentSettings.modules.显示答案) return;
    if (latestAnswers.length) writeAnswersToConsole(latestAnswers);
    else resolveLocalAnswers(latestLookupTerms);
});
