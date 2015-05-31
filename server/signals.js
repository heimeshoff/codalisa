var child_process = require('child_process');
var _             = require('lodash');


var signals = {};
var on_signals = null;


function fire() {
    if (on_signals) {
        console.log(signals);
        on_signals(signals);
    }
}

function mergeAndFire(ss) {
    for (var k in ss) {
        signals[k] = Number(ss[k]);
    }
    fire();
}

/**
 * Start the ev3 python script and raise events for the STDOUT
 */
module.exports = {
    start: function(callback) {
        on_signals = callback;

        var child = child_process.spawn('../ev3/read-ev3', [], {
                stdio: 'pipe'
        });

        console.log('EV3 process started');

        child.stderr.on('data', function(data) {
            console.warn(data);
        });

        child.stdout.on('data', function(data) {
            var lines = _.filter(
                    data.toString().split('\n'),
                    function(x) { return x; });

            if (lines.length > 0) {
                var obj = JSON.parse(lines[lines.length - 1]);
                mergeAndFire(obj);
                fire();
            }
        });

        child.on('close', function(code) {
            console.warn('Child exited with code: ' + code);
        });
        child.on('error', function(err) {
            console.warn('Child didn\'t start: ' + err);
        });
    },

    /**
     * Allow signals from outside world
     */
    set: function(sigs) {
        mergeAndFire(sigs);
        fire();
    }
};
