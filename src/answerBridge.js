import { events, settings } from './modules';
import { writeAnswersToConsole } from './answerConsole';

let latestAnswers = [];

window.addEventListener('message', event => {
    if (event.data?.source !== 'etstoolbox' || event.data?.type !== 'reference-answers') return;
    latestAnswers = Array.isArray(event.data.answers) ? event.data.answers : [];
    console.info(`[ETSToolbox 答案] 已接收当前页面参考内容 ${latestAnswers.length} 项`);
    if (settings.modules.显示答案) writeAnswersToConsole(latestAnswers);
});

events.on('settings-update', currentSettings => {
    if (currentSettings.modules.显示答案) writeAnswersToConsole(latestAnswers);
});
