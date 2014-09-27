var child_process = require('child_process');
var _             = require('lodash');

/**
 * Start the ev3 python script and raise events for the STDOUT
 */
module.exports = {
    start: function(callback) {
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
                console.log(obj);
                callback(obj);
            }
        });

        child.on('close', function(code) {
            console.warn('Child exited with code: ' + code);
        });
        child.on('error', function(err) {
            console.warn('Child didn\'t start: ' + err);
        });
    }
};
