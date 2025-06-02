/**
 *
 * @param {Function} f
 * @returns
 */
export function observe(f) {
    return new Proxy(f, {
        apply(target, ta, aa) {
            console.trace('函数%s被调用了：', target.name, ta, aa);
            target.apply(ta, aa);
        }
    });
}
