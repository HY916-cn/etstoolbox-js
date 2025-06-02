/**
 *
 * @param {string} n
 * @param {object} attr
 */
export function createElement(n, target = document.body, attr = {}) {
    let e = document.createElement(n);
    Object.assign(e, attr);
    target.append(e);
    return e;
}
export function appendStyle(s) {
    let st = document.createElement('style');
    st.innerText = s;
    document.head?.append(st);
}
