const {
    prepareConfig
} = require('./lib/readerConfig');

async function main() {

    const nodeConfigs = await prepareConfig();

    // subscribe to all config file changes
    nodeConfigs.map(nodeConfig => {
        const transport = nodeConfig.listen();
        nodeConfig.on('ready');
        nodeConfig.on('change', logline => {
            const {
                lastline,
                nodeName,
                name
            } = logline;
            transport.service('filter').create({
                text: lastline,
                nodename: nodeName,
                logstream: name,
            });
        });
    });

}

main();