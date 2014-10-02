var canvas = new Canvas(300, 200, document.getElementById('surface'));

var matrix = new MatrixModel();
var sim;

function loadAndAssign(agentNames, assignments) {
    _.each(agentNames, function(name) {
        loadScript(name).then(function(script) {
            try {
                _(assignments).filter(function(ass) {
                    return ass.file == script.file;
                }).each(function(ass) {
                    var agent = makeAgentFromScript(script.script);
                    sim.setAgent(ass.x, ass.y, agent);
                });
            } catch (e) {
                console.log(e);
            }
        });
    });
}

function showMatrix(matrixName) {
    matrix.load(matrixName).then(function() {
        sim = new Simulation(canvas, matrix.width(), matrix.height());

        loadAndAssign(_(matrix.agents()).pluck('file').unique().value(), matrix.agents());

        sim.start(-1);
    });
}

showMatrix('default');

var socket = io();

socket.on('script-published', function(script) {
    loadAndAssign([script.file], matrix.agents());
});
socket.on('cell-changed', function(cell) {
    loadAndAssign([cell.file], [cell]);
});
socket.on('signals', function(signals) { SimRunner.setSignals(signals); });

/**
 * Make the canvas' actual aspect corresponding to its virtual surface aspect
 *
 * (Height is probably limiting)
 */
function updateCanvasSize() {
    var canvas = $('#surface');

    var maxXscale = $(window).width() / canvas.get(0).width;
    var maxYscale = $(window).height() / canvas.get(0).height;

    var minScale = Math.min(maxXscale, maxYscale);
    canvas.width(canvas.get(0).width * minScale);
    canvas.height(canvas.get(0).height * minScale);
}
$(window).resize(updateCanvasSize);
updateCanvasSize();
