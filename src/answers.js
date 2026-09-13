function cleanText(value) {
    return String(value ?? '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s*\n\s*/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

function parseData(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return value;
    }
}

function extractReferenceAnswers(input) {
    const answers = [];
    const seen = new Set();

    function add(label, value) {
        const text = cleanText(value);
        if (!text) return;
        const normalizedLabel = cleanText(label) || `答案 ${answers.length + 1}`;
        const key = `${normalizedLabel}\u0000${text}`;
        if (seen.has(key)) return;
        seen.add(key);
        answers.push({ label: normalizedLabel, value: text });
    }

    function visit(value, context = '', handledByParent = false) {
        value = parseData(value);
        if (!value || typeof value !== 'object') return;

        if (Array.isArray(value)) {
            value.forEach(item => visit(item, context, handledByParent));
            return;
        }

        if (Array.isArray(value.xtlist)) {
            value.xtlist.forEach((item, index) => {
                const order = item.xt_xh ?? item.xh ?? index + 1;
                const answer = cleanText(item.answer);
                const option = Array.isArray(item.xxlist) ? item.xxlist.find(candidate => cleanText(candidate.xx_mc) === answer) : undefined;
                const optionText = cleanText(option?.xx_nr);
                const question = cleanText(item.xt_nr)
                    .replace(/\{\{[^}]+\}\}/g, '')
                    .trim();
                const label = question ? `第 ${order} 题 · ${question}` : `第 ${order} 题`;
                add(label, optionText ? `${answer}：${optionText}` : answer);
            });
        }

        if (Array.isArray(value.std)) {
            const ordered = value.std.some(item => item && typeof item === 'object' && (item.xth != null || item.xh != null));
            if (ordered) {
                value.std.forEach((item, index) => add(`第 ${item?.xth ?? item?.xh ?? index + 1} 题`, item?.value ?? item?.ai));
            } else {
                const samples = value.std
                    .map(item => cleanText(item?.value ?? item?.ai ?? item))
                    .filter(Boolean)
                    .slice(0, 3);
                if (samples.length) add(cleanText(value.ask) || context || '参考作答', samples.join('\n或：'));
            }
        }

        if (!handledByParent && value.answer != null && !Array.isArray(value.answer)) {
            add(context || (value.xh != null ? `第 ${value.xh} 题` : '参考答案'), value.answer);
        }

        Object.entries(value).forEach(([key, child]) => {
            if (key === 'xtlist' || key === 'std' || key === 'answer' || key === 'user_answer') return;
            const childContext = value.ask ? cleanText(value.ask) : context;
            visit(child, childContext, handledByParent || key === 'xxlist');
        });
    }

    visit(input);
    return answers.slice(0, 100);
}

module.exports = { cleanText, extractReferenceAnswers };
