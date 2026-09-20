const {
    calculateAdjustedScores,
    calculateReadingDimensions,
    calculateWordScore,
    normalizeMaxOffset,
    normalizePercentage,
    randomizePercentage
} = require('./score');

const XML_SCORE_ATTRIBUTES = ['accuracy_score', 'fluency_score', 'integrity_score', 'total_score'];

function toEngineScore(percentage) {
    return (normalizePercentage(percentage) / 20).toFixed(6);
}

function createReadingScoreProfile(percentage, maxOffset = 0, random = Math.random) {
    const normalizedPercentage = normalizePercentage(percentage);
    const normalizedMaxOffset = normalizeMaxOffset(maxOffset);
    return {
        basePercentage: normalizedPercentage,
        percentage: randomizePercentage(normalizedPercentage, normalizedMaxOffset, random),
        maxOffset: normalizedMaxOffset,
        dimensions: calculateReadingDimensions(normalizedPercentage, normalizedMaxOffset, random)
    };
}

function hasAttribute(tag, name) {
    return new RegExp(`\\s${name}\\s*=`, 'i').test(tag);
}

function setAttribute(tag, name, value) {
    const pattern = new RegExp(`(\\s${name}\\s*=\\s*)(["'])(.*?)(\\2)`, 'i');
    if (pattern.test(tag)) return tag.replace(pattern, `$1$2${value}$4`);
    return tag.replace(/\s*\/?\s*>$/, ending => ` ${name}="${value}"${ending}`);
}

function findPaperTag(xml) {
    const tags = String(xml).match(/<[A-Za-z_][\w:.-]*\b[^<>]*>/g) || [];
    return (
        tags.find(tag => XML_SCORE_ATTRIBUTES.every(name => hasAttribute(tag, name))) ||
        tags.find(tag => hasAttribute(tag, 'total_score') && XML_SCORE_ATTRIBUTES.slice(0, 3).some(name => hasAttribute(tag, name))) ||
        null
    );
}

function rewriteReadingScoreXml(xml, profile, random = Math.random) {
    if (typeof xml !== 'string' || !/<xml_result\b/i.test(xml) || !profile?.dimensions) {
        return { xml, paperUpdated: false, wordCount: 0, wordPercentages: [] };
    }

    const paperTag = findPaperTag(xml);
    if (!paperTag) return { xml, paperUpdated: false, wordCount: 0, wordPercentages: [] };

    const dimensionValues = {
        accuracy_score: toEngineScore(profile.dimensions.accuracy),
        fluency_score: toEngineScore(profile.dimensions.fluency),
        integrity_score: toEngineScore(profile.dimensions.integrity),
        total_score: toEngineScore(profile.percentage)
    };
    let updatedPaperTag = paperTag;
    for (const [name, value] of Object.entries(dimensionValues)) {
        updatedPaperTag = setAttribute(updatedPaperTag, name, value);
    }

    const wordPercentages = [];
    const wordBands = [];
    let updatedXml = xml.replace(paperTag, updatedPaperTag);
    updatedXml = updatedXml.replace(/<word\b[^<>]*>/gi, tag => {
        if (!hasAttribute(tag, 'total_score')) return tag;
        const word = calculateWordScore(profile.basePercentage ?? profile.percentage, profile.maxOffset ?? 0, random);
        wordPercentages.push(word.score);
        wordBands.push(word.band);
        return setAttribute(tag, 'total_score', toEngineScore(word.score));
    });

    return {
        xml: updatedXml,
        paperUpdated: true,
        wordCount: wordPercentages.length,
        wordPercentages,
        wordBands
    };
}

function scoreProfileKey(pathOrUrl) {
    const input = String(pathOrUrl || '').split(/[?#]/, 1)[0];
    const filename = input.split(/[\\/]/).pop() || '';
    try {
        return decodeURIComponent(filename).toLowerCase();
    } catch (error) {
        return filename.toLowerCase();
    }
}

function applyReadingScorePayload(params, profile) {
    if (!params || typeof params !== 'object' || !profile?.dimensions) return null;
    let detail = null;
    try {
        detail = typeof params.score_detail === 'string' ? JSON.parse(params.score_detail) : params.score_detail;
    } catch (error) {}
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) detail = null;

    const scores = calculateAdjustedScores(params.question_type_score, profile.percentage, params.graduation, 0);
    if (!scores) return null;

    params.score = scores.normalizedScore;
    params.real_score = scores.questionScore;
    if (detail) {
        // The 5.7.9 client gets these fields directly from XML attributes, so keep
        // their original six-decimal string representation in the API payload.
        detail.accuracy_score = toEngineScore(profile.dimensions.accuracy);
        detail.fluency_score = toEngineScore(profile.dimensions.fluency);
        detail.integrity_score = toEngineScore(profile.dimensions.integrity);
        detail.dimension_result = [profile.dimensions.accuracy, profile.dimensions.fluency, profile.dimensions.integrity];
        detail.total_score = scores.normalizedScore;
        detail.real_score = scores.questionScore;
        params.score_detail = JSON.stringify(detail);
    }
    return { detail, scores, dimensions: profile.dimensions };
}

function installReadingXmlWriteHook(win, getSettings, onProfile, random = Math.random) {
    function install() {
        const prototype = win.FileHelper?.prototype;
        const original = prototype?.writefile;
        if (typeof original !== 'function') return false;
        if (original.__etstoolboxReadingScores) return true;

        function wrappedWriteFile(path, content, callback) {
            const current = getSettings();
            if (current && /\.xml$/i.test(String(path || '')) && typeof content === 'string') {
                const profile = createReadingScoreProfile(current.percentage, current.maxOffset, random);
                const result = rewriteReadingScoreXml(content, profile, random);
                if (result.paperUpdated) {
                    content = result.xml;
                    onProfile?.({
                        key: scoreProfileKey(path),
                        path,
                        profile,
                        wordCount: result.wordCount,
                        wordBands: result.wordBands
                    });
                }
            }
            return original.call(this, path, content, callback);
        }
        wrappedWriteFile.__etstoolboxReadingScores = true;
        prototype.writefile = wrappedWriteFile;
        return true;
    }

    if (install()) return { stop() {} };
    const timer = win.setInterval(() => {
        if (install()) win.clearInterval(timer);
    }, 50);
    return { stop: () => win.clearInterval(timer) };
}

module.exports = {
    applyReadingScorePayload,
    createReadingScoreProfile,
    installReadingXmlWriteHook,
    rewriteReadingScoreXml,
    scoreProfileKey,
    setAttribute,
    toEngineScore
};
