var ScreenModel = function(name) {
    var self = this;
    
    self.agents = ko.observableArray();

    self.set = function(obj) {
        self.agents(obj.agents);
    }

    self.load = function(name) {
        return $.get('/m/' + encodeURIComponent(name)).then(self.set);
    }

    self.change = function(ident, count) {
        return $.post('/m/' + encodeURIComponent(name), { ident: ident, count: count }).then(self.set);
    }
}
