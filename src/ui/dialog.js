import { appendStyle, createElement } from './ui';
import { createRoot } from 'react-dom/client';
import React, { useState, useId, useEffect, useRef } from 'react';
import './style';
import { events, modules } from '../modules';
import Switch from './components/switch';

function SettingsItem(props) {}

export function createDialog() {
    let d = createElement('dialog', document.body, { id: 'ets-dialog' });
    let dialogRoot = createRoot(d);
    let categories = Object.keys(modules);
    let contents = {};
    categories.forEach(c => {
        let ca = modules[c];
        contents[c] = () => (
            <>
                {Object.values(ca).map(m => {
                    return (
                        <div
                            className="settings-row-container"
                            onContextMenu={e => {
                                e.currentTarget.classList.toggle('expand');
                            }}
                        >
                            <div className="settings-row">
                                <label className="lb">
                                    {m.name}
                                    <br></br>
                                    <span className="desc">{m.description}</span>
                                </label>
                                <div className="item">
                                    <Switch
                                        defaultChecked={m.enabled}
                                        onChange={e => {
                                            m.enabled = e.currentTarget.checked;
                                        }}
                                    ></Switch>
                                </div>
                            </div>
                            <div className="config">
                                {(() =>
                                    Object.keys(m.configs).map(c => {
                                        let v = m.configs[c];
                                        return (
                                            <div className="et-row">
                                                <label className="lb">{c}</label>
                                                <div className="item">
                                                    {(() => {
                                                        function C({ v }) {
                                                            let ref = useRef();
                                                            useEffect(() => {
                                                                if (!(typeof v == 'boolean')) ref.current.value = v;
                                                                else ref.current.checked = v;
                                                            }, []);
                                                            switch (typeof v) {
                                                                case 'boolean':
                                                                    return (
                                                                        <Switch
                                                                            inputRef={ref}
                                                                            defaultChecked={v}
                                                                            onChange={e => {
                                                                                m.configs[c] = e.currentTarget.checked;
                                                                                m.saveConfigs();
                                                                            }}
                                                                        ></Switch>
                                                                    );
                                                                case 'string':
                                                                    return (
                                                                        <input
                                                                            ref={ref}
                                                                            onChange={e => {
                                                                                m.configs[c] = e.currentTarget.value;
                                                                                m.saveConfigs();
                                                                            }}
                                                                        ></input>
                                                                    );
                                                                case 'number':
                                                                    return (
                                                                        <input
                                                                            ref={ref}
                                                                            defaultValue={v}
                                                                            type="number"
                                                                            onChange={e => {
                                                                                m.configs[c] = e.currentTarget.valueAsNumber;
                                                                                m.saveConfigs();
                                                                            }}
                                                                        ></input>
                                                                    );
                                                            }
                                                        }
                                                        return <C v={v}></C>;
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    }))()}
                            </div>
                        </div>
                    );
                })}
            </>
        );
    });

    function SettingsContent() {
        let [categoryContent, setCC] = useState(contents['破解']);
        return (
            <>
                <div className="categories">
                    {categories.map(v => {
                        return (
                            <button
                                onClick={b => {
                                    document.querySelectorAll('.etsh-settings .categories button.active').forEach(e => e.classList.remove('active'));
                                    setCC(contents[v]);
                                    document.querySelectorAll('.expand');
                                    b.currentTarget.classList.add('active');
                                }}
                            >
                                {v}
                            </button>
                        );
                    })}
                </div>
                <div className="current-category">{categoryContent}</div>
            </>
        );
    }

    dialogRoot.render(
        <>
            <div className="ets-dialog-container">
                <div
                    className="closebtn icon-close"
                    onClick={() => {
                        d.close();
                    }}
                ></div>
                <div className="info">
                    <img src={window._etb_resserver + '/resources/logo.png'}></img>
                    <div className="version">
                        <h3>E听说外挂</h3>
                        <p>版本：{__VERSION}</p>
                    </div>
                </div>
                <div className="etsh-settings">
                    <SettingsContent></SettingsContent>
                </div>
            </div>
        </>
    );
    document.addEventListener('keydown', k => {
        if (k.key == 'F1') {
            d.showModal();
        }
    });

    window.addEventListener('message', e => {
        if (e.data == 'show-dialog') {
            d.showModal();
        }
    });

    return d;
}
