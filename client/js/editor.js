/**
 * This is for load testing
 */
var N = 1; // 20
var fps = 5; // 0
var times = undefined;

/**
 * Log the error to the 'errors' array if the error is from the agent
 * we're editing, or the "currently under edit" agent.
 */
var addErrorToLog = function(script, error) {
    if (script == models.activeScript.file() || script == 'user')
        models.activeScript.errors.push(error);
}

var canvasEl = document.getElementById('preview');
var world = new World(900, 900, canvasEl, addErrorToLog);

//var mouseDrawing = new MouseDrawing();
for (var i = 0; i < N; i++) {
    world.addAgent(new Agent('user' + (i > 0 ? i : '')));
}

world.addAgent(new MouseAgent(canvasEl, 'mouse'));

var models = {
    scripts: new Scripts(),
    activeScript: new ActiveScript(),
    board: new Board('default'),

    useVim: ko.observable(false),
    saving: ko.observable(false),

    previewTimer: null,
    saveTimer: null,

    publish: function() {
        this.activeScript.publish();
        this.activeScript.setPublished();
        this.preview();
    },

    reinit: function() {
        for (var i = 0; i < N; i++) {
            world.reinit('user' + (i > 0 ? i : ''));
        }
    },

    preview: function() {
        // Run this script now, and schedule to save the script in 100ms.
        // This will make sure that if the script goes into a infinite loop, we
        // don't save it.
        // This is like a horribly crappy way to do this but I don't know the way
        // around my code anymore :(.
        var a = agentControlFromScript(this.activeScript.draft(), this.activeScript.file());
        if (a) {
            for (var i = 0; i < N; i++) {
                world.agent('user' + (i > 0 ? i : '')).setControl(a);
            }
        }
        var f = this.activeScript.file();

        var self = this;
        window.clearInterval(self.saveTimer);
        this.saveTimer = window.setTimeout(function() {
            self.saving(true);
            return self.activeScript.save(self.scripts)
                .then(function(obj) {
                    self.saving(false);
                    return obj;
                }).fail(function(err) {
                    alert(err);
                });
        }, 1000);
    },

    scriptChanged: function() {
        window.clearInterval(this.previewTimer);
        this.previewTimer = window.setTimeout(this.preview.bind(this), 500);
    },

    fps: ko.observable(0)
};

var editor = initAce('editor');
bindEditorModel(editor, models.activeScript, models.scriptChanged.bind(models));
initVimPreference(editor, models.useVim);
editor.focus();

/**
 * Handle change of selected script (load it)
 */
models.scripts.selected.subscribe(function(name) {
    if (window.history.replaceState) {
        window.history.replaceState(null, null, '#' + name);
    }

    models.board.setCurrentScript(name);

    if (!name)
        models.activeScript.clear();
    else 
        models.scripts
            .get(name)
            .then(models.activeScript.set);
});

models.scripts.selected(window.location.hash.substr(1));

/**
 * Clicking a link to another script
 */
window.onhashchange = function() {
    models.scripts.selected(window.location.hash.substr(1));
    models.activeScript.setDraft();
}

ko.applyBindings(models);
models.scripts.refresh();
models.board.load();

var socket = io();

socket.on('scripts-changed', function(msg) { models.scripts.refresh(); });
socket.on('signals', function(signals) { sim.setSignals(signals); });
socket.on('script-error', function(err) { addErrorToLog(err.file, err.error); });
socket.on('board-changed', function(board) { models.board.load(); });

var sim = new Simulation(world, fps, models.fps, times);
sim.start();

/**
 * Make the canvas' actual aspect corresponding to its virtual surface aspect
 */
function updateCanvasSize() {
    var canvas = $('#preview');
    var aspect = canvas.get(0).width / canvas.get(0).height;

    canvas.height(canvas.width / aspect);
}
updateCanvasSize();
$(window).resize(updateCanvasSize);
