let helperPromise;
let pendingText;
let writeInProgress = false;

function waitForNativeFileHelper() {
    if (helperPromise) return helperPromise;
    helperPromise = new Promise(resolve => {
        const timer = setInterval(() => {
            const exePath = window.cef?.message?.getExePath?.();
            if (!window.FileHelper || !exePath) return;
            clearInterval(timer);
            const helper = new window.FileHelper({ error_callback: error => console.error('答案终端写入失败：', error) });
            helper.init({}, () => resolve({ helper, exePath }));
        }, 100);
    });
    return helperPromise;
}

function formatAnswers(answers) {
    const lines = ['ETSToolbox 答案终端', `更新时间：${new Date().toLocaleString()}`, ''];
    if (!answers.length) {
        lines.push('当前题目数据中没有可显示的参考答案。');
    } else {
        answers.forEach((answer, index) => {
            lines.push(`${index + 1}. ${answer.label}`);
            lines.push(`   ${String(answer.value).replace(/\n/g, '\n   ')}`);
            lines.push('');
        });
    }
    return lines.join('\r\n');
}

async function flushWrites() {
    if (writeInProgress || pendingText === undefined) return;
    writeInProgress = true;
    const text = pendingText;
    pendingText = undefined;
    try {
        const { helper, exePath } = await waitForNativeFileHelper();
        const filePath = `${exePath}\\etstoolbox\\answers.txt`;
        await new Promise(resolve => helper.writefile(filePath, text, resolve));
    } catch (error) {
        console.error('答案终端写入失败：', error);
    } finally {
        writeInProgress = false;
        if (pendingText !== undefined) flushWrites();
    }
}

export function writeAnswersToConsole(answers) {
    pendingText = formatAnswers(Array.isArray(answers) ? answers : []);
    flushWrites();
}
