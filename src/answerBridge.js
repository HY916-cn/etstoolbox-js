import { events, settings } from './modules';
import { writeAnswersToConsole } from './answerConsole';
const { isListeningSpeakingLocation } = require('./scope');

let latestAnswers = [];

window.addEventListener('message', event => {
    if (event.data?.source !== 'etstoolbox' || event.data?.type !== 'reference-answers') return;
    if (!isListeningSpeakingLocation(window.location)) {
        console.debug('[ETSToolbox 答案] 已忽略非听说训练页面的数据');
        return;
    }
    latestAnswers = Array.isArray(event.data.answers) ? event.data.answers : [];
    console.info(`[ETSToolbox 答案] 已接收听说题参考内容 ${latestAnswers.length} 项`);
    if (settings.modules.显示答案) writeAnswersToConsole(latestAnswers);
});

events.on('settings-update', currentSettings => {
    if (currentSettings.modules.显示答案 && isListeningSpeakingLocation(window.location)) writeAnswersToConsole(latestAnswers);
});
