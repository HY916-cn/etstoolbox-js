const LISTENING_SPEAKING_ROUTES = [
    '/mockExamDetail',
    '/modelTestMode',
    '/listeningSpeakingSynchronousDetail',
    '/listeningSpeakingSynchronousComprehensive',
    '/speakListenLesson',
    '/textInfo',
    '/readSentence',
    '/readAloud'
];

function getLocationText(locationObject) {
    return [locationObject?.pathname, locationObject?.hash, locationObject?.href].filter(Boolean).join(' ');
}

function isListeningSpeakingLocation(locationObject) {
    const text = getLocationText(locationObject);
    return LISTENING_SPEAKING_ROUTES.some(route => new RegExp(`${route}(?:[/?#_]|$)`).test(text));
}

module.exports = { LISTENING_SPEAKING_ROUTES, getLocationText, isListeningSpeakingLocation };
