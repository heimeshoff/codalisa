var Canvas = function(w, h, canvasEl) {
    this.canvasEl = canvasEl;
    canvasEl.width = w;
    canvasEl.height = h;

    var context = canvasEl.getContext('2d');

    this.width = function() { return w; }
    this.height = function() { return h; }

    this.makeBoard = function() {
        return new Board(w, h, context.createImageData(w, h));
    }

    this.draw = function(board) {
        context.putImageData(board.imageData, 0, 0);
    }
}

/**
 * A single board at a point in time
 */
var Board = function(w, h, imageData) {
    this.imageData = imageData;

    // FIXME: optimization:
    // var buf = new ArrayBuffer(imageData.data.length);
    // var u32 = new Uint32Array(buf);
    // var u8 = new Uint8Array(buf);
    // imageData.data.set(u8);
    // hmm....
    var pixels = imageData.data;

    this.width = function() { return w; }
    this.height = function() { return h; }

    var ofs = function(x, y) {
        if (x < 0) x += w + w * Math.floor(-x / w);
        if (y < 0) y += h + h * Math.floor(-y / h);
        x = Math.floor(x) % w;
        y = Math.floor(y) % h;
        return (y * w + x) * 4;
    }

    this.get = function(x, y) {
        var o = ofs(x, y);
        return new Color(pixels[o],
                         pixels[o + 1],
                         pixels[o + 2]);
    }

    this.set = function(x, y, color) {
        if (!(color instanceof Color))
            throw new Error('Pass a Color into set()');

        var o = ofs(x, y);
        pixels[o] = color.r;
        pixels[o + 1] = color.g;
        pixels[o + 2] = color.b;
        pixels[o + 3] = 255;
    }

    /**
     * jQuery-like function for both getting and setting
     */
    this.px = function(x, y, color) {
        if (arguments.length == 3)
            this.set(x, y, color);
        else
            return this.get(x, y);
    }
}

Board.prototype.copyFrom = function(other) {
    this.imageData.data.set(new Uint8ClampedArray(other.imageData.data));
}


/**
 * A single agent's view on two time slices of the board,
 * t and t - 1.
 */
var Cell = function(x0, y0, w, h, tnow, tprev) {
    this.w = w;
    this.h = h;

    // If the old and new boards are different size, scale the indexes
    var oldScaleX = tprev.width()  / tnow.width();
    var oldScaleY = tprev.height() / tnow.height();

    this.get = function(x, y) {
        return tprev.get((x0 + x) * oldScaleX, (y0 + y) * oldScaleY);
    }

    this.set = function(x, y, color) {
        // Check for illegal access
        if (x < 0 || y < 0 || w <= x || h <= y) return;
        tnow.set(x0 + x, y0 + y, color);
    }

    this.rect = function(x0, y0, w, h, color) {
        var x1 = x0 + w, y1 = y0 + h;
        for (var y = y0; y < y1; y++) {
            for (var x = x0; x < x1; x++) {
                this.set(x, y, color);
            }
        }
    }

    this.fill = function(color) {
        this.rect(0, 0, w, h, color);
    }
}

/**
 * Make an agent from a script that defines a 'setup' and a 'draw' function.
 */
function makeAgentFromScript(script) {
    var src = ('(function() { "use script"; ' +
               script +
               '; return { setup: setup || function() { }, draw: draw || function() { } }; }());');
    return eval(src);
}

var Agent = function() {
    this.setup = function(t, cell) {
    }

    this.draw = function(t, cell, signals) {
        // Don't use cell.each() here, although convenient... CPU usage will be 10x higher!
        for (var y = 0; y < cell.h; y++)
            for (var x = 0; x < cell.w; x++) {
                if (Math.abs(x - y) < 3) {
                    cell.set(x, y, new Color(255 - (t * 60) % 255,
                                             255 - (t * 70) % 255,
                                             255 - (t * 80) % 255));
                }
                else {
                    cell.set(x, y, cell.get(x, y).mix(cell.get(x + 1, y - 1)));
                }
            }
    }
}

