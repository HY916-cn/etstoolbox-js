import { createRoot } from 'react-dom/client';
import { createElement } from './ui';
import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { events, settings } from '../modules';

export let overlay = { element: undefined, windows: [] };

function OverlayWindow(props) {
    let ref = useRef();
    return (
        <Draggable nodeRef={ref} handle=".title" allowAnyClick={false}>
            <div className="etsh-overlay-window" ref={ref} style={{ display: props.display ?? 'flex' }}>
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
    let [showRSWindow, setSRSW] = useState(settings.modules.控分_cfg.显示真实分数);
    let [showAWindow, setSAW] = useState(settings.modules.显示答案);
    events.on('settings-update', s => {
        setSRSW(s.modules.控分_cfg.显示真实分数);
        setSAW(s.modules.显示答案);
    });
    return (
        <>
            {/\/mockExamDetail/.test(location.href) ? (
                <>
                    <OverlayWindow title="真实分数" display={showRSWindow ? 'flex' : 'none'}>
                        <h3>真实分数</h3>
                        <ul></ul>
                    </OverlayWindow>
                    <OverlayWindow title="答案" display={showAWindow ? 'flex' : 'none'}>
                        <div className="cracked-answer"></div>
                    </OverlayWindow>
                </>
            ) : undefined}
        </>
    );
}

window.addEventListener('load', () => {
    overlay.element = createElement('div', document.body, { className: 'ets-overlay' });
    let root = createRoot(overlay.element);
    root.render(<Overlay></Overlay>);
});
