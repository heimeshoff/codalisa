/**
 * Yep, vector classes.
 */

function Vector(x, y) {
    this.x = x;
    this.y = y;
}

Vector.fromPolar = function(r, theta) {
    return new Vector(
        r * Math.cos(theta),
        r * Math.sin(theta));
}

Vector.make = function(x) {
    if (x instanceof Vector) return x;
    if (x instanceof Object && 0 in x)
        return new Vector(x[0], x[1]);
    if (typeof(x) == 'number')
        return new Vector(x, x);
    return null;
}

Vector.prototype.plus = function(v) {
    return new Vector(this.x + v.x, this.y + v.y);
}

Vector.prototype.minus = function(v) {
    return new Vector(this.x - v.x, this.y - v.y);
}

Vector.prototype.len = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
}

Vector.prototype.times = function(f) {
    return new Vector(this.x * f, this.y * f);
}

/**
 * Resize the vector to a given length
 */
Vector.prototype.resize = function(l) {
    var factor = l / this.len();
    return new Vector(this.x * factor, this.y * factor);
}

/**
 * Vector modulo another vector
 */
Vector.prototype.mod = function(v) {
    if (0 <= this.x && this.x < v.x && 0 <= this.y && this.y < v.y)
        return this;

    var xx = this.x % v.x;
    if (xx < 0) xx += v.x;
    var yy = this.y % v.y;
    if (yy < 0) yy += v.y;

    return new Vector(xx, yy);
}


/**
 * Rotate by an amount of radians
 */
Vector.prototype.rotate = function(a) {
   var xx = this.x * Math.cos(a) - this.y * Math.sin(a);
   var yy = this.x * Math.sin(a) + this.y * Math.cos(a);
   return new Vector(xx, yy);
}
