var animalonymous = require('animalonymous');

module.exports = {
    newScript: function() {
        return {title: animalonymous.randomStr(),
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
                         '  // ...',
                         '}'].join('\n')
               }
    }
}
