import { createElement } from './ui';

window.addEventListener('load', () => {
    let s = createElement('link', document.head, {
        rel: 'stylesheet',
        href: _etb_resserver + '/css/index.css'
    });
});
