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
    const answerKeys = new Set([
        'answer',
        'right_answer',
        'rightAnswer',
        'correct_answer',
        'correctAnswer',
        'reference_answer',
        'referenceAnswer',
        'answer_text',
        'answerText',
        'standard_answer',
        'standardAnswer'
    ]);

    function add(label, value) {
        const text = cleanText(value);
        if (!text) return;
        const normalizedLabel = cleanText(label) || `答案 ${answers.length + 1}`;
        const key = `${normalizedLabel}\u0000${text}`;
        if (seen.has(key)) return;
        seen.add(key);
        answers.push({ label: normalizedLabel, value: text });
    }

    function addAnswerValue(label, value) {
        value = parseData(value);
        if (value == null) return;
        if (Array.isArray(value)) {
            const primitiveValues = value.map(item => cleanText(item?.value ?? item?.ai ?? item?.text ?? item)).filter(Boolean);
            if (primitiveValues.length === value.length) add(label, primitiveValues.join('\n或：'));
            else value.forEach((item, index) => addAnswerValue(`${label} · ${index + 1}`, item));
            return;
        }
        if (typeof value === 'object') {
            const direct = value.value ?? value.ai ?? value.text ?? value.content;
            if (direct != null) add(label, direct);
            else Object.entries(value).forEach(([key, child]) => addAnswerValue(`${label} · ${key}`, child));
            return;
        }
        add(label, value);
    }

    function answerLabel(value, context) {
        const order = value.xt_xh ?? value.xth ?? value.xh ?? value.question_order ?? value.order;
        const question = cleanText(value.xt_nr ?? value.ask ?? value.question_text ?? value.question ?? value.title);
        if (question && order != null) return `第 ${order} 题 · ${question}`;
        if (question) return question;
        if (order != null) return `第 ${order} 题`;
        return context || `答案 ${answers.length + 1}`;
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
                const samples = value.std.map(item => cleanText(item?.value ?? item?.ai ?? item)).filter(Boolean);
                if (samples.length) add(cleanText(value.ask) || context || '参考作答', samples.join('\n或：'));
            }
        }

        const structureType = cleanText(value.structure_type);
        const structureInfo = parseData(value.info);
        if (structureInfo && typeof structureInfo === 'object' && !Array.isArray(structureInfo)) {
            if (structureType === 'collector.read') {
                add('模仿朗读参考文本', structureInfo.ai ?? structureInfo.value);
            } else if (structureType === 'collector.repeat') {
                add('跟读参考文本', structureInfo.ai ?? structureInfo.value);
            } else if (structureType === 'collector.word') {
                const sentence = cleanText(structureInfo.value_pf ?? structureInfo.value_bz ?? structureInfo.value).replace(/^ets_th\d+\s*/i, '');
                add('朗读句子参考文本', sentence);
            }
        }

        if (!handledByParent) {
            for (const key of answerKeys) {
                if (value[key] != null) addAnswerValue(answerLabel(value, context), value[key]);
            }
        }

        Object.entries(value).forEach(([key, child]) => {
            if (key === 'xtlist' || key === 'std' || answerKeys.has(key) || key === 'user_answer' || key === 'userAnswer') return;
            const childContext = value.ask ? cleanText(value.ask) : context;
            visit(child, childContext, handledByParent || key === 'xxlist');
        });
    }

    visit(input);
    return answers.slice(0, 500);
}

module.exports = { cleanText, extractReferenceAnswers };
