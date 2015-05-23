var Board = function(name) {
    var self = this;
    
    self.agents = ko.observable();
    self.currentScript = ko.observable();

    self.set = function(obj) {
        self.agents(_.values(obj.agents));
    }

    self.load = function() {
        return $.get('/b/' + encodeURIComponent(name)).then(self.set);
    }

    self.change = function(ident, count, title) {
        if (!ident) return;
        return $.post('/b/' + encodeURIComponent(name), { ident: ident, count: count, name: title }).then(self.set);
    }

    self.currentScriptOnBoard = ko.pureComputed(function() {
        var b = _(self.agents()).findWhere({ ident: self.currentScript() });
        if (!b) b = { count: 0 };
        b.change = function(count, name) { self.change(self.currentScript(), count, name); }
        return b;
    });

    self.setCurrentScript = function(ident) {
        self.currentScript(ident);
    }
}
