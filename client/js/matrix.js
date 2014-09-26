var MatrixModel = function() {
    var self = this;

    self.title = ko.observable();
    self.width = ko.observable();
    self.height = ko.observable();
    self.file = ko.observable();
    self.agents = ko.observable();

    self.set = function(obj) {
        self.file(obj.file);
        self.title(obj.title);
        self.width(obj.width);
        self.height(obj.height);
        self.agents(obj.agents);
    }

    self.rows = ko.pureComputed(function() {
        return _.range(self.height()).map(function(y) {
            return _.range(self.width()).map(function(x) {
                var agent = _.find(self.agents(), { x: x, y: y });
                return {
                    x: x,
                    y: y,
                    file: agent ? agent.file : null,
                    title: agent ? agent.title : ''
                };
            });
        });
    });

    self.load = function(name) {
        return $.get('/m/' + encodeURIComponent(name)).then(self.set);
    }

    /**
     * Reload current matrix IFF the given matrix is the current one
     */
    self.reload = function(name) {
        if (name == self.file())
            self.load(name);
    }

    /**
     * Write current script to the given cell
     */
    self.occupy = function(cell, filename) {
        return $.post('/m/' + encodeURIComponent(self.file()) + '/' + cell.x + '/' + cell.y, { file: filename });
    }
}
