var canvas = new Canvas(300, 300, document.getElementById('preview'));

var addErrorToLog = function(script, error) {
    if (script == models.activeScript.file())
        models.activeScript.errors.push(error);
}

var sim = new Simulation(canvas, 3, 3, addErrorToLog, true);

var mouseDrawing = new MouseDrawing();
sim.setAgent(0, 0, mouseDrawing);
sim.setAgent(1, 0, mouseDrawing);
sim.setAgent(2, 0, mouseDrawing);
sim.setAgent(0, 1, mouseDrawing);
sim.setAgent(2, 1, mouseDrawing);
sim.setAgent(0, 2, mouseDrawing);
sim.setAgent(1, 2, mouseDrawing);
sim.setAgent(2, 2, mouseDrawing);

var models = {
    scripts: new Scripts(),
    activeScript: new ActiveScript(),
    matrix: new MatrixModel(),

    useVim: ko.observable(false),
    saving: ko.observable(false),

    publish: function() {
        this.activeScript.publish();
        this.preview();
    },

    preview: function() {
        this.saving(true);
        this.activeScript.setPreview();
        var f = this.activeScript.file();
        return this.activeScript.save(this.scripts)
            .then(function(obj) {
                this.saving(false);
                var a = makeAgentFromScript(obj.script, f);
                sim.setAgent(1, 1, a);
                return obj;
            }.bind(this))
            .fail(function(err) {
                alert(err);
            });
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
bindEditorModel(editor, models.activeScript);
initVimPreference(editor, models.useVim);
editor.focus();

/**
 * Handle change of selected script
 */
models.scripts.selectedName.subscribe(function(name) {
    // When the selected item changes, quickly save the current script :)
    models.activeScript.save(models.scripts, editor.getValue());

    if (!name) {
        if (window.history.replaceState) window.history.replaceState(null, null, '#');
        models.activeScript.clear();
    }
    else  {
        if (window.history.replaceState) window.history.replaceState(null, null, '#' + name);
        models.activeScript.loadHead(name);
    }
});

models.scripts.selectedName(window.location.hash.substr(1));

models.matrix.load('default');

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
socket.on('matrix-changed', function(ev) { models.matrix.reload(ev.changedMatrix); });
socket.on('signals', function(signals) { SimRunner.setSignals(signals); });
socket.on('script-error', function(err) { addErrorToLog(err.script, err.error); });

SimRunner.onFps = models.fps;
SimRunner.setFps(10);
sim.start();

/**
 * Make the canvas' actual aspect corresponding to its virtual surface aspect
 */
function updateSizes() {
    var canvas = $('#preview');
    var aspect = canvas.get(0).width / canvas.get(0).height;

    canvas.height(canvas.width / aspect);

    $('.list').height($(window).height() - 200);
}
updateSizes();
$(window).resize(updateSizes);
