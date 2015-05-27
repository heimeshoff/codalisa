var animalonymous = require('animalonymous');

module.exports = {
    newScript: function() {
        return {title: animalonymous.randomStr(),
                version: 1,
                script: ['/**',
                         ' * Be kind to others and your future self:',
                         ' * describe your script here.',
                         ' */',
                         '', 
                         'function setup() {',
                         '}',
                         '',
                         'function tick(p) {',
                         '  if (p.hz(10)) {',
                         '    p.drop(\'circle\',',
                         '           [0, 0],         // Position',
                         '           randNr(10, 15), // Size',
                         '           palette[1],',
                         '           0.5,            // Alpha 0..1', 
                         '           0);             // Rotation 0..360',
                         '  }',
                         '  // ...',
                         '}'].join('\n')
               }
    }
}
