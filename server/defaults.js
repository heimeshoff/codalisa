var animalonymous = require('animalonymous');

module.exports = {
    newScript: function() {
        return {title: animalonymous.randomStr(),
                script: ['/**',
                         ' * Describe a bit about your script here.',
                         ' *',
                         ' * It\'ll help yourself and other people.',
                         ' */',
                         '',
                         'function tick(t) {',
                         '',
                         '}'].join('\n')
               }
    }
}
