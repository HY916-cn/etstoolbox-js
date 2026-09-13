function openAnswerConsole() {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('post', `${window._etb_api}/open_answer_console`);
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) resolve();
            else reject(new Error(`打开答案终端失败（HTTP ${request.status}）`));
        };
        request.onerror = () => reject(new Error('无法连接 ETSToolbox 本地服务'));
        request.send();
    });
}

module.exports = { openAnswerConsole };
