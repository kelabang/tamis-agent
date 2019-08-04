const { join } = require('path');
const fs = require('fs');
const { readdir, stat } = fs;
const { promisify } = require('util');

const statP = promisify(stat);
const readdirP = promisify(readdir);

const NodeConfig = require('./NodeConfig');

const { config: {
    ext: rootConfigExt,
    path: rootConfigPath
} } = require('./../root.conf');

async function rreaddir(dir, allFiles = []) {
    const files = (await readdirP(dir)).filter(item => item.includes(rootConfigExt) > 0).map(f => join(dir, f));
    allFiles.push(...files);
    await Promise.all(
        files.map(
            async f => (await statP(f)).isDirectory() && rreaddir(f, allFiles)
        )
    )
    return allFiles;
}

async function retrieveAllConfig(path) {
    return await rreaddir(path);
}

function readAllConfig(paths) {

    const cwd = process.cwd();

    const nodeConfigs = paths
        .map(path => {
            const _path = `${cwd}/${path}`;
            return require(_path);
        })
        .map(objConfig => new NodeConfig(objConfig));

    return nodeConfigs;
}

module.exports.prepareConfig = async function prepareConfig() {

    // locate all config path
    const pathAllConfig = await retrieveAllConfig(rootConfigPath);

    // read all config path and retrieve log
    const nodeConfigs = readAllConfig(pathAllConfig);

    return nodeConfigs;
}