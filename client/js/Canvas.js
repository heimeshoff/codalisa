var Canvas = function(canvasEl) {
    var context = canvasEl.getContext('2d');

    this.makeBoard = function(w, h) {
        return new Board(w, h, context.createImageData(w, h));
    }

    this.draw = function(board) {
    /*
        if (context.width != board.w) context.width = board.w;
        if (context.height != board.h) context.height = board.h;
        */

        context.putImageData(board.imageData, 0, 0);
    }
}

function clip(x, lo, hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}


/**
 * Color of a single pixel
 */
function Color(r, g, b) {
    if (isNaN(r)) throw new Error('r is NaN');
    if (isNaN(g)) throw new Error('g is NaN');
    if (isNaN(b)) throw new Error('b is NaN');

    this.r = clip(r, 0, 255);
    this.g = clip(g, 0, 255);
    this.b = clip(b, 0, 255);
}

/**
 * Mix 'frac' [0..1] of the other color into this color
 */
Color.prototype.mix = function(other, frac) {
    if (frac === undefined) frac = 0.5;
    frac = clip(frac, 0.0, 1.0);

    var r = this.r + (other.r - this.r) * frac;
    var g = this.g + (other.g - this.g) * frac;
    var b = this.b + (other.b - this.b) * frac;

    return new Color(r, g, b);
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

    var ofs = function(x, y) {
        x = x % w;
        y = y % h;
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

/**
 * A single agent's view on two time slices of the board,
 * t and t - 1.
 */
var Cell = function(x0, y0, w, h, tnow, tprev) {
    this.w = w;
    this.h = h;

    this.get = function(x, y) {
        return tprev.get(x0 + x, y0 + y);
    }

    this.set = function(x, y, color) {
        // Check for illegal access
        if (x < 0 || y < 0 || w <= x || h <= y) return;
        tnow.set(x0 + x, y0 + y, color);
    }
}

var Agent = function() {
    this.setup = function() {
    }

    this.draw = function(t, cell, signals) {
        // Don't use cell.each() here, although convenient... CPU usage will be 10x higher!
        for (var y = 0; y < cell.h; y++)
            for (var x = 0; x < cell.w; x++) {
                var col = new Color(Math.cos(x * (t / 10000)) * 255,
                                    Math.sin(y * x * (t / 10000)) * 255,
                                    Math.floor(t / 10000) % 255);
                cell.set(x, y, cell.get(x, y).mix(col, 0.7));
            }
    }
}

var Simulation = function(canvas, signals) {
    var x_cells = 4;
    var y_cells = 4;

    var agents = [
                  [new Agent(), null, new Agent(), null],
                  [null, new Agent(), null, new Agent()],
                  [new Agent(), null, new Agent(), null],
                  [null, new Agent(), null, new Agent()]
                 ];

    var w = 300;
    var h = 300;

    var cell_w = w / x_cells;
    var cell_h = h / y_cells;

    var old = canvas.makeBoard(w, h);
    var cur = canvas.makeBoard(w, h);

    var tick = function(t) {
        t = t || Date.now();

        for (var j = 0; j < y_cells; j++) {
            for (var i = 0; i < x_cells; i++) {
                var agent = agents[j][i];
                if (!agent) continue;

                agent.draw(t, new Cell(i * cell_w, j * cell_h, cell_w, cell_h, cur, old), signals);
            }
        }

        canvas.draw(cur);

        old = cur;
        cur = canvas.makeBoard(w, h);
        // FIXME: depend resolution on time taken

        window.requestAnimationFrame(tick);
    };

    //window.setInterval(tick, 200);
    window.requestAnimationFrame(tick);
}
