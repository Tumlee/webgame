import * as fs from 'fs';

export function writeFile(filename, content) {
    fs.writeFile(filename, content, err => {
        if (err) {
            console.error({fileWriteError: err});
            return
        }
    });
}

export function readFile(filename) {
    return fs.readFileSync(filename, 'utf8');
}

export function catalogDirectory(path, extension) {
    let dotExt = `.${extension}`;
    let catalog = {};
    fs.readdirSync(path)
        .filter(file => file.toLowerCase().endsWith(dotExt))
        .map(file => ({
            name: file.substring(0, file.length - dotExt.length),
            content: readFile(`${path}/${file}`)
        }))
        .forEach(item => catalog[item.name] = item.content);

    return catalog;
}