const chokidar = require('chokidar');
const debugFn = require('debug');
const fs = require('fs');
const { prepareConfig } = require('./clientConfig');

const OPTS_CHOKIDAR = {
    persistent: true,
    usePolling: true,
};


class NodeConfig {

    constructor(configObject) {

        this._validate(configObject);
        this._setter(configObject);

        this.nodeName = configObject.nodeName;
        this.console = debugFn(this.nodeName);

        const {
            server,
            nodeName,
        } = configObject;
        // this.console('constructor', configObject)

        this.__transportObject = prepareConfig(server, { nodeName });
        this.__watchObject = [];
        this.__currentFileSize = {};
    }

    listen() {
        this.console('listen');
        const logStreams = this['logStreams'];
        Object
            .keys(logStreams)
            .map(name => {
                const logStream = logStreams[name];
                // bind watch
                const watcher = chokidar.watch(logStream, OPTS_CHOKIDAR);
                // record size file
                logStream.map(path => {
                    this.__currentFileSize[path] = fs.statSync(path).size;
                })
                this.__watchObject.push({
                    name,
                    logStream,
                    watcher
                });
            });
        return this.__transportObject;
    }
    _readNewLogs(path, curr, prev, cb) {
        this.console('_readNewLogs', path);
        // Use file offset information to stream new log lines from file
        if (curr < prev) { return; }
        const rstream = fs.createReadStream(path, {
            encoding: 'utf8',
            start: prev,
            end: curr
        }
        );
        // Emit 'new_log' event for every captured log line
        return rstream.on('data', data => {
            const lines = data.split("\n");
            return Array
                .from(lines)
                .filter((line) => line)
                .map(line => {
                    // this.emit('new_log', line)
                    cb(line);
                });
        });
    }
    on(event, cb) {
        this.console(`bind on ${event}`)
        if (NodeConfig.events.indexOf(event) < 0)
            throw new Error(`Event ${event} not an available`);

        this.__watchObject.map((obj, i) => {
            const console = debugFn(`${this.nodeName}:${event}`);

            // log rotate handling
            if (event === 'renamed') {
                obj.watcher.close();
                obj.watcher = chokidar.watch(obj.logStream, OPTS_CHOKIDAR)
            }

            if (event === 'change') {

                return obj.watcher.on(event, path => {
                    console(`File ${path} - Event ${event}`);
                    let output = this._getter();
                    const { name } = obj;
                    // get last n of lines

                    fs.stat(path, (err, stat) => {
                        let currSize = this.__currentFileSize[path];
                        this._readNewLogs(path, stat.size, currSize, (line) => {
                            output = {
                                ...output,
                                name,
                                path,
                                lastline: line
                            }
                            if (typeof cb === 'function') cb(output);
                        });
                        return currSize = stat.size;
                    });


                });
            }
            return obj.watcher.on(event, path => {
                console(`File ${path || obj.logStream} - Event ${event}`);
                let output = this._getter();
                output = {
                    ...output
                }
                if (typeof cb === 'function') cb(output);
            });
        });
    }

    off() {
        this.console(`File Watch has Ended`);
        this.__watchObject.map(obj => obj.watcher.close());
    }

    _setter(objConfig) {
        const props = NodeConfig.props;
        props.map(prop => this[prop] = objConfig[prop]);
    }

    _getter() {
        const output = {};
        const props = NodeConfig.props;
        props.map(prop => output[prop] = this[prop]);
        return output;
    }

    _validate(objConfig) {
        const props = NodeConfig.props;
        const fail = [];
        props.map(prop => !objConfig[prop] && fail.push(prop));
        if (fail.length > 0) {
            throw Error('Config object must have [' + fail.join(', ') + '] properties ');
        }
    }

}

// static binding
NodeConfig.props = [
    'nodeName',
    'logStreams',
    'server'
];

NodeConfig.events = [
    'add',
    'change',
    'unlink',
    'ready',
    'error',
    'raw'
]

module.exports = NodeConfig;