/**
 * Fast search for closest objects
 */
var GridIndex = function(w, h, size, log) {
    this.log = log;
    this.size = size;
    this.w = w;
    this.h = h;
    this.cw = Math.ceil(w / this.size);
    this.ch = Math.ceil(h / this.size);
    this.dim = Math.max(this.cw, this.ch);

    // Made 2-dimensional array
    this.grid = [];
    for (var i = 0; i < this.cw; i++) {
        var l = [];
        for (var j = 0; j < this.ch; j++) l.push([]);
        this.grid.push(l);
    }

    // Make a list of search boxes
    this.searches = [[[0, 0]]];
    for (var size = 3; size < this.dim + 1; size += 2) {
        var i0 = -Math.floor(size / 2);
        var j0 = -Math.floor(size / 2);

        // Accumulate the cells along the edge of the rectangle into the
        // candidate list
        var search_span = [];
        for (var s = 0; s < size; s++) {
            search_span.push([i0 + s, j0]);
            search_span.push([i0 + s, j0 + size - 1]);
            if (0 < s && s < size - 1) {
                search_span.push([i0, j0 + s]);
                search_span.push([i0 + size -1, j0 + s]);
            }
        }
        this.searches.push(search_span);
    }
}

GridIndex.prototype.add = function(x, y, obj) {
    if (isNaN(x) || isNaN(y)) return;
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;

    var i = Math.floor(x / this.size);
    var j = Math.floor(y / this.size);

    this.grid[i][j].push([x, y, obj]);
}

/**
 * Do a concentric expanding grid search
 *
 *    +-----------------+
 *    |                 |
 *    |    +-------+    |
 *    |    |       |    |
 *    |    |  [ ]  |    |
 *    |    |       |    |
 *    |    +-------+    |
 *    |                 |
 *    +-----------------+
 *   
 */
GridIndex.prototype.find = function(x, y, exceptIdent) {
    if (isNaN(x) || isNaN(y)) return null;

    var i0 = Math.floor(x / this.size);
    var j0 = Math.floor(y / this.size);

    // Only on the first search, include the center

    // Expanding concentric rects
    var closest_so_far = null;
    for (var k = 0; k < this.searches.length; k++) {
        // If we find any node here, we'll do *one* more circle, return the
        // closest of that.
        var exit_afterwards = closest_so_far != null;
        closest_so_far = this.findClosestIn(x, y, i0, j0, this.searches[k], closest_so_far, exceptIdent);
        if (exit_afterwards) break;
    }

    return closest_so_far ? closest_so_far[2] : null;
}

/**
 * Return the squared distance on the torus
 */
GridIndex.prototype.norm = function(x0, y0, x1, y1) {
    var dx = Math.abs(x0 - x1);
    var dy = Math.abs(y0 - y1);

    var m_dx = Math.min(dx, this.w - dx);
    var m_dy = Math.min(dy, this.h - dy);
    return m_dx * m_dx + m_dy * m_dy;
}

/**
 * Return the closest [x, y, obj], or unchanged if nothing found.
 */
GridIndex.prototype.findClosestIn = function(x, y, i0, j0, cells, closest_so_far, exceptIdent) {
    var closest_len = null;
    if (closest_so_far) {
        closest_len = this.norm(x, y, closest_so_far[0], closest_so_far[1]);
    }

    for (var i = 0; i < cells.length; i++) {
        // Torus
        var cell_i = (i0 + cells[i][0] + this.cw) % this.cw;
        var cell_j = (j0 + cells[i][1] + this.ch) % this.ch;

        if (cell_i < 0 || cell_i >= this.grid.length) continue;
        var column = this.grid[cell_i];
        if (cell_j < 0 || cell_j >= column.length) continue;

        var cell = column[cell_j];
        for (var k = 0; k < cell.length; k++) {
            var obj = cell[k];

            if (exceptIdent && obj[2].ident === exceptIdent) continue;

            var len = this.norm(x, y, obj[0], obj[1]);
            if (closest_len === null || len < closest_len) {
                closest_len = len;
                closest_so_far = obj;
            }
        }
    }

    return closest_so_far;
}

var makeIndex = function(w, h, size, objs, log) {
    var ix = new GridIndex(w, h, size, log);
    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        ix.add(obj.pos.x, obj.pos.y, obj);
    }
    return ix;
}
