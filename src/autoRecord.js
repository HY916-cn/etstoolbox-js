import { settings } from './modules';
const { takeRecordButton } = require('./recordAutomation');

const recordState = { button: null };

const timer = setInterval(() => {
    if (!settings.modules.自动录音) {
        recordState.button = null;
        return;
    }
    const button = takeRecordButton(document, recordState);
    if (button) {
        console.log('自动录音：开始当前录音步骤');
        button.click();
    }
}, 250);

window.addEventListener('unload', () => clearInterval(timer));
