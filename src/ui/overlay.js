import { createRoot } from 'react-dom/client';
import { createElement } from './ui';
import React, { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { events, settings } from '../modules';

export let overlay = { element: undefined, windows: [] };

function OverlayWindow(props) {
    let ref = useRef();
    return (
        <Draggable nodeRef={ref} handle=".title" allowAnyClick={false}>
            <div className="etsh-overlay-window" ref={ref} style={{ ...props.style, display: props.display ?? 'flex' }}>
                <div
                    className="title"
                    onContextMenu={e => {
                        ref.current.classList.toggle('_minimized');
                    }}
                >
                    <p>{props.title}</p>
                </div>
                <div className="children">{props.children}</div>
            </div>
        </Draggable>
    );
}
function Overlay() {
    let [showAWindow, setSAW] = useState(settings.modules.显示答案);
    let [answers, setAnswers] = useState([]);
    let [currentPath, setCurrentPath] = useState(location.pathname);

    useEffect(() => {
        const onSettingsUpdate = s => {
            setSAW(s.modules.显示答案);
        };
        const onMessage = event => {
            if (event.data?.source !== 'etstoolbox' || event.data?.type !== 'reference-answers') return;
            const nextAnswers = Array.isArray(event.data.answers) ? event.data.answers : [];
            setAnswers(nextAnswers);
        };
        const routeTimer = setInterval(() => {
            setCurrentPath(path => (path === location.pathname ? path : location.pathname));
        }, 250);
        events.on('settings-update', onSettingsUpdate);
        window.addEventListener('message', onMessage);
        return () => {
            clearInterval(routeTimer);
            events.off('settings-update', onSettingsUpdate);
            window.removeEventListener('message', onMessage);
        };
    }, []);

    return (
        <>
            {/\/mockExamDetail/.test(currentPath) ? (
                <OverlayWindow title="参考答案（右键标题可收起）" display={showAWindow ? 'flex' : 'none'} style={{ top: '24px', right: '24px' }}>
                    {answers.length ? (
                        <ol className="cracked-answer">
                            {answers.map((answer, index) => (
                                <li key={`${answer.label}-${index}`}>
                                    <strong>{answer.label}</strong>
                                    <span>{answer.value}</span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="answer-empty">当前题目数据中没有可显示的参考答案</p>
                    )}
                </OverlayWindow>
            ) : undefined}
        </>
    );
}

window.addEventListener('load', () => {
    overlay.element = createElement('div', document.body, { className: 'ets-overlay' });
    let root = createRoot(overlay.element);
    root.render(<Overlay></Overlay>);
});