var MouseSignalGrabber = function(element) {
    var mx = 0;
    var my = 0;
    var click = 0.0;

    $(element).mousemove(function(ev) {
        var elOfs = $(element).offset(); 
        mx = ev.pageX - elOfs.left;
        my = ev.pageY - elOfs.top;
    }).mousedown(function(ev) {
        click = ev.which;
        ev.preventDefault();
        ev.stopPropagation();
    }).mouseup(function(ev) {
        click = 0.0;
        ev.preventDefault();
        ev.stopPropagation();
    });

    this.forCell = function(x0, y0) {
        return {
            x: mx - x0,
            y: my - y0,
            click: click
        };
    }
};

var clearCell = function(cell) {
    var white = new Color(255, 255, 255)
    for (var y = 0; y < cell.h; y++) {
        for (var x = 0; x < cell.w; x++) {
            cell.set(x, y, white);
        }
    }
};

var mixin = function(proto, mix) {
    var o = Object.create(proto);
    for (var k in mix) o[k] = mix[k];
    return o;
}

var Simulation = function(canvas, x_cells, y_cells) {
    var agentCount = x_cells * y_cells;

    var signals = {};

    var agents = _.range(agentCount).map(function() {
        return {
            initialized: false,
            error: null,
            agent: null,
            x0: 0,
            y0: 0
        };
    });

    var cell_w = canvas.width() / x_cells;
    var cell_h = canvas.height() / y_cells;

    this.setAgent = function(i, j, agent) {
        agents[j * x_cells + i] = {
            agent: agent,
            error: null,
            initialized: false,
            x0: i * cell_w,
            y0: j * cell_h
        };
    }

    var old = canvas.makeBoard();
    var cur = canvas.makeBoard();

    var mouseSignals = new MouseSignalGrabber(canvas.canvasEl);

    var frames = 0;
    setInterval(function() {
        if (this.onFps) this.onFps(frames);
        frames = 0;
    }.bind(this), 1000);

    this.setSignals = function(sigs) { signals = sigs; };

    var tick = function(t) {
        for (var i = 0; i < agentCount; i++) {
            var a = agents[i];
            if (a.error) continue;

            var cell = new Cell(a.x0, a.y0, cell_w, cell_h, cur, old);

            try {
                if (!a.initialized) {
                    a.initialized = true;
                    clearCell(cell);
                    if (a.agent) a.agent.setup(t, cell);
                }

                if (a.agent) {
                    var cellSigs = mixin(signals, {
                        mouse: mouseSignals.forCell(a.x0, a.y0)
                    });

                    a.agent.draw(t, cell, cellSigs);
                }
            } catch(e) {
                console.log(e);
                a.error = e;
            }
        }

        canvas.draw(cur);

        old = cur;
        cur = canvas.makeBoard();
        cur.copyFrom(old);

        // FIXME: depend resolution on time taken
        frames++;
    };

    this.start = function() {
        SimRunner.start(tick);
    }

    this.stop = function() {
        SimRunner.stop();
    };
}

SimRunner = (function() {
    var burnBabyBurn = true;

    var currentSim;
    var running = false;
    var timer;
    var ms;

    var tick = function(t) {
        t = (t || Date.now()) / 1000;
        if (currentSim) currentSim(t);

        if (running && burnBabyBurn)
            window.requestAnimationFrame(tick);
    }

    return {
        setFps: function(fps) {
            burnBabyBurn = fps == -1;
            ms = 1000 / fps;
        },
        start: function(sim) {
            currentSim = sim;

            if (running) return;
            running = true;

            if (burnBabyBurn)
                window.requestAnimationFrame(tick);
            else
                timer = window.setInterval(tick, ms);
        },
        stop: function() {
            if (!running) return;
            running = false;

            if (!burnBabyBurn) 
                window.clearInterval(timer);
        }
    };
}());
