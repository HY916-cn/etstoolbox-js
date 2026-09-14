function cleanText(value) {
    return String(value ?? '')
        .replace(/<\/?br\s*\/?>/gi, '\n')
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

function extractAnswerLookupTerms(input) {
    const terms = [];
    const seen = new Set();
    const preferredKeys = new Set([
        'ask',
        'content',
        'question',
        'question_content',
        'question_text',
        'questionText',
        'sentence',
        'stem',
        'xt_nr',
        'hint'
    ]);

    function addTerm(value) {
        const text = cleanText(value);
        if (!text) return;

        text.split(/\n+/).forEach(line => {
            const normalized = line
                .replace(/^\s*ets_th\d+\s*/i, '')
                .replace(/^\s*\d+\s*[.)、．]\s*/, '')
                .trim();
            const withoutChoices = normalized.replace(/\s*[（(][^()（）]{0,500}[)）]\s*$/, '').trim();

            [withoutChoices, normalized].forEach(candidate => {
                const compactLength = candidate.replace(/\s/g, '').length;
                if (compactLength < 6 || candidate.length > 512 || seen.has(candidate)) return;
                seen.add(candidate);
                terms.push(candidate);
            });
        });
    }

    function visit(value, key = '') {
        value = parseData(value);
        if (value == null) return;
        if (typeof value === 'string') {
            if (preferredKeys.has(key)) addTerm(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(item => visit(item, key));
            return;
        }
        if (typeof value !== 'object') return;
        Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
    }

    visit(input);
    return terms.slice(0, 32);
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
        'answers',
        'model_answer',
        'modelAnswer',
        'pranswer',
        'reference',
        'standard_answer',
        'standardAnswer',
        'std_answer',
        'stdAnswer'
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

    function answerLabel(value, context, orderIsZeroBased = false) {
        const explicitOrder = value.xt_xh ?? value.xth ?? value.xh ?? value.question_order;
        const order =
            explicitOrder ??
            (value.order != null && orderIsZeroBased && Number.isFinite(Number(value.order)) ? Number(value.order) + 1 : value.order);
        const question = cleanText(
            value.xt_nr ??
                value.ask ??
                value.question_text ??
                value.questionText ??
                value.question_content ??
                value.question ??
                value.stem ??
                value.content ??
                value.title
        );
        if (question && order != null) return `第 ${order} 题 · ${question}`;
        if (question) return question;
        if (order != null) return `第 ${order} 题`;
        return context || `答案 ${answers.length + 1}`;
    }

    function optionAnswer(value, answer) {
        if (typeof answer !== 'string' && typeof answer !== 'number') return answer;
        const answerText = cleanText(answer);
        const options = value.xxlist ?? value.choose ?? value.options ?? value.choices ?? value.option_list ?? value.optionList;
        if (!Array.isArray(options)) return answer;
        const option = options.find(item => {
            const key = item?.xx_mc ?? item?.option ?? item?.key ?? item?.label ?? item?.id;
            return cleanText(key) === answerText;
        });
        const text = cleanText(option?.xx_nr ?? option?.value ?? option?.text ?? option?.content ?? option?.name);
        return text && text !== answerText ? `${answerText}：${text}` : answer;
    }

    function visit(value, context = '', handledByParent = false, orderIsZeroBased = false) {
        value = parseData(value);
        if (!value || typeof value !== 'object') return;

        if (Array.isArray(value)) {
            value.forEach(item => visit(item, context, handledByParent, orderIsZeroBased));
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
                const question = cleanText(value.ask).replace(/^ets_th\d+\s*/i, '');
                if (samples.length) add(question || context || '参考作答', samples.join('\n或：'));
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
                if (value[key] != null) addAnswerValue(answerLabel(value, context, orderIsZeroBased), optionAnswer(value, value[key]));
            }
        }

        Object.entries(value).forEach(([key, child]) => {
            if (key === 'xtlist' || key === 'std' || answerKeys.has(key) || key === 'user_answer' || key === 'userAnswer') return;
            const childContext = value.ask ? cleanText(value.ask) : context;
            visit(child, childContext, handledByParent || key === 'xxlist', key === 'info');
        });
    }

    visit(input);
    return answers.slice(0, 500);
}

module.exports = { cleanText, extractAnswerLookupTerms, extractReferenceAnswers };
