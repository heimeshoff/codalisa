var express = require('express');
var app     = express();
var http    = require('http').Server(app);
var defaults = require('./defaults');
var io      = require('socket.io')(http);

app.use(require('body-parser').urlencoded({ extended: false }))

var mkErrorHandler = function(res) {
    return function(err) {
        res.send({ error: err.toString() }, 500);
    };
};

var jsdb = require('./jsdb')('../scripts');

app.get('/s', function(req, res) {
    jsdb.list().then(function(files) {
        res.json(files);
    }).fail(mkErrorHandler(res));
});

app.get('/s/:file', function(req, res) {
    jsdb.load(req.params.file).then(function(file) {
        res.json(file);
    }).fail(mkErrorHandler(res));
});

app.post('/s/create', function(req, res) {
    jsdb.create(defaults.newScript()).then(function(name) {
        res.send(name);
        io.emit('scripts-changed', {});
    }).fail(mkErrorHandler(res));
});

app.post('/s/:file', function(req, res) {
    jsdb.save(req.params.file, req.body).then(function() {
        res.send('OK');
        io.emit('scripts-changed', {});
    }).fail(mkErrorHandler(res));
});

/*
app.get('/d/databases', function(req, res) {
    databases.list('./db').then(function(files) {
        res.json(files);
    }).fail(mkErrorHandler(res));
});

app.get('/d/query/:q', function(req, res) {
    databases.query('./db/demo.db', req.params.q)
        .then(function(out) {
            res.json(out);
        }).fail(mkErrorHandler(res));
});

app.post('/p/plot', function(req, res) {
    var db = './db/' + req.body.db;
    var sql = req.body.sql;
    var plot = req.body.plot;

    // List of promises
    databases.queryAll(db, sql)
        .then(function(series) {
            return gnuplot.renderToPNG(series, plot, 'plots');
        }).then(function(out) {
            res.send({ output: out.output, url: '/p/plots/' + out.png });
        }).fail(mkErrorHandler(res));
});

app.use('/p/plots', express.static('plots'));
*/

var oneDay = 24 * 60 * 60 * 1000;
app.use(express.static('../client', { maxAge: oneDay }));

http.listen(3000);
console.log("Please open http://localhost:%d/", 3000);
