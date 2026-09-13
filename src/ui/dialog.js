import { createElement } from './ui';
import { createRoot } from 'react-dom/client';
import React, { useState } from 'react';
import './style';
import { modules } from '../modules';
import Switch from './components/switch';

function ConfigInput({ module, configName }) {
    let value = module.configs[configName];

    switch (typeof value) {
        case 'boolean':
            return (
                <Switch
                    defaultChecked={value}
                    onChange={event => {
                        module.configs[configName] = event.currentTarget.checked;
                        module.saveConfigs();
                    }}
                ></Switch>
            );
        case 'string':
            return (
                <input
                    defaultValue={value}
                    onChange={event => {
                        module.configs[configName] = event.currentTarget.value;
                        module.saveConfigs();
                    }}
                ></input>
            );
        case 'number': {
            let isPercentage = configName == '得分百分比（0-100）';
            return (
                <input
                    defaultValue={value}
                    type="number"
                    min="0"
                    max={isPercentage ? '100' : undefined}
                    step={isPercentage ? '0.01' : '1'}
                    onChange={event => {
                        let nextValue = event.currentTarget.valueAsNumber;
                        if (!Number.isFinite(nextValue)) return;
                        nextValue = Math.max(0, nextValue);
                        if (isPercentage) nextValue = Math.round(Math.min(100, nextValue) * 100) / 100;
                        else nextValue = Math.round(nextValue);
                        event.currentTarget.value = nextValue;
                        module.configs[configName] = nextValue;
                        module.saveConfigs();
                    }}
                ></input>
            );
        }
    }
}

function SettingsItem({ module }) {
    let [expanded, setExpanded] = useState(false);
    let configNames = Object.keys(module.configs);

    return (
        <div className={`settings-row-container${expanded ? ' expand' : ''}`}>
            <div className="settings-row">
                <label className="lb">
                    {module.name}
                    <br></br>
                    <span className="desc">{module.description}</span>
                </label>
                <div className="item">
                    {configNames.length > 0 ? (
                        <button className="config-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                            {expanded ? '收起设置' : '展开设置'}
                        </button>
                    ) : undefined}
                    <Switch
                        defaultChecked={module.enabled}
                        onChange={event => {
                            module.enabled = event.currentTarget.checked;
                        }}
                    ></Switch>
                </div>
            </div>
            <div className="config">
                {configNames.map(configName => (
                    <div className="et-row" key={configName}>
                        <label className="lb">{configName}</label>
                        <div className="item">
                            <ConfigInput module={module} configName={configName}></ConfigInput>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function createDialog() {
    let dialog = createElement('dialog', document.body, { id: 'ets-dialog' });
    let dialogRoot = createRoot(dialog);
    let categories = Object.keys(modules);

    function SettingsContent() {
        let [category, setCategory] = useState(categories.includes('功能') ? '功能' : categories[0]);
        return (
            <>
                <div className="categories">
                    {categories.map(name => (
                        <button className={category == name ? 'active' : ''} onClick={() => setCategory(name)} key={name}>
                            {name}
                        </button>
                    ))}
                </div>
                <div className="current-category">
                    {Object.values(modules[category] ?? {}).map(module => (
                        <SettingsItem module={module} key={module.name}></SettingsItem>
                    ))}
                </div>
            </>
        );
    }

    dialogRoot.render(
        <>
            <div className="ets-dialog-container">
                <div
                    className="closebtn icon-close"
                    onClick={() => {
                        dialog.close();
                    }}
                ></div>
                <div className="info">
                    <img src={window._etb_resserver + '/resources/logo.png'}></img>
                    <div className="version">
                        <h3>ETSToolbox</h3>
                        <p>版本：{__VERSION}</p>
                    </div>
                </div>
                <div className="etsh-settings">
                    <SettingsContent></SettingsContent>
                </div>
            </div>
        </>
    );
    document.addEventListener('keydown', event => {
        if (event.key == 'F1') dialog.showModal();
    });
    window.addEventListener('message', event => {
        if (event.data == 'show-dialog') dialog.showModal();
    });

    return dialog;
}
