var express  = require('express');
var app      = express();
var http     = require('http').Server(app);
var io       = require('socket.io')(http);
var _        = require('lodash');

var defaults = require('./defaults');
var signals  = require('./signals');

app.use(require('body-parser').urlencoded({ extended: false }))

var mkErrorHandler = function(res) {
    return function(err) {
        res.send({ error: err.toString() }, 500);
    };
};

var jsdb = require('./jsdb');
var script_db = jsdb.open(jsdb.Script, '../scripts');

/*
signals.start(function(signals) {
    io.emit('signals', signals);
});
*/

//----------------------------------------------------------------------
//  URL HANDLERS
//

app.get('/s', function(req, res) {
    script_db.list().then(function(files) {
        res.json(files);
    }).fail(mkErrorHandler(res));
});

app.post('/s/create', function(req, res) {
    script_db.create(defaults.newScript()).then(function(name) {
        res.send(name);
        io.emit('scripts-changed', { file: req.params.file });
    }).fail(mkErrorHandler(res));
});

app.get('/s/:file', function(req, res) {
    script_db.load(req.params.file).then(function(file) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(file);
    }).fail(mkErrorHandler(res));
});

app.post('/s/:file', function(req, res) {
    console.log('Saving changes to ' + req.params.file);

    script_db.loadOrEmpty(req.params.file).then(function(original) {
        if (original.version != req.body.version) {
            res.send('The file was changed while you were editing it. Please copy/paste to Notepad and refresh the page before editing again.');
            return;
        }

        req.body.version = original.version + 1;

        return script_db.save(req.params.file, req.body).then(function() {
            res.send('OK');
            io.emit('scripts-changed', { file: req.params.file });

            console.log('hoi');
            
            if (original.script != req.body.script) {
                console.log('Script published!');
                io.emit('script-published', { file: req.params.file });
            }
        });
    }).fail(mkErrorHandler(res));
});

app.post('/s/:file/error', function(req, res) {
    console.log('Reporting error', req.body.error);
    script_db.load(req.params.file).then(function(script) {
        script.errors.push(req.body.error);
        return script_db.save(req.params.file, script);
    }).then(function(script) {
        io.emit('script-error', { file: req.params.file, error: req.body.error });
    }).fail(mkErrorHandler(res));
});

app.get('/m', function(req, res) {
    matrix_db.list().then(function(files) {
        res.json(files);
    }).fail(mkErrorHandler(res));
});

app.post('/m/create', function(req, res) {
    matrix_db.create(defaults.newScript()).then(function(name) {
        res.send(name);
        io.emit('matrix-changed', { file: req.params.file });
    }).fail(mkErrorHandler(res));
});

app.get('/m/:file', function(req, res) {
    matrix_db.load(req.params.file).then(function(file) {
        res.json(file);
    }).fail(mkErrorHandler(res));
});

app.post('/m/:file', function(req, res) {
    // Transactions. Woo!
    matrix_db.load(req.params.file).then(function(matrix) {
        var ident = req.body.ident;
        var count = req.body.count;

        if (typeof count != 'number') throw new Error('count is not a number');

        if (!(ident in matrix)) matrix[ident] = 0;
        matrix[ident] += count;
        if (matrix[ident] < 0) matrix[ident] = 0;

        return matrix;
    }).then(function(matrix) {
        return matrix_db.save(req.params.file, matrix);
    }).then(function() {
        res.send('OK');
        io.emit('matrix-changed', { changedMatrix: req.params.file });
    }).fail(mkErrorHandler(res));
});

//----------------------------------------------------------------------
//  STATIC & STARTUP
//

var oneDay = 24 * 60 * 60 * 1000;
app.use(express.static('../client', { maxAge: oneDay }));

http.listen(3000);
console.log("Please open http://localhost:%d/", 3000);
