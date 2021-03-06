/**
 * Agent routines
 */

/**
 * Turn a piece of script into an object with agent functions, or null
 */
function agentControlFromScript(script, filename) {
    try {
        var src = ('(function() { "use strict"; ' +
                script +
                '; return { setup: typeof setup != "undefined" ? setup : function() { }, tick: typeof tick != "undefined" ? tick : function() { } }; }());');
        var obj = eval(src);
        obj.file = filename;
        return obj;
    } catch (e) {
        if (e instanceof SyntaxError)
            return null;
        throw e;
    }
}

/**
 * Agent data
 */
function Agent(ident) {
    var self = this;

    // State and control functions
    this.control = {
        setup: function() {
            self.initialized = false; // Make sure this doesn't count
        },
        tick: function() { }
    };
    this.initialized = false;
    this.ident = ident;
    this.pos = new Vector(0, 0);
    this.v = new Vector(0, 0);
    this.data = {}; // For other routines to annotate agents
}

Agent.prototype.reinit = function() {
    this.initialized = false;
}

Agent.prototype.setControl = function(obj) {
    if (!obj) return;

    this.control.setup = obj.setup;
    this.control.tick = obj.tick;
}

Agent.prototype.tick = function(world) {
    if (!this.initialized) {
        this.initialized = true;
        this.control.setup(world);
    }

    this.control.tick(world);
}

Agent.prototype.move = function(vfps) {
    this.pos = this.pos.plus(this.v.times(1 / vfps));
}

Agent.prototype.logError = function(err) {
    // FIXME: Do something with these
}

/**
 * Probabilistic logging
 */
function plog(x, p) {
    p = typeof(p) === 'undefined' ? 0.05 : p;
    if (Math.random() < p && window.console) 
        console.log(x);
}

function randNr(min, max) {
    if (typeof(max) == 'undefined') {
        max = min;
        min = 0;
    }
        
    return min + Math.random() * (max - min);
}

function maybe(p) {
  return Math.random() < p;
}

function randInt(min, max) {
    if (typeof(max) == 'undefined') {
        max = min;
        min = 0;
    }

    return Math.floor(Math.random() * (max - min)) + min;
}

function pick(arr) {
    return arr[randInt(arr.length)];
}
