import { events, settings } from './modules';
import { writeAnswersToConsole } from './answerConsole';

let latestAnswers = [];

window.addEventListener('message', event => {
    if (event.data?.source !== 'etstoolbox' || event.data?.type !== 'reference-answers') return;
    latestAnswers = Array.isArray(event.data.answers) ? event.data.answers : [];
    if (settings.modules.显示答案) writeAnswersToConsole(latestAnswers);
});

events.on('settings-update', currentSettings => {
    if (currentSettings.modules.显示答案) writeAnswersToConsole(latestAnswers);
});
