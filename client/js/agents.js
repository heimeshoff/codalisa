var Schuin = function() {
    this.setup = function() {
    }

    this.draw = function(t, cell, signals) {
        // Don't use cell.each() here, although convenient... CPU usage will be 10x higher!
        for (var y = 0; y < cell.h; y++)
            for (var x = 0; x < cell.w; x++) {
                cell.set(x, y, cell.get(x, y).mix(cell.get(x + 1 + Math.cos(t / 1000) * 10, y + 1 + Math.sin(t / 1000) * 10)));
                //cell.set(x, y, col);
            }
    }
}

var Generator = function() {
    this.setup = function() {
    }

    this.draw = function(t, cell, signals) {
        // Don't use cell.each() here, although convenient... CPU usage will be 10x higher!
        for (var y = 0; y < cell.h; y++)
            for (var x = 0; x < cell.w; x++) {
                var col = new Color(0,
                                    0,
                                    Math.floor(t * x * y) % 255);
                cell.set(x, y, cell.get(x, y).mix(col, 0.7));
            }
    }
}

var Bounce = function() {
    this.setup = function() {
        this.x = Math.random();
        this.y = Math.random();
        this.vx = Math.random() * 0.5 + 0.5;
        this.vy = Math.random() * 0.5 + 0.5;
        this.t0 = null;
    }

    this.draw = function(t, cell, signals) {
        var cx = this.x * cell.w;
        var cy = this.y * cell.h;

        for (var y = 0; y < cell.h; y++) {
            for (var x = 0; x < cell.w; x++) {
                if (dist(x, y, cx, cy) < 4) 
                    cell.set(x, y, new Color(255, 0, 0));
                else
                    cell.set(x, y, cell.get(x, y).mix(new Color(255, 255, 255), 0.3));
            }
        }

        if (this.t0) {
            var dt = t - this.t0;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if ((cx < 3 && this.vx < 0) ||
                (cx > cell.w - 3 && this.vx > 0))
                this.vx = -this.vx;
            if ((cy < 3 && this.vy < 0) ||
                (cy > cell.h - 3 && this.vy > 0))
                this.vy = -this.vy;
        }
        this.t0 = t;
    }
}

var Mirror = function() {
    this.setup = function() { }
    this.draw = function(t, cell, signals) {
        for (var y = 0; y < cell.h; y++) {
            for (var x = 0; x < cell.w; x++) {
                if (y > x)
                    cell.set(x, y, cell.get(-x, y));
                else
                    cell.set(x, y, cell.get(2 * cell.w - x, y));
            }
        }
    }
}

var Avg = function() {
    this.setup = function() { }
    this.draw = function(t, cell, signals) {
        for (var y = 0; y < cell.h; y++) {
            for (var x = 0; x < cell.w; x++) {
                var a =  cell.get(x - cell.w, y);
                var b =  cell.get(x + cell.w, y);
                var c =  cell.get(x, y - cell.h);
                var d =  cell.get(x, y + cell.h);
                cell.set(x, y, a.mix(b, .25).mix(c, .25).mix(d, .25));
            }
        }
    }
}

var MouseDrawing = function() {
    this.setup = function() { }

    this.draw = function(t, cell, signals) {
        var onSize = 3;
        var clearSize = 10;

        if (signals.mouse.click > 0) {
            for (var y = 0; y < cell.h; y++) {
                for (var x = 0; x < cell.w; x++) {
                    if (signals.mouse.click == 1 && dist(x, y, signals.mouse.x, signals.mouse.y) <= onSize) {
                        cell.set(x, y, new Color(0, 0, 0));
                    }
                    else if (signals.mouse.click > 1 && dist(x, y, signals.mouse.x, signals.mouse.y) <= clearSize)
                        cell.set(x, y, new Color(255, 255, 255));
                }
            }
        }
    }
}

