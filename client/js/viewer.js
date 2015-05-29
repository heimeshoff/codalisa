var canvasEl = document.getElementById('surface');
var world = new World(1400, 900, canvasEl);
var board = new Board('default');
board.load();

// Replace console.log and alert
window.console = {
  log: function() { }
};
window.alert = function() { };

var displayFps = function(fps) {
    $('#viewer-fps').text('fps: ' + fps);
}

world.addAgent(new MouseAgent(canvasEl, 'mouse'));

(function() {
    var currentAgents = {};
    var controlScripts = {};

    var applyScript = function(obj) {
        // The ident is in `obj.file`
        var ident = obj.file;
        controlScripts[ident] = agentControlFromScript(obj.script, ident);

        if (!(ident in currentAgents)) return;
        for (var i = 0; i < currentAgents[ident]; i++) {
            world.agent(ident + '_' + i).setControl(controlScripts[ident]);
        }
    }

    /**
     * Whenever the board changes, compare new state with current
     * state and add/remove agents.
     */
    board.agents.subscribe(function(agents) {
        var loadScripts = {};

        // Compare and remove counts
        _.forEach(agents, function(agent) {
            if (!(agent.ident in currentAgents)) currentAgents[agent.ident] = 0;

            while (currentAgents[agent.ident] > agent.count) {
                // Remove agent_5, agent_4, ...
                currentAgents[agent.ident]--; 
                world.deleteAgent(agent.ident + '_' + currentAgents[agent.ident]);
            }
            while (currentAgents[agent.ident] < agent.count) {
                // Add agent_0, agent_1, ...
                var agentObj = world.addAgent(new Agent(agent.ident + '_' + currentAgents[agent.ident]));
                currentAgents[agent.ident]++; 

                if (agent.ident in controlScripts)
                    agentObj.setControl(controlScripts[agent.ident]);
                else
                    loadScripts[agent.ident] = true;
            }
        });

        // Load new scripts
        _(loadScripts).keys().forEach(function(ident) {
            loadScript(ident).then(applyScript);
        });
    });
}());


var sim = new Simulation(world, 0, displayFps);
sim.start();

function loadAndAssign(agentNames, assignments) {
    _.each(agentNames, function(name) {
        loadScript(name).then(function(script) {
            try {
                _(assignments).filter(function(ass) {
                    return ass.file == script.file;
                }).each(function(ass) {
                    console.log('Putting agent', script.file, 'in', ass.x, ass.y);
                    var agent = makeAgentFromScript(script.script, script.file);
                    sim.setAgent(ass.x, ass.y, agent);
                });
            } catch (e) {
                console.log(e);
            }
        });
    });
}

var socket = io();

socket.on('script-published', function(script) {
    console.log('published', script);
    loadAndRefresh([script.file]);
});
socket.on('board-changed', function() {
    board.load();
});
socket.on('signals', function(signals) { sim.setSignals(signals); });

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

$('#fullscreen-button').click(function() {
    if (screenfull.enabled) {
        screenfull.request();
    }
});

document.addEventListener(screenfull.raw.fullscreenchange, function () {
    $('#fullscreen-button').toggle(!screenfull.isFullscreen);
});
