/**
 * This is for load testing
 */
var N = 1; // 20
var fps = 0; // 0
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

    useVim: ko.observable(false),
    saving: ko.observable(false),

    previewTimer: null,
    saveTimer: null,

    publish: function() {
        this.activeScript.publish();
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

    /**
     * Make the active script occupy the given cell
     *
     * Is not bound, so can't use this.
     */
    occupy: function(cell) {
        if (models.activeScript.file()) {
            models.matrix.occupy(cell, models.activeScript.file());
        }
    },

    fps: ko.observable(0)
};

var editor = initAce('editor');
bindEditorModel(editor, models.activeScript, models.scriptChanged.bind(models));
initVimPreference(editor, models.useVim);
editor.focus();

/**
 * Handle change of selected script
 */
models.scripts.selected.subscribe(function(name) {
    // When the selected item changes, quickly save the current script :)
    //models.activeScript.save(models.scripts, editor.getValue());
    if (window.history.replaceState) {
        window.history.replaceState(null, null, '#' + name);
    }

    if (!name)
        models.activeScript.clear();
    else 
        models.scripts
            .get(name)
            .then(models.activeScript.set);
});

models.scripts.selected(window.location.hash.substr(1));

// Save changes to server periodically
/*
window.setInterval(function() {
    models.activeScript.save(models.scripts, editor.getValue());
}, 5000);
*/


ko.applyBindings(models);
models.scripts.refresh();

var socket = io();

socket.on('scripts-changed', function(msg) { models.scripts.refresh(); });
socket.on('signals', function(signals) { SimRunner.setSignals(signals); });
socket.on('script-error', function(err) { addErrorToLog(err.file, err.error); });

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
