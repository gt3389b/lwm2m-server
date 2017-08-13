const debug = require('debug');

module.exports = function(namespace){
    const _debug = debug(`lwm2m-server:${namespace}`)
    _debug.log = console.info.bind(console);
    return _debug;
};

/*
const makeDebugger = (namespace) => {
    var log = debug(`lwm2m-server:${namespace}`);
    log.log = console.info.bind(console);
    debug.log = console.info.bind(console);
    return log
};

module.exports = makeDebugger;
*/