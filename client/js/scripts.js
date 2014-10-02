var loadScript = function(file) {
    return $.get('/s/' + encodeURIComponent(file));
}

var Scripts = function() {
    var self = this;
    self.scripts = ko.observableArray();
    self.selected = ko.observable();

    self.refresh = function() {
        $.getJSON('/s').then(function(contents) {
            self.scripts(contents);

            var selectionOk = _(contents)
                .pluck('file')
                .contains(self.selected());

            if (!selectionOk)
                self.selected(contents && contents.length ? contents[0].file : null);
        });
    }

    self.select = function(obj) {
        self.selected(obj.file);
    }

    self.newScript = function() {
        $.post('/s/create', {})
            .then(self.selected)
            .then(self.refresh);
    }

    self.get = function(file) {
        return $.get('/s/' + encodeURIComponent(file));
    }

    self.put = function(file, obj) {
        assert(obj.title !== undefined && obj.script !== undefined && obj.draft !== undefined, 'put argument must be a script object');
        return $.post('/s/' + encodeURIComponent(file), obj);
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

/**
 * VM for active script
 *
 * This model is a bit two-faced, because it doesn't really manage the script
 * contents completely; it's only used for loading, there, and retrieving the
 * current value compes directly from the ACE editor.
 */
var ActiveScript = function() {
    var self = this;

    // Data
    var originalObj = ko.observable();

    self.file = ko.observable();
    self.title = ko.observable();
    self.published = ko.observable();  // is called 'script' on the DTO :x
    self.draft = ko.observable();

    var page = ko.observable('draft');

    // Manipulation
    self.script = RedirectableObservable(self.draft);  // view on the actual script

    self.isDraft = ko.pureComputed(function() { return page() == 'draft'; });
    self.isPublished = ko.pureComputed(function() { return page() == 'published'; });
    self.isGrid = ko.pureComputed(function() { return page() == 'grid'; });
    self.readOnly = ko.pureComputed(function() { return !self.isDraft() || !self.file(); });
    self.setDraft = function() { page('draft'); }
    self.setPublished = function() { page('published'); }
    self.setGrid = function() { page('grid'); }
    self.viewScript = ko.observable();
    self.version = ko.observable();

    self.isDraft.subscribe(function(isDraft) {
        self.script.redirect(isDraft ? self.draft : self.published);
    });

    self.clear = function() {
        self.file('');
        self.title('');
        self.script('');
        self.published('');
        self.draft('');
        self.setDraft();
    }

    self.set = function(scriptObj) {
        originalObj(scriptObj);

        self.file(scriptObj.file);
        self.title(scriptObj.title);
        self.published(scriptObj.script);
        self.draft(scriptObj.draft);
        self.version(scriptObj.version);

        self.setDraft();
    }

    self.publish = function() {
        self.published(self.draft());
    }

    self.isDirty = ko.pureComputed(function() {
        if (!self.file()) return false;

        var original = originalObj();
        return (self.title() != original.title ||
                self.published() != original.script ||
                self.draft() != original.draft);
    });

    self.isUnpublished = ko.pureComputed(function() {
        if (!self.file()) return false;

        return self.published() != self.draft();
    });

    /**
     * Save the given script to the server, if it has changed since last loaded
     * it.
     */
    self.save = function(scripts) {
        var file = this.file();
        var obj = {
            title: self.title(),
            script: self.published(),
            draft: self.draft(),
            version: self.version()
        }

        if (!self.isDirty()) return $.Deferred().resolve(obj).promise();

        console.log('saving...');
        return scripts.put(file, obj).then(function(result) {
            if (result == 'OK') {
                console.log('saved');
                self.version(obj.version + 1); // This is nasty, but the easiest way to do it for now
                // Check if the subject changed in the meantime
                if (file == self.file()) {
                    originalObj(obj);
                }

                return obj;
            }
            else return $.Deferred().reject(result).promise();
        });
    }
}
