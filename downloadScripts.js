const scripts = require("./scripts.json");
const prettier = require("prettier")
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

scripts.forEach(async (s) => {
    let data = await (await fetch(s)).text();
    let i = s.lastIndexOf('/')
    var name = s.substr(i + 1).split("?")[0];
    fs.writeFileSync("./scripts/raw/" + name, data);
    exec("npx tsdmake -s " + "./scripts/raw/" + name)
})