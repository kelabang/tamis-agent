const chokidar = require('chokidar');
const debugFn = require('debug');
const Diff = require('diff');
const tailf = require('./utils/tailf');
const { prepareConfig } = require('./clientConfig');


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
        this.console('constructor', configObject)

        this.__transportObject = prepareConfig(server, { nodeName });
        this.__watchObject = [];
    }

    _buildName(logStream) {

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
                this.__watchObject.push({
                    name,
                    logStream,
                    watcher,
                });
            });
        return this.__transportObject;
    }

    on(event, cb) {
        if (NodeConfig.events.indexOf(event) < 0)
            throw new Error(`Event ${event} not an available`);

        this.__watchObject.map((obj, i) => {
            const console = debugFn(`${this.nodeName}:${event}`);
            if (event === 'change') {
                // set temporary state of file 
                global.__old_state = {};

                const { logStream } = obj;

                // set initial file state for diff later
                logStream.map(path => {
                    tailf(path, lastline => {
                        global.__old_state[path] = lastline;
                    });
                });

                return obj.watcher.on(event, path => {
                    console(`File ${path} - Event ${event}`);
                    let output = this._getter();
                    const { name } = obj;
                    // get last n of lines
                    tailf(path, lastline => {

                        // diffing the last line with current changes
                        const changes = Diff.diffChars(lastline, global.__old_state[path]);

                        const [prev, next] = changes;
                        global.__old_state[path] = lastline;
                        console('::-- added');
                        console(next.value);

                        // let _lastline = lastline.split('\n').filter(function (e) { return e === 0 || e }).pop();
                        output = {
                            ...output,
                            name,
                            path,
                            lastline: next.value
                        }
                        if (typeof cb === 'function') cb(output);
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