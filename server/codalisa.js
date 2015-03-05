var express  = require('express');
var app      = express();
var http     = require('http').Server(app);
var io       = require('socket.io')(http);
var _        = require('lodash');

var defaults = require('./defaults');
var signals  = require('./signals');

app.use(require('body-parser').urlencoded({ extended: false }))
app.use(require('body-parser').json());

var mkErrorHandler = function(res) {
    return function(err) {
        res.send({ error: err.toString() }, 500);
    };
};

var jsdb      = require('./jsdb');
var storage   = require('./storage');
var matrix_db = jsdb.open(jsdb.Matrix, '../matrices');

var script_db = storage.open('../scripts');

matrix_db.exists('default')
    .done(function(exists) {
        if (!exists) matrix_db.save('default', {
            title: 'Default matrix',
            width: 4,
            height: 4,
            agents: []
        });
    });

signals.start(function(signals) {
    io.emit('signals', signals);
});

var updateCounterInTitle = function(title) {
    var m = title.match(/^(.*)\((\d+)\)$/)
    if (m) {
        return m[1] + '(' + (m[2] + 1) + ')';
    }
    return title + ' (2)';
}

//----------------------------------------------------------------------
//  URL HANDLERS
//

function populateHead(head, name) {
    head._name = name;
    head._oldRef = head.ref;
    head._oldName = head._name;
    return head;
}

/**
 * Scripts are loaded as objs
 */
app.get('/s/:ref', function(req, res) {
    script_db.loadObj(req.params.ref).done(function(obj) {
        obj._ref = req.params.ref;
        res.json(obj);
    }, mkErrorHandler(res));
});

/**
 * Save any script here and get the saved ID as a name
 */
app.post('/s', function(req, res) {
    console.log('Saving script');
    script_db.saveObj(req.body).done(function(ref) {
        console.log('Saved to ' + ref);
        res.send(ref);
    }, mkErrorHandler(res));
});

/**
 * Create a default empty script
 */
app.post('/s/create', function(req, res) {
    script_db.saveObj(defaults.newScript()).done(function(ref) {
        console.log('Created new script at ' + ref);
        res.send(ref);
    }, mkErrorHandler(res));
});

/**
 * Return all heads for the scripts, of the form {title, ref}
 */
app.get('/h', function(req, res) {
    script_db.listHeads().done(function(heads) {
        heads = _.map(heads, populateHead);
        res.json(heads);
    }, mkErrorHandler(res));
});

/**
 * Load a head by name
 *
 * Return the exact same object in the future when changing it.
 */
app.get('/h/:name', function(req, res) {
    script_db.loadHead(req.params.name).done(function(head) {
        populateHead(head, req.params.name);
        res.json(head);
    }, mkErrorHandler(res));
});

/**
 * Save a head
 *
 * If a conflict occurs, the head will be saved under a different name. The
 * saved name is always returned.
 */
app.post('/h', function(req, res) {
    console.log('Saving head ' + JSON.stringify(req.body));
    if (!req.body.title) throw new Error('Give a title');

    var doSave = function(head, tries) {
        return script_db.saveHead(req.body.title, saveHead, req.body._oldRef).fail(function(err) {
            if (err instanceof storage.ConflictError && tries < 5) {
                head.title = updateCounterInTitle(head.title);
                return doSave(head, (tries || 0) + 1);
            }

            throw err;
        });
    }

    var saveHead = _.clone(req.body);
    doSave(saveHead).then(function(name) {
        // If the name changed, delete the old head and ignore conflicts 
        if (req.body._oldName && name != req.body._oldName)
            return script_db.deleteHead(req.body._oldName, req.body._oldRef)
                .then(function() { return name; }, function() { return name; });
        return name;
    }).done(function(name) {
        res.send(name);
    }, mkErrorHandler(res));
});

/**
 * Reflect the given error message to all connected clients
 */
app.post('/s/:ref/error', function(req, res) {
    var errorMsg = { ref: req.params.ref, error: req.body.error };
    console.warn('Script error', errorMsg);
    io.emit('script-error', errorMsg);
    res.send('kthxbai');
});

app.get('/m', function(req, res) {
    matrix_db.list().done(function(files) {
        res.json(files);
    }, mkErrorHandler(res));
});

app.post('/m/create', function(req, res) {
    matrix_db.create(defaults.newScript()).done(function(name) {
        res.send(name);
        io.emit('matrix-changed', { file: req.params.file });
    }, mkErrorHandler(res));
});

app.get('/m/:file', function(req, res) {
    matrix_db.load(req.params.file).done(function(file) {
        res.json(file);
    }, mkErrorHandler(res));
});

app.get('/m/:file/:x/:y', function(req, res) {
    matrix_db.load(req.params.file).then(function(matrix) {
        var coords = { x: parseInt(req.params.x, 10), y: parseInt(req.params.y, 10) };
        var existing = _.find(matrix.agents, coords);
        if (!existing) return coords;
        return existing;
    }).done(function(agent) {
        res.json(agent);
    }, mkErrorHandler(res));
});

app.post('/m/:file/:x/:y', function(req, res) {
    // Transactions. Woo!
    matrix_db.load(req.params.file).then(function(matrix) {
        var coords = { x: parseInt(req.params.x, 10), y: parseInt(req.params.y, 10) };
        var existing = _.find(matrix.agents, coords);
        if (!existing) matrix.agents.push(existing = coords);

        return script_db.load(req.body.file).then(function(agent) {
            existing.file = agent.file;
            existing.title = agent.title;

            io.emit('cell-changed', existing);

            return matrix;
        });
    }).then(function(matrix) {
        return matrix_db.save(req.params.file, matrix);
    }).done(function() {
        res.send('OK');
        io.emit('matrix-changed', { changedMatrix: req.params.file });
    }, mkErrorHandler(res));
});

app.post('/m/:file', function(req, res) {
    console.log('Saving changes to ' + req.params.file);
    matrix_db.save(req.params.file, req.body).done(function() {
        res.send('OK');
    }, mkErrorHandler(res));
});

//----------------------------------------------------------------------
//  STATIC & STARTUP
//

var oneDay = 24 * 60 * 60 * 1000;
app.use(express.static('../client', { maxAge: oneDay }));

http.listen(3000);
console.log("Please open http://localhost:%d/", 3000);
