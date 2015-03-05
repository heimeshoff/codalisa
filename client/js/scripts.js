/**
 * Data model
 *
 * Script: 'script', 'title'.
 * Script head: 'ref', 'title'.
 * Cell head: 'ref', 'x', 'y', 'title'.
 *
 * Title is extremely denormalized for the heck of it.
 */

var update = function(obj, changes) {
    return _.merge(_.clone(obj), changes);
}

/**
 * Server calls
 */
var Server = {
    post: function(url, data) {
        return $.ajax({
            type: 'POST',
            url: url, 
            data: JSON.stringify(data),
            contentType: 'application/json; charset=utf-8'
        });
    },

    postJSON: function(url, data) {
        return $.ajax({
            type: 'POST',
            url: url, 
            data: JSON.stringify(data),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });
    },

    loadScript: function(ref) {
        return $.getJSON('/s/' + encodeURIComponent(ref));
    },

    saveScript: function(script) {
        return Server.post('/s', script);
    },

    loadHead: function(name) {
        return $.getJSON('/h/' + encodeURIComponent(name));
    },

    saveHead: function(head) {
        return Server.post('/h', head);
    },

    postError: function(ref, error) {
        return Server.post('/s/' + encodeURIComponent(ref) + '/error', { error: error.toString() });
    },

    listHeads: function() {
        return $.getJSON('/h');
    },

    createScript: function() {
        return Server.post('/s/create', {})
            .then(Server.loadScript)
            .then(function(script) {
                console.log('loaded new script');
                var head = { ref: script._ref, title: script.title, isScript: true };

                return Server.saveHead(head);
            });
    },
};

/**
 * List of server-side scripts
 */
var Scripts = function() {
    var self = this;
    self.scripts = ko.observableArray();
    self.selectedName = ko.observable();

    self.refresh = function() {
        Server.listHeads().then(function(heads) {
            self.scripts(_.where(heads, { isScript: true }));

            var selectionOk = _(heads)
                .pluck('_name')
                .contains(self.selectedName());

            if (!selectionOk)
                self.selectedName(heads && heads.length ? heads[0].name : null);
        });
    }

    self.select = function(head) {
        self.selectedName(head._name);
    }

    self.newScript = function() {
        Server.createScript()
            .then(self.selectedName)
            .then(self.refresh);
    }
}

var RedirectableObservable = function(current) {
    var ret = ko.observable(current());

    var sub = current.subscribe(ret);
    ret.subscribe(function(newValue) {
        current(newValue);
    });

    ret.redirect = function(newUnderlying) {
        sub.dispose();
        current = newUnderlying;

        ret(newUnderlying());
        sub = current.subscribe(ret);
    }
    return ret;
}

var Tab = function(options) {
    var self = this;

    var current = ko.observable(options[0]);

    _.each(options, function(option) {
        self['is' + option] = ko.pureComputed(function() { return current() == option; });
        self['set' + option] = function() { current(option); };
    });
}

/**
 * VM for active script
 *
 * This model is a bit two-faced, because it doesn't really manage the script
 * contents completely; it's only used for loading, there, and retrieving the
 * current value compes directly from the ACE editor.
 */
var ActiveScript = function() {
    var self = this;

    self.scriptTab = new Tab(['Script', 'Grid']);
    self.previewTab = new Tab(['Preview', 'Errors']);

    // Data
    var originalHead = ko.observable();

    self.name = ko.pureComputed(function() { return originalHead() && originalHead._name; });
    self.title = ko.observable();
    self.script = ko.observable();
    self.errors = ko.observableArray();
    self.readOnly = ko.pureComputed(function() { return !self.name(); });

    // Manipulation
    //self.script = RedirectableObservable(self.draft);  // view on the actual script

    self.viewScript = ko.observable();

    var set = function(headAndScript) {
        originalHead(headAndScript[0]);

        self.title(headAndScript[1].title || '');
        self.script(headAndScript[1].script || '');
        self.errors([]);

        self.scriptTab.setScript();
    }

    self.clear = function() {
        set([{}, {}]);
    }

    self.loadHead = function(name) {
        return Server.loadHead(name).then(function(head) {
            return Server.loadScript(head.ref).then(function(script) {
                return [head, script];
            });
        }).then(set);
    }

    self.isDirty = ko.pureComputed(function() {
        if (!self.name()) return false;

        var original = originalHead();
        return (self.title() != original.title || self.script() != original.script);
    });

    self.isUnpublished = ko.pureComputed(function() {
        if (!self.name()) return false;
        return false;
    });

    /**
     * Save the given script to the server, if it has changed since last loaded
     * it.
     */
    self.save = function() {
        if (!self.name()) return;

        var script = { 
            title: self.title(),
            script: self.script()
        };
        var head = update(self.originalHead, { title: self.title() });

        console.log('saving...');
        return Server.saveScript(script)
            .then(function(ref) {
                head.ref = ref;
                return Server.saveHead(head);
            }).then(self.loadHead);
    }
}
