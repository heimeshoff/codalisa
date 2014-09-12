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

    self.put = function(file, title, script) {
        return $.post('/s/' + encodeURIComponent(file), {
                title: title,
                script: script,
            });
    }
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

    var originalTitle = ko.observable();
    var originalScript = ko.observable();

    self.file = ko.observable();
    self.title = ko.observable();
    self.script = ko.observable();

    self.disabled = ko.pureComputed(function() {
        return !self.file();
    });

    self.clear = function() {
        self.file('');
        self.title('');
        self.script('');

        originalTitle(self.title());
        originalScript(self.script());
    }

    self.set = function(scriptObj) {
        self.file(scriptObj.file);
        self.title(scriptObj.title);
        self.script(scriptObj.script);

        originalTitle(self.title());
        originalScript(self.script());
    }

    /**
     * Save the given script to the server, if it has changed since last loaded
     * it.
     */
    self.save = function(scripts, currentScript) {
        if (!self.file()) return;

        // Load current state into vars so we can update the POSTED values
        // later on.
        var file = self.file();
        var title = self.title();

        if (self.title() != originalTitle() || currentScript != originalScript()) {
            console.log('saving...', editor.getValue());
            scripts.put(file, title, currentScript).then(function() {
                console.log('saved');
                if (self.file() != file)
                    // Loaded a new script in the meantime
                    return;
                originalTitle(title);
                originalScript(currentScript);
            });
        }
    }
}
