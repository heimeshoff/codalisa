var Q = require('q');
var fs = require('fs');
var _ = require('lodash');

module.exports = {

    /**
     * Model for the script
     */
    Script: {
        pickle: function(obj) {
            if (!obj.script) return Q.reject(new Error('No script'));
            if (!obj.version) return Q.reject(new Error('Give version'));
            if (!obj.title) obj.title = 'Nameless script';
            return Q.resolve(obj);
        },
        unpickle: function(obj) {
            if (!obj.draft) obj.draft = obj.script;
            if (!obj.version) obj.version = 1;
            if (obj.errors === undefined) obj.errors = [];
            return Q.resolve(obj);
        },
        dir: function(obj) {
            if (!obj.script) return Q.resolve(null);
            return Q.resolve({ title: obj.title || 'Untitled script' });
        }
    },

    /**
     * Model for the display board
     */
    Board: {
        pickle: function(obj) {
            return Q.resolve(obj);
        },
        unpickle: function(obj) {
            return Q.resolve(obj);
        },
        dir: function(obj) {
            return Q.resolve(obj);
        },
    },

    /**
     * Create db object
     */
    open: function(schema, dir) {
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
                                .then(schema.dir)
                                .then(function(obj) {
                                    obj.file = file;
                                    return obj;
                                })
                                .fail(function(err) {
                                    console.warn(file, err);
                                    return null;
                                });
                        }));
                    })
                    .then(function(files) { return _.filter(files, function(x) { return x; }); });
            },

            exists: function(name) {
                if (!isVisible(name)) return Q.reject(new Error('Invalid file'));

                return Q.nfcall(fs.readFile, dir + '/' + name)
                    .then(function() { return true; })
                    .fail(function() { return false; });
            },

            /**
             * Load an object
             */
            load: function(name) {
                if (!isVisible(name)) return Q.reject(new Error('Invalid file'));

                // FIXME: No exploity namey
                return Q.nfcall(fs.readFile, dir + '/' + name)
                    .then(function(content) {
                        var obj = JSON.parse(content);
                        obj.file = name;
                        return schema.unpickle(obj);
                    });
            },

            loadOrEmpty: function(name) {
                if (!isVisible(name)) return Q.reject(new Error('Invalid file'));

                var deferred = Q.defer();

                fs.readFile(dir + '/' + name, function(err, content) {
                    if (err) {
                        schema.unpickle({}).then(deferred.resolve);
                    }
                    else {
                        var obj = JSON.parse(content);
                        obj.file = name;
                        deferred.resolve(schema.unpickle(obj));
                    }
                });

                return deferred.promise;
            },

            /**
             * Save an object
             */
            save: function(name, obj) {
                if (!isVisible(name)) return Q.reject(new Error('Invalid file'));
                if (!obj) return Q.reject(new Error('No object'));
                
                // FIXME: No exploity namey
                
                return schema.pickle(obj)
                    .then(function(obj) {
                        var str = JSON.stringify(obj);

                        return Q.nfcall(fs.writeFile, dir + '/' + name, str);
                    });
            },

            /**
             * Create the given object under a unique name, return the name
             */
            create: function(obj) {
                var name = uniqueName();

                return this.save(name, obj).then(function() { return name; });
            }
        }
    }
}
