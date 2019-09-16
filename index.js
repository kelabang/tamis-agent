const {
    prepareReadConfig
} = require('./lib/readerConfig');

async function main() {

    const nodeConfigs = await prepareReadConfig();

    // subscribe to all config file changes
    nodeConfigs.map(nodeConfig => {
        const transport = nodeConfig.listen();
        nodeConfig.on('ready');
        nodeConfig.on('renamed');
        nodeConfig.on('change', logline => {
            const {
                lastline,
                nodeName,
                name
            } = logline;
            console.log('send ================================>> send');
            transport.service('filter').create({
                text: lastline,
                nodename: nodeName,
                logstream: name,
            });
        });
    });

}

main();