import { createElement } from './ui';

export function createBtn(target, txt, onclick) {
    return createElement('button', target, { innerHTML: txt, onclick });
}
