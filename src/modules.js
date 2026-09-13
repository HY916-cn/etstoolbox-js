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

new EModule('控分', '按百分比设置提交分数', '破解', { '得分百分比（0-100）': 100, 显示真实分数: true });
new EModule('作业提交用时', '设置提交记录中的完成用时', '破解', { '时间（秒）': 0 });
new EModule('显示答案', '将当前题目的参考答案输出到独立终端', '破解');
new EModule('修改用户名', '将你的用户名修改成你想要的（注意：这只在客户端生效）', '娱乐', { 名字: '不告诉你' });
