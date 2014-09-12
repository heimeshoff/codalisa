var Q = require('q');
var fs = require('fs');
var _ = require('lodash');

module.exports = function(dir) {

    var isVisible = function(x) {
        return !x.match(/^\./);
    }

    var uniqueName = function() {
        return 's-' + Math.floor(Math.random() * 1000000);
    }

    return {
        list: function() {
            var self = this;

            return Q.nfcall(fs.readdir, dir)
                .then(function(files) { return _.filter(files, isVisible); })
                .then(function(files) {
                    return Q.all(_.map(files, function(file) {
                        return self.load(file)
                            .then(function(contents) {
                                return { file: file, title: contents.title || '' };
                            })
                            .fail(function(err) {
                                console.warn(file, err);
                                return null;
                            });
                    }));
                })
                .then(function(files) { return _.filter(files, function(x) { return x; }); });
        },

        load: function(name) {
            if (!isVisible(name)) return Q.reject(new Error('Invalid file'));

            // FIXME: No exploity namey
            return Q.nfcall(fs.readFile, dir + '/' + name)
                .then(function(content) {
                    var obj = JSON.parse(content);
                    obj.file = name;
                    return obj;
                });
        },

        save: function(name, obj) {
            if (!isVisible(name)) return Q.reject(new Error('Invalid file'));
            
            // FIXME: No exploity namey
            
            if (!obj) return Q.reject(new Error('No object'));
            if (!obj.script) return Q.reject(new Error('No script'));
            if (!obj.title) title = 'Nameless script';

            var str = JSON.stringify(obj);

            return Q.nfcall(fs.writeFile, dir + '/' + name, str);
        },

        create: function(obj) {
            var name = uniqueName();

            return this.save(name, obj).then(function() { return name; });
        }
    }
}
