const { calculateReadingDimensions, calculateWordScore, normalizeMaxOffset, normalizePercentage } = require('./score');

const FIELD_SEPARATOR = String.fromCharCode(1);
const RESULT_PAGE_PATTERN = /(?:pc-listen-answer|pc-class-result-index)\.html$/i;
const MESSAGE_SOURCE = 'etstoolbox';
const SETTINGS_REQUEST = 'reading-settings-request';
const SETTINGS_RESPONSE = 'reading-settings-response';
const DEFAULT_API_BASE = 'http://localhost:8080/api';

function isReadingResultPage(locationLike) {
    const pathname = String(locationLike?.pathname ?? locationLike?.href ?? '').split(/[?#]/, 1)[0];
    return RESULT_PAGE_PATTERN.test(pathname);
}

function readControlSettings(win = window) {
    try {
        let apiBase = win._etb_api || (typeof _etb_api !== 'undefined' ? _etb_api : '');
        if (!apiBase) {
            try {
                apiBase = win.parent?._etb_api;
            } catch (error) {}
        }
        if (!apiBase) apiBase = DEFAULT_API_BASE;
        if (typeof win.XMLHttpRequest !== 'function') return null;
        const request = new win.XMLHttpRequest();
        request.open('get', `${apiBase}/read_config`, false);
        request.send();
        if (request.status && request.status >= 400) return null;
        const config = JSON.parse(request.responseText || request.response || '{}');
        if (!config?.modules?.控分) return null;
        const scoring = config.modules.控分_cfg || {};
        return {
            percentage: normalizePercentage(scoring['得分百分比（0-100）']),
            maxOffset: normalizeMaxOffset(scoring['随机偏移上限（百分点）'])
        };
    } catch (error) {
        console.error('[ETSToolbox 控分] 读取文本朗读设置失败：', error);
        return null;
    }
}

function getControlSettings(config) {
    if (!config?.modules?.控分) return null;
    const scoring = config.modules.控分_cfg || {};
    return {
        percentage: normalizePercentage(scoring['得分百分比（0-100）']),
        maxOffset: normalizeMaxOffset(scoring['随机偏移上限（百分点）'])
    };
}

function installReadingSettingsProvider(win = window, getConfig) {
    const onMessage = event => {
        if (event.data?.source !== MESSAGE_SOURCE || event.data?.type !== SETTINGS_REQUEST) return;
        const target = event.source;
        if (!target || typeof target.postMessage !== 'function') return;
        target.postMessage(
            {
                source: MESSAGE_SOURCE,
                type: SETTINGS_RESPONSE,
                settings: getControlSettings(getConfig())
            },
            '*'
        );
    };
    win.addEventListener('message', onMessage);
    return () => win.removeEventListener?.('message', onMessage);
}

function createReadingSettingsClient(win = window) {
    let settings = readControlSettings(win);
    const onMessage = event => {
        if (event.data?.source !== MESSAGE_SOURCE || event.data?.type !== SETTINGS_RESPONSE) return;
        const incoming = event.data.settings;
        settings = incoming
            ? {
                  percentage: normalizePercentage(incoming.percentage),
                  maxOffset: normalizeMaxOffset(incoming.maxOffset)
              }
            : null;
    };
    const request = () => {
        try {
            win.parent?.postMessage({ source: MESSAGE_SOURCE, type: SETTINGS_REQUEST }, '*');
        } catch (error) {}
    };
    win.addEventListener('message', onMessage);
    request();
    return {
        getSettings: () => settings,
        request,
        stop: () => win.removeEventListener?.('message', onMessage)
    };
}

function isWordResult(parts, scoreIndex, totalIndex) {
    if (parts.length <= totalIndex || !/[A-Za-z0-9\u00c0-\u024f\u4e00-\u9fff]/.test(parts[0])) return false;
    const score = Number(parts[scoreIndex]);
    const total = Number(parts[totalIndex]);
    return Number.isFinite(score) && score >= 0 && score <= 100 && Number.isFinite(total) && total > 0;
}

function randomizeWordArguments(args, percentage, maxOffset, scoreIndex, totalIndex, random = Math.random) {
    return args.map(item => {
        if (typeof item !== 'string') return item;
        const parts = item.split(FIELD_SEPARATOR);
        if (!isWordResult(parts, scoreIndex, totalIndex)) return item;
        parts[scoreIndex] = String(calculateWordScore(percentage, maxOffset, random).score);
        parts[totalIndex] = '100';
        return parts.join(FIELD_SEPARATOR);
    });
}

function startReadingResultControl(win = window, options = {}) {
    if (!isReadingResultPage(win.location)) return { stop() {}, check() {} };

    const settingsClient = options.getSettings ? null : createReadingSettingsClient(win);
    const getSettings = options.getSettings || settingsClient.getSettings;
    const random = options.random || Math.random;
    let controller;
    let settingsSignature = '';

    function getController() {
        const settings = getSettings();
        if (!settings) return null;
        const signature = `${settings.percentage}:${settings.maxOffset}`;
        if (signature !== settingsSignature) {
            settingsSignature = signature;
            controller = {
                ...settings,
                dimensions: calculateReadingDimensions(settings.percentage, settings.maxOffset, random)
            };
        }
        return controller;
    }

    function wrap(name, transform) {
        const original = win[name];
        if (typeof original !== 'function' || original.__etstoolboxReadingResult) return;
        function wrapped(...args) {
            const current = getController();
            return original.apply(this, current ? transform(args, current) : args);
        }
        wrapped.__etstoolboxReadingResult = true;
        win[name] = wrapped;
    }

    function check() {
        if (!getSettings()) settingsClient?.request();
        wrap('showScoreDetail', (args, current) => [
            current.dimensions.accuracy,
            current.dimensions.fluency,
            current.dimensions.integrity,
            ...args.slice(3)
        ]);
        wrap('showScoreDetail_1', (args, current) => [
            current.dimensions.accuracy,
            current.dimensions.fluency,
            current.dimensions.integrity,
            ...args.slice(3)
        ]);

        for (const name of ['showEssay', 'showEssay_oc']) {
            wrap(name, (args, current) => randomizeWordArguments(args, current.percentage, current.maxOffset, 3, 4, random));
        }
        for (const name of ['showEssay_2', 'showPhrase_2', 'showPhrase_OldStruct']) {
            wrap(name, (args, current) => randomizeWordArguments(args, current.percentage, current.maxOffset, 5, 6, random));
        }
        for (const name of ['showPhrase', 'showPhrase_oc']) {
            wrap(name, (args, current) => randomizeWordArguments(args, current.percentage, current.maxOffset, 3, 4, random));
        }
    }

    check();
    const timer = win.setInterval(check, 100);
    const stop = () => {
        win.clearInterval(timer);
        settingsClient?.stop();
    };
    win.addEventListener('unload', stop, { once: true });
    return { check, stop };
}

module.exports = {
    createReadingSettingsClient,
    getControlSettings,
    installReadingSettingsProvider,
    isReadingResultPage,
    isWordResult,
    randomizeWordArguments,
    readControlSettings,
    startReadingResultControl
};
