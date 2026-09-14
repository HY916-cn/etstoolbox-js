import EventEmitter from 'eventemitter3';
import { readConfig, writeConfig } from './api';

export let settings = {
    modules: {}
};
export const events = new EventEmitter();
Object.assign(settings, readConfig());

if (settings.modules.作业提交用时 === undefined && settings.modules.控制时间 !== undefined) {
    settings.modules.作业提交用时 = settings.modules.控制时间;
}
if (settings.modules.作业提交用时_cfg === undefined && settings.modules.控制时间_cfg) {
    settings.modules.作业提交用时_cfg = {
        '时间（秒）': settings.modules.控制时间_cfg['时间(s)'] ?? 0
    };
}
delete settings.modules.控制时间;
delete settings.modules.控制时间_cfg;
delete settings.modules.修改用户名;
delete settings.modules.修改用户名_cfg;
if (settings.modules.自动录音 === undefined && settings.modules.自动流程 !== undefined) {
    settings.modules.自动录音 = settings.modules.自动流程;
}
if (settings.modules.自动下一步 === undefined && settings.modules.自动流程 !== undefined) {
    settings.modules.自动下一步 = settings.modules.自动流程;
}
delete settings.modules.自动流程;
delete settings.modules.自动流程_cfg;

function saveSettings() {
    writeConfig(settings);
    events.emit('settings-update', settings);
}

export let modules = {};

export class EModule {
    name = 'unknown';
    description = 'unknown';
    _enabled = false;
    category = '基础功能';
    set enabled(value) {
        this._enabled = value;
        settings.modules[this.name] = value;
        saveSettings();
    }
    get enabled() {
        return this._enabled;
    }
    saveConfigs() {
        settings.modules[this.name + '_cfg'] = this.configs;
        saveSettings();
    }
    configs = {};
    constructor(name, desc, category, configs = {}) {
        this.configs = configs;
        this.name = name;
        this.description = desc;
        this.category = category;
        this.enabled = settings.modules[this.name] ?? false;
        let savedConfigs = settings.modules[this.name + '_cfg'];
        if (savedConfigs) {
            Object.keys(configs).forEach(key => {
                if (Object.prototype.hasOwnProperty.call(savedConfigs, key)) configs[key] = savedConfigs[key];
            });
        }
        this.saveConfigs();
        if (!modules[this.category]) modules[this.category] = {};
        modules[this.category][this.name] = this;
    }
}

new EModule('控分', '按百分比设置提交分数，并可为每题随机偏移', '功能', {
    '得分百分比（0-100）': 100,
    '随机偏移上限（百分点）': 0
});
new EModule('作业提交用时', '设置提交记录中的完成用时', '功能', { '时间（秒）': 0 });
new EModule('显示答案', '识别听说、选择、填空、阅读等练习的参考答案并输出到独立终端', '功能');
new EModule('自动录音', '进入录音步骤后自动开始，并在 2 秒后停止', '功能');
new EModule('自动下一步', '手动开始练习后，自动点击可用的下一步按钮', '功能');
