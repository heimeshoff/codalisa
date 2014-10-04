var animalonymous = require('animalonymous');

module.exports = {
    newScript: function() {
        return {title: animalonymous.randomStr(),
                version: 1,
                script: ['/**',
                         ' * Be kind to others and your future self: describe your script.',
                         ' *',
                         ' * ...',
                         ' */',
                         '', 
                         'function setup() {',
                         '}',
                         '',
                         'function draw(t, cell, signals) {',
                         '  for (var y = 0; y < cell.h; y++) {',
                         '    for (var x = 0; x < cell.w; x++) {',
                         '      cell.set(x, y, new Color(0, 0, 0));',
                         '    }',
                         '  }',
                         '  // ...',
                         '}'].join('\n')
               }
    }
}
