const chokidar = require('chokidar');
const debugFn = require('debug');
const sys = require("sys");
const fs = require('fs');

function tailf(path, startByte = 0) {
    fs.stat(path, function (err, stats) {
        if (err) throw err;
        fs.createReadStream(path, {
            start: startByte,
            end: stats.size
        }).addListener("data", function (lines) {
            sys.puts(lines);
            startByte = stats.size;
        });
    });
}

class NodeConfig {

    constructor(configObject) {
        this._validate(configObject);
        this._setter(configObject)
        this.nodeName = configObject.nodeName;

        this.console = debugFn(this.nodeName);

        this.__watchObject = [];
    }

    listen() {
        this.console('listen');
        const logStreams = this['logStreams'];
        Object
            .keys(logStreams)
            .map(name => {

                const logStream = logStreams[name];

                // bind watch
                const watcher = chokidar.watch(logStream, { persistent: true });
                this.__watchObject.push({ name, logStream, watcher });


            });
    }

    on(event, cb) {
        if (NodeConfig.events.indexOf(event) < 0)
            throw new Error(`Event ${event} not an available`);

        this.__watchObject.map((obj, i) => {
            const console = debugFn(`${this.nodeName}:${event}`);
            if (event === 'change') {
                return obj.watcher.on(event, path => {
                    console(`File ${path} - Event ${event}`);
                    let output = this._getter();
                    let lastline = tailf(path);
                    output = {
                        ...output,
                        lastline
                    }
                    cb(output);
                });
            }
            return obj.watcher.on(event, path => {
                console(`File ${path || obj.logStream} - Event ${event}`);
                let output = this._getter();
                output = {
                    ...output
                }
                cb(output);
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
            throw Error('Config object must have ' + fail.join(',') + ' properties ');
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