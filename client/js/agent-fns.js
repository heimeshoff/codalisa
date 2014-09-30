/**
 * Clip a value x between a lo and a hi value
 */
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

    r = Math.floor(r);
    g = Math.floor(g);
    b = Math.floor(b);

    this.r = clip(r, 0, 255);
    this.g = clip(g, 0, 255);
    this.b = clip(b, 0, 255);
}

Color.grey = function(a) {
    return new Color(a, a, a);
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

Color.prototype.add = function(other, frac) {
    if (frac === undefined) frac = 1;

    var r = this.r + other.r * frac;
    var g = this.g + other.g * frac;
    var b = this.b + other.b * frac;

    return new Color(r, g, b);
}

Color.prototype.sub = function(other, frac) {
    if (frac === undefined) frac = 1;

    var r = this.r - other.r * frac;
    var g = this.g - other.g * frac;
    var b = this.b - other.b * frac;

    return new Color(r, g, b);
}

Color.prototype.scale = function(scale) {
    var r = this.r * scale;
    var g = this.g * scale;
    var b = this.b * scale;

    return new Color(r, g, b);
}

Color.prototype.inv = function() {
    var r = 255 - this.r;
    var g = 255 - this.g;
    var b = 255 - this.b;

    return new Color(r, g, b);
}

Color.prototype.hex = function() {
    var hr = this.r.toString(16);
    var hg = this.g.toString(16);
    var hb = this.b.toString(16);

    if (hr.length < 2) hr = '0' + hr;
    if (hg.length < 2) hg = '0' + hg;
    if (hb.length < 2) hb = '0' + hb;

    return '#' + hr + hg + hb;
}

Color.prototype.avg = function() {
    return (this.r + this.g + this.b) / 3;
}

var dist = function(x, y, x0, y0) {
    var dx = x - x0;
    var dy = y - y0;
    return Math.sqrt(dx * dx + dy * dy);
}
