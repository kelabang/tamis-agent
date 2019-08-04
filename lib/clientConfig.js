const debug = require('debug')('clientConfig');
const io = require('socket.io-client');
const feathers = require('@feathersjs/client');
const LocalStorage = require('node-localstorage').LocalStorage;

let localStorage = new LocalStorage('./scratch');

module.exports.prepareConfig = function prepareConfig({ host, port }, opts) {

    debug('prepareConfig');

    if (!host || !port)
        throw new Error('Config could\'nt be empty');

    // Socket.io is exposed as the `io` global.
    const socket = io(`${host}:${port}`, {

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
        if (typeof opts == 'object')
            socket.emit('set', opts);
    });

    socket.on('reconnect', () => {
        debug('try to reconnect');
    });

    socket.on('reconnecting', () => {
        debug('reconnecting event fire');
    });

    return client;

}