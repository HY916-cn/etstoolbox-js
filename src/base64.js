export const _hasatob = 'function' == typeof atob,
    _hasbtoa = 'function' == typeof btoa,
    _hasBuffer = 'function' == typeof Buffer,
    _TD = 'function' == typeof TextDecoder ? new TextDecoder() : void 0,
    _TE = 'function' == typeof TextEncoder ? new TextEncoder() : void 0,
    b64ch$1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    b64chs$1 = Array.prototype.slice.call(b64ch$1),
    b64tab = (e => {
        let t = {};
        return b64chs$1.forEach((e, n) => (t[e] = n)), t;
    })(),
    b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/,
    _fromCC = String.fromCharCode.bind(String),
    _U8Afrom = 'function' == typeof Uint8Array.from ? Uint8Array.from.bind(Uint8Array) : e => new Uint8Array(Array.prototype.slice.call(e, 0)),
    _mkUriSafe = e => e.replace(/=/g, '').replace(/[+\/]/g, e => ('+' == e ? '-' : '_')),
    _tidyB64 = e => e.replace(/[^A-Za-z0-9\+\/]/g, ''),
    btoaPolyfill = e => {
        let t,
            n,
            r,
            o,
            i = '';
        const a = e.length % 3;
        for (let s = 0; s < e.length; ) {
            if ((n = e.charCodeAt(s++)) > 255 || (r = e.charCodeAt(s++)) > 255 || (o = e.charCodeAt(s++)) > 255) throw new TypeError('invalid character found');
            (t = (n << 16) | (r << 8) | o), (i += b64chs$1[(t >> 18) & 63] + b64chs$1[(t >> 12) & 63] + b64chs$1[(t >> 6) & 63] + b64chs$1[63 & t]);
        }
        return a ? i.slice(0, a - 3) + '==='.substring(a) : i;
    },
    _btoa = _hasbtoa ? e => btoa(e) : _hasBuffer ? e => Buffer.from(e, 'binary').toString('base64') : btoaPolyfill,
    _fromUint8Array = _hasBuffer
        ? e => Buffer.from(e).toString('base64')
        : e => {
              let t = [];
              for (let n = 0, r = e.length; n < r; n += 4096) t.push(_fromCC.apply(null, e.subarray(n, n + 4096)));
              return _btoa(t.join(''));
          },
    fromUint8Array = (e, t = !1) => (t ? _mkUriSafe(_fromUint8Array(e)) : _fromUint8Array(e)),
    cb_utob = e => {
        if (e.length < 2)
            return (t = e.charCodeAt(0)) < 128
                ? e
                : t < 2048
                  ? _fromCC(192 | (t >>> 6)) + _fromCC(128 | (63 & t))
                  : _fromCC(224 | ((t >>> 12) & 15)) + _fromCC(128 | ((t >>> 6) & 63)) + _fromCC(128 | (63 & t));
        var t = 65536 + 1024 * (e.charCodeAt(0) - 55296) + (e.charCodeAt(1) - 56320);
        return _fromCC(240 | ((t >>> 18) & 7)) + _fromCC(128 | ((t >>> 12) & 63)) + _fromCC(128 | ((t >>> 6) & 63)) + _fromCC(128 | (63 & t));
    },
    re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g,
    utob = e => e.replace(re_utob, cb_utob),
    _encode = _hasBuffer ? e => Buffer.from(e, 'utf8').toString('base64') : _TE ? e => _fromUint8Array(_TE.encode(e)) : e => _btoa(utob(e)),
    encode = (e, t = !1) => (t ? _mkUriSafe(_encode(e)) : _encode(e)),
    encodeURI$1 = e => encode(e, !0);
