const { extractReferenceAnswers } = require('./answers');

async function findLocalReferenceAnswers(apiBase, lookupTerms, fetchImpl = fetch) {
    const terms = Array.from(new Set((Array.isArray(lookupTerms) ? lookupTerms : []).filter(Boolean))).slice(0, 32);
    if (!apiBase || terms.length === 0) return [];

    const response = await fetchImpl(`${apiBase}/find_local_answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: terms.join('\n')
    });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`本地答案查询失败（HTTP ${response.status}）`);
    return extractReferenceAnswers(await response.json());
}

module.exports = { findLocalReferenceAnswers };
