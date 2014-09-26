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


var dist = function(x, y, x0, y0) {
    var dx = x - x0;
    var dy = y - y0;
    return Math.sqrt(dx * dx + dy * dy);
}
