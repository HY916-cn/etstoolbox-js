import { encode } from './base64';
import constants from './constants';

import { createDialog } from './ui/dialog';
import './answerBridge';
import './autoFlow';
import { settings } from './modules';
const { getControlSettings, installReadingSettingsProvider } = require('./readingResult');
const {
    applyReadingScorePayload,
    createReadingScoreProfile,
    installReadingXmlWriteHook,
    scoreProfileKey
} = require('./readingScoreDetail');
const { isListeningSpeakingLocation } = require('./scope');

installReadingSettingsProvider(window, () => settings);
const readingScoreProfiles = new Map();

function getReadingControlSettings() {
    if (!isListeningSpeakingLocation(window.location)) return null;
    return getControlSettings(settings);
}

installReadingXmlWriteHook(window, getReadingControlSettings, entry => {
    if (entry.key) readingScoreProfiles.set(entry.key, entry.profile);
    const bands = (entry.wordBands || []).reduce((counts, band) => {
        counts[band] += 1;
        return counts;
    }, { green: 0, orange: 0, red: 0 });
    console.info(
        `[ETSToolbox 控分] 已改写评测 XML：朗读指标 3 项，逐词得分 ${entry.wordCount} 项，` +
            `绿/橙/红 ${bands.green}/${bands.orange}/${bands.red}`
    );
});

function modifyUI() {
    let dialog = createDialog();
    if (/.*\/main\/.*/.test(location.href)) {
        document.querySelector('#mainHeader > div.page-header-name').innerHTML += (' + ETSToolbox V' + __VERSION).fontcolor('darkblue');
        let b = document.createElement('li');
        b.setAttribute('data-el-collection-item', '');
        b.classList.add('el-dropdown-menu__item');
        b.tabIndex = -1;
        b.role = 'menuitem';
        b.ariaDisabled = false;
        b.innerHTML = 'ETSToolbox';
        b.addEventListener('click', e => {
            dialog.showModal();
        });
        document.querySelector('.el-dropdown-menu').append(b);
    }
}

window.addEventListener('load', () => {
    modifyUI();
});

window.components = {};

window.Proxy = new Proxy(Proxy, {
    construct(target, argArray, newTarget) {
        let component = argArray[0]?._;
        if (component) {
            window.components[component.uid] = component.vnode?.el;
        }
        return Reflect.construct(target, argArray, newTarget);
    }
});
window.addEventListener('DOMContentLoaded', async () => {
    let record = {};
    XMLHttpRequest.prototype.send = new Proxy(XMLHttpRequest.prototype.send, {
        /**
         *
         * @param {typeof XMLHttpRequest.prototype.send} target
         * @param {XMLHttpRequest} req
         * @param {[string]} argarr
         */
        apply(target, req, argarr) {
            if (argarr[0]) {
                try {
                    let data = JSON.parse(argarr[0]);
                    if (record[data?.head?.time_second]) {
                        console.log('修改：', record[data.head.time_second]);
                        data.body = record[data.head.time_second];
                    }
                    argarr[0] = JSON.stringify(data);
                } catch (e) {}
            }
            return target.apply(req, argarr);
        }
    });
    let hack = () => {
        EtsHelper.prototype.encode_api_body = new Proxy(EtsHelper.prototype.encode_api_body, {
            /**
             *
             * @param {Function} target
             * @param {*} thisarg
             * @param {*} argarr
            */
            apply(target, thisarg, argarr) {
                const [args] = argarr;
                if (!isListeningSpeakingLocation(window.location)) return target.apply(thisarg, argarr);
                const decoded = JSON.parse(atob(args.body));
                const requests = Array.isArray(decoded) ? decoded : [decoded];
                let modified = false;
                for (const request of requests) {
                    if (request.r == constants.SyncV2URL && settings.modules.控分) {
                        const params = request.params;
                        const basePercentage = settings.modules.控分_cfg['得分百分比（0-100）'];
                        const maxOffset = settings.modules.控分_cfg['随机偏移上限（百分点）'];
                        const profileKey = scoreProfileKey(params.detail_file_url);
                        const linkedProfile = profileKey ? readingScoreProfiles.get(profileKey) : null;
                        const profile = linkedProfile || createReadingScoreProfile(basePercentage, maxOffset);
                        const result = applyReadingScorePayload(params, profile);
                        if (result) {
                            console.info('[ETSToolbox 控分] /m/audio/sync-v2 提交摘要：', {
                                score: params.score,
                                real_score: params.real_score,
                                question_type_score: params.question_type_score,
                                total_score: result.detail.total_score,
                                accuracy_score: result.detail.accuracy_score,
                                fluency_score: result.detail.fluency_score,
                                integrity_score: result.detail.integrity_score,
                                percentage: result.scores.percentage,
                                xml_linked: Boolean(linkedProfile)
                            });
                            if (profileKey) readingScoreProfiles.delete(profileKey);
                            modified = true;
                        }
                    }
                    if (request.r == constants.SetUseTimeURL && settings.modules.作业提交用时) {
                        request.params.use_time = settings.modules.作业提交用时_cfg['时间（秒）'];
                        modified = true;
                    }
                }
                if (modified) record[args.time] = encode(JSON.stringify(decoded));
                //#region 编码
                const encoded = encode(JSON.stringify(decoded));
                argarr[0].body = encoded;
                return target.apply(thisarg, argarr);
                //#endregion 编码
            }
        });
    };
    if (window.EtsHelper) {
        hack();
    } else {
        new Promise((resolve, reject) => {
            let id = setInterval(() => {
                if (window.EtsHelper) {
                    hack();
                    clearInterval(id);
                    resolve();
                }
            });
        });
    }
    console.log();
});
