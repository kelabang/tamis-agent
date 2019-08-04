const rln = require('read-last-lines');
const LINES = 100;
module.exports = function tailf(path, cb) {
    rln.read(path, LINES)
        .then((lines) => {
            if (typeof cb == 'function') cb(lines)
        });
}