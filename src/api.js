export function readConfig() {
    let xhr = new XMLHttpRequest();
    xhr.open('get', _etb_api + '/read_config', false);
    xhr.send();
    if (xhr.responseText == 'error') return {};
    else return JSON.parse(xhr.response);
}

export function writeConfig(c) {
    let xhr = new XMLHttpRequest();
    xhr.open('post', _etb_api + '/write_config');
    return xhr.send(JSON.stringify(c));
}
