const debug = require('debug')('clientConfig');
const io = require('socket.io-client');
const feathers = require('@feathersjs/client');
const LocalStorage = require('node-localstorage').LocalStorage;

let localStorage = new LocalStorage('./scratch');

module.exports.prepareConfig = function prepareConfig({ host, port }, opts) {

    debug('prepareConfig::opts', opts);

    if (!host || !port)
        throw new Error('Config could\'nt be empty');

    const {
        nodeName,
        logStreams,
    } = opts;

    let querystring = 'type=agent';

    if (nodeName && logStreams) {
        querystring += '&nodeName=' + nodeName;
        querystring += '&logStreams=' + Object.keys(logStreams).join(',');
    }

    debug('querystring::opts ', querystring);
    // Socket.io is exposed as the `io` global.
    const socket = io(`${host}:${port}?${querystring}`, {

        // pooling transport options
        transportOptions: {
            polling: {
                extraHeaders: {
                    'Authorization': 'pooling'
                }
            }
        },
        // Send the authorization header in the initial connection request
        extraHeaders: {
            Authorization: 'websocket'
        }
    });

    // @feathersjs/client is exposed as the `feathers` global.
    const client = feathers()
        .configure(feathers.socketio(socket))
        //incase we later have to do authentication               
        .configure(
            feathers.authentication({
                storage: localStorage
            })
        );

    // event fired when socket connect or reconnected
    socket.on('connect', () => {
        debug('socket connected');
        // if (typeof opts == 'object')
        //     socket.emit('set', opts);
    });

    socket.on('reconnect', () => {
        debug('try to reconnect');
    });

    socket.on('reconnecting', () => {
        debug('reconnecting event fire');
    });

    return client;

}