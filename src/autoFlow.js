import { settings } from './modules';
const { isListeningSpeakingLocation } = require('./scope');
const { createFlowState, nextFlowAction, actionTookEffect } = require('./flowAutomation');

const state = createFlowState();
let enabledLastTick = false;

function report(message, detail = '') {
    const suffix = detail ? `：${detail}` : '';
    console.log(`[ETSToolbox 自动流程] ${message}${suffix}`);
}

const timer = setInterval(() => {
    const allowRecording = Boolean(settings.modules.自动录音);
    const allowNext = Boolean(settings.modules.自动下一步);
    const enabled = (allowRecording || allowNext) && isListeningSpeakingLocation(window.location);
    if (!enabled) {
        if (enabledLastTick) report('已停止', '功能关闭或已离开听说页面');
        Object.assign(state, createFlowState());
        enabledLastTick = false;
        return;
    }
    if (!enabledLastTick) report('开始监测', '请手动点击整套练习的开始按钮');
    enabledLastTick = true;

    const { event, action } = nextFlowAction(document, state, { allowRecording, allowNext });
    if (event) report('状态', event.phase);
    if (!action) return;

    report('执行', `${action.type}（第 ${action.attempts} 次）`);
    action.button.click();
    setTimeout(() => {
        report(actionTookEffect(document, action) ? '点击已生效' : '状态未变化，继续监测并按间隔重试', action.type);
    }, 400);
}, 200);

window.addEventListener('unload', () => clearInterval(timer));
