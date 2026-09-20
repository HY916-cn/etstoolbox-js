const test = require('node:test');
const assert = require('node:assert/strict');
const {
    applyReadingScorePayload,
    createReadingScoreProfile,
    installReadingXmlWriteHook,
    rewriteReadingScoreXml,
    scoreProfileKey,
    toEngineScore
} = require('../src/readingScoreDetail');

const sampleXml =
    '<xml_result><read_chapter><rec_paper>' +
    '<read_chapter accuracy_score="0.000000" fluency_score="0.000000" integrity_score="0.000000" total_score="0.000000">' +
    '<sentence><word content="one" total_score="0.000000"/><word content="two" total_score="1.000000"/>' +
    '<word content="three" total_score="2.000000"/></sentence>' +
    '</read_chapter></rec_paper></read_chapter></xml_result>';

test('converts a percentage to the engine zero-through-five scale', () => {
    assert.equal(toEngineScore(91), '4.550000');
    assert.equal(toEngineScore(100), '5.000000');
});

test('creates one question profile with distinct reading dimensions', () => {
    const values = [1, 0, 0, 0];
    const profile = createReadingScoreProfile(91, 5, () => values.shift() ?? 0);
    assert.deepEqual(profile, {
        basePercentage: 91,
        percentage: 96,
        maxOffset: 5,
        dimensions: { accuracy: 86, fluency: 87, integrity: 88 }
    });
});

test('rewrites persisted XML totals, dimensions, and every word score', () => {
    const values = [0.5, 0.1, 0.25, 0.5, 0.95, 0.1, 0.5, 0.5, 0.95, 0.9, 0.5];
    const profile = {
        basePercentage: 90,
        percentage: 92,
        maxOffset: 5,
        dimensions: { accuracy: 87, fluency: 91, integrity: 94 }
    };
    const result = rewriteReadingScoreXml(sampleXml, profile, () => values.shift());

    assert.equal(result.paperUpdated, true);
    assert.equal(result.wordCount, 3);
    assert.deepEqual(result.wordPercentages, [85, 70, 30]);
    assert.deepEqual(result.wordBands, ['green', 'orange', 'red']);
    assert.match(result.xml, /accuracy_score="4\.350000"/);
    assert.match(result.xml, /fluency_score="4\.550000"/);
    assert.match(result.xml, /integrity_score="4\.700000"/);
    assert.match(result.xml, /<read_chapter[^>]*total_score="4\.600000"/);
    assert.deepEqual(
        [...result.xml.matchAll(/<word\b[^>]*total_score="([^"]+)"/g)].map(match => match[1]),
        ['4.250000', '3.500000', '1.500000']
    );
});

test('leaves unrelated XML and text untouched', () => {
    assert.deepEqual(rewriteReadingScoreXml('<config total_score="0"/>', {}, () => 0), {
        xml: '<config total_score="0"/>',
        paperUpdated: false,
        wordCount: 0,
        wordPercentages: []
    });
});

test('writes a consistent sync-v2 score payload', () => {
    const params = {
        question_type_score: 4,
        graduation: '0.125',
        real_score: 0,
        score: 0,
        score_detail: JSON.stringify({ category: 'read_chapter', total_score: 0 })
    };
    const result = applyReadingScorePayload(params, {
        percentage: 90,
        dimensions: { accuracy: 87, fluency: 91, integrity: 94 }
    });

    assert.deepEqual(result.scores, { percentage: 90, questionScore: 3.63, normalizedScore: 4.5 });
    assert.equal(params.real_score, 3.63);
    assert.equal(params.score, 4.5);
    assert.deepEqual(JSON.parse(params.score_detail), {
        category: 'read_chapter',
        total_score: 4.5,
        accuracy_score: '4.350000',
        fluency_score: '4.550000',
        integrity_score: '4.700000',
        dimension_result: [87, 91, 94],
        real_score: 3.63
    });
});

test('writes top-level sync-v2 scores when score detail is unavailable', () => {
    for (const scoreDetail of [undefined, 'not-json', []]) {
        const params = {
            question_type_score: 6,
            real_score: 0,
            score: 0,
            score_detail: scoreDetail
        };
        const result = applyReadingScorePayload(params, {
            percentage: 90,
            dimensions: { accuracy: 87, fluency: 91, integrity: 94 }
        });

        assert.equal(result.detail, null);
        assert.equal(params.real_score, 5.4);
        assert.equal(params.score, 4.5);
        assert.equal(params.score_detail, scoreDetail);
    }
});

test('links local XML paths and submitted detail URLs by filename', () => {
    assert.equal(scoreProfileKey('C:\\Temp\\record_123.xml'), 'record_123.xml');
    assert.equal(scoreProfileKey('https://cdn.example/xml/Record_123.xml?x=1'), 'record_123.xml');
});

test('hooks FileHelper writes before the XML file is uploaded', () => {
    const writes = [];
    const profiles = [];
    function FileHelper() {}
    FileHelper.prototype.writefile = function (path, content, callback) {
        writes.push({ path, content });
        callback?.('ok');
    };
    const win = { FileHelper, setInterval() {}, clearInterval() {} };
    const randomValues = [0.5, 0, 0, 0, 0.5, 0.5, 0.5];
    installReadingXmlWriteHook(
        win,
        () => ({ percentage: 90, maxOffset: 5 }),
        entry => profiles.push(entry),
        () => randomValues.shift() ?? 0.5
    );

    new FileHelper().writefile('C:\\Temp\\record.xml', sampleXml, () => {});
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].key, 'record.xml');
    assert.equal(profiles[0].wordCount, 3);
    assert.match(writes[0].content, /total_score="4\.500000"/);
    assert.doesNotMatch(writes[0].content, /<word[^>]*total_score="0\.000000"/);
});
