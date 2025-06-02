import EventEmitter from 'eventemitter3';
import { readConfig, writeConfig } from './api';

export let settings = {
    modules: {}
};
export const events = new EventEmitter();
Object.assign(settings, readConfig());
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
        Object.assign(configs, settings.modules[this.name + '_cfg']);
        this.saveConfigs();
        if (!modules[this.category]) modules[this.category] = {};
        modules[this.category][this.name] = this;
    }
}

new EModule('控分', '强制设置分数', '破解', { 最大误差: 0, 显示真实分数: true });
new EModule('控制时间', '自定义完成时间', '破解', { '时间(s)': 0 });
new EModule('显示答案', '在每一道题处显示答案', '破解');
new EModule('修改用户名', '将你的用户名修改成你想要的（注意：这只在客户端生效）', '娱乐', { 名字: '不告诉你' });
