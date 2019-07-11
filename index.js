const { join } = require('path');
const fs = require('fs');
const { readdir, stat } = fs;

const { promisify } = require('util');

const rootConfig = require('./root.conf');

console.log('rootConfig=', rootConfig);

const readdirP = promisify(readdir);
const statP = promisify(stat);

async function rreaddir(dir, allFiles = []) {
    const files = (await readdirP(dir)).filter(item => item.includes('.conf') > 0).map(f => join(dir, f));
    allFiles.push(...files);
    await Promise.all(
        files.map(
            async f => (await statP(f)).isDirectory() && rreaddir(f, allFiles)
        )
    )
    return allFiles;
}

async function retrieveAllConfig(config) {
    
    const {
        ext, 
        path
    } = config;

    const data = await rreaddir(path);

    return data;

}

const pathAllConfig = retrieveAllConfig(rootConfig.config);

console.log('pathAllConfig ', pathAllConfig);