import { encode } from './base64';
import constants from './constants';

import { createDialog } from './ui/dialog';
import { settings } from './modules';

function modifyUI() {
    let dialog = createDialog();
    if (/.*\/main\/.*/.test(location.href)) {
        document.querySelector('#mainHeader > div.page-header-name').innerHTML += ('+ E听说外挂V' + __VERSION).fontcolor('darkblue');
        let b = document.createElement('li');
        b.setAttribute('data-el-collection-item', '');
        b.classList.add('el-dropdown-menu__item');
        b.tabIndex = -1;
        b.role = 'menuitem';
        b.ariaDisabled = false;
        b.innerHTML = 'E听说外挂';
        b.addEventListener('click', e => {
            dialog.showModal();
        });
        document.querySelector('.el-dropdown-menu').append(b);
        if (settings.modules.修改用户名) {
            document.querySelector('#appView > section > aside > div > div.el-dropdown-link.side-menu-name.el-tooltip__trigger.el-tooltip__trigger').innerHTML = settings.modules.修改用户名_cfg.名字;
        }
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
                let [args, _] = argarr;
                let o = args.body;
                let decoded = JSON.parse(atob(args.body));
                if (decoded[0].r == constants.SyncV2URL && settings.modules.控分) {
                    console.log('我给你改分来喽☝️🤓', decoded[0].params.real_score, '->', parseFloat(decoded[0].params.question_type_score));
                    let detail = JSON.parse(decoded[0].params.score_detail);
                    detail.total_score = 5;
                    detail.real_score = parseFloat(decoded[0].params.question_type_score);
                    decoded[0].params.score_detail = JSON.stringify(detail);
                    decoded[0].params.real_score = parseFloat(decoded[0].params.question_type_score);
                    decoded[0].params.score = 5.0;
                    record[args.time] = encode(JSON.stringify(decoded));
                    console.log(record);
                }
                if (decoded[0].r == constants.SetUseTimeURL && settings.modules.控制时间) {
                    decoded[0].params.use_time = settings.modules.控制时间_cfg.时间;
                    record[args.time] = encode(JSON.stringify(decoded));
                }
                //#region 编码
                let encoded = encode(JSON.stringify(decoded));
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
