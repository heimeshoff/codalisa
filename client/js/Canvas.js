/**
 * Fisher-Yates shuffle
 */
function shuffle(array) {
    var counter = array.length, temp, index;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

var abs_clip = function(x, max) {
    if (x > max) return max;
    if (x < -max) return -max;
    return x;
}

/**
 * World is the world we're living in
 */
var World = function(w, h, canvasEl, errorHandler) {
    var self = this;

    var physics = {};
    physics.MAX_SPEED = 300; // Pixels per second
    physics.MIN_SPEED = 50; // pps
    physics.VFPS = 60;
    physics.FADE_TIME = physics.VFPS * 10;
    physics.MAX_PARTICLES_PER_AGENT = physics.FADE_TIME;  // One particle per frame ought to be allowed
    physics.MAX_DRAW_DISTANCE = 100;
    physics.MAX_SIZE = 150;
    physics.WORLD = new Vector(w, h);

    self.virtual_fps = physics.VFPS;

    self.canvasEl = canvasEl;
    canvasEl.width = w;
    canvasEl.height = h;

    var ctx = canvasEl.getContext('2d');

    self.width = function() { return w; }
    self.height = function() { return h; }

    var agents = [];
    var particles = [];

    var tickNr = 0;

    self.tickNr = function() {
        return tickNr;
    }

    /**
     * Make a World object from the perspective of a particular agent
     */
    var makePerspective = function(agent, signals, indexes) {
        return new Perspective(
                tickNr, agent, self,
                indexes.agents.find(agent.pos.x, agent.pos.y, agent.ident),
                indexes.particles.find(agent.pos.x, agent.pos.y, agent.ident),
                physics, signals);
    };

    var clear = function() {
        ctx.fillStyle = palette[0].toRGB();
        ctx.fillRect(0, 0, w, h);
    };

    var particles_per_agent = { };

    var makeIndexes = function() {
        return {
            agents: makeIndex(w, h, 100, agents, true),
            particles: makeIndex(w, h, 100, particles)
        };
    }

    /**
     * Make all agents do a thing
     *
     * Do it in random order, so one agent cannot consistently paint over another.
     *
     * First tick simultaneously, then move simultaneously.
     */
    self.tick = function(signals) {
        var indexes = makeIndexes();

        tickNr++;
        shuffle(agents);
        for (var k in agents) {
                var agent = agents[k];
            var perspective = makePerspective(agent, signals, indexes);
            try {
                agent.tick(perspective.agentView);
            } catch (e) {
                if (window.console && tickNr % 100 == 0) console.error(e);
                agent.logError(e);
                if (errorHandler) errorHandler(agent.ident, JSON.stringify(e) + ' ' + e.toString());
            }
        }

        for (var k in agents) {
            agents[k].move(physics.VFPS);
            agents[k].pos = agents[k].pos.mod(physics.WORLD);
        }
    }

    /**
     * Draw all particles, and cull the particles that are too old
     */
    self.draw = function() {
        clear();

        var t_min = tickNr - physics.FADE_TIME;
        for (var k = 0; k < particles.length; k++) {
            var alpha_factor = Math.max(0, (particles[k].t0 - t_min) / physics.FADE_TIME);
            particles[k].draw(ctx, alpha_factor);
        }

        var i = 0;
        while (i < particles.length && particles[i].t0 < t_min) {
            particles_per_agent[particles[i].ident]--;
            i++;
        }
        if (i > 0) {
            particles.splice(0, i);
        }
    }

    self.addAgent = function(agent) {
        assert(agent instanceof Agent, 'Not an agent');
        agents.push(agent);
        self.reinit(agent.ident);
        return agent;
    }

    self.reinit = function(ident) {
        var agent = self.agent(ident);
        // Start at a random position & offset
        agent.v = Vector.fromPolar(
            Math.random() * (physics.MAX_SPEED - physics.MIN_SPEED),
            Math.random() * Math.PI * 2);
        agent.v = agent.v.resize(agent.v.len() + physics.MIN_SPEED);
        agent.pos = new Vector(
            Math.random() * w,
            Math.random() * h);
        agent.reinit();
    };

    self.deleteAgent = function(ident) {
        for (var k in agents)
            if (agents[k].ident == ident)
            {
                agents.splice(k, 1);
                return;
            }
    }

    self.agent = function(ident) {
        for (var k in agents)
            if (agents[k].ident == ident)
                return agents[k];
        return null;
    }

    self.addParticle = function(agent, particle) {
        assert(particle instanceof Particle, 'Not a particle');
        if (!(agent.ident in particles_per_agent)) particles_per_agent[agent.ident] = 0;

        // It's better to delete the oldest ones, but also more expensive. So
        // let's just forbid it atm.
        if (particles_per_agent[agent.ident] >= physics.MAX_PARTICLES_PER_AGENT)
            return;

        particle.t0 = tickNr;
        particle.ident = agent.ident;
        particles_per_agent[agent.ident]++;
        particles.push(particle);
    }
}

/**
 * A perspective is a particular agent's view of the world
 *
 * INFO
 * - Last position, relative to current position which is always (0, 0)
 * - Time
 * - Nearest agent
 * - Nearest particle
 *
 * MODIFICATIONS
 * - Rotate speed vector
 * - Change speed vector length (up to a maximum and minimum)
 * - Draw line or particle
 */
var Perspective = function(t, agent, world, closest_agent, closest_particle, physics, signals) {
    if (!('last_pos' in agent.data)) agent.data.last_pos = agent.pos;

    // Using this counter, we can identify subsequent hz
    // statements, so users don't need to give them names.
    var every_ctr = 0;

    if (!closest_agent) closest_agent = agent;
    if (!closest_particle) closest_particle = agent;

    /**
     * The part of this world that an agent is allowed to see
     */
    this.agentView = {
        t: t,
        v: agent.v,
        last_pos: agent.pos.torus_minus(agent.data.last_pos, physics.WORLD),
        remember_pos: function() {
            agent.data.last_pos = agent.pos;
        },
        closest_agent: closest_agent ? closest_agent.pos.torus_minus(agent.pos, physics.WORLD) : null,
        closest_particle: closest_particle ? closest_particle.pos.torus_minus(agent.pos, physics.WORLD) : null,
        turn: function(degrees) {
            // Note: degrees other way around because y axis inverted
            agent.v = agent.v.rotate(-degrees / 180 * Math.PI);
        },
        turnTo: function(vec, factor) {
            if (!vec) return;
            if (factor !== undefined) {
                var d = angle_dist(agent.v.angle(), vec.angle());
                agent.v = agent.v.rotate(d * factor);
            }
            else {
                var speed = agent.v.len();
                agent.v = vec.resize(speed);
            }
        },
        left: function(degrees) {
            this.turn(degrees);
        },
        right: function(degrees) {
            this.turn(-degrees);
        },
        setSpeed: function(speed) {
            agent.v = agent.v.resize(abs_clip(speed, physics.MAX_SPEED));
        },
        scaleSpeed: function(f) {
            var speed = agent.v.len();
            agent.v = agent.v.resize(abs_clip(speed * f, physics.MAX_SPEED));
        },
        setV: function(v) {
            v = Vector.make(v);
            if (!(v instanceof Vector)) return;
            agent.v = v.resize(abs_clip(v.len(), physics.MAX_SPEED));
        },
        adjustSpeed: function(tr, clip_at_zero) {
            var ns = agent.v.len() + tr;
            if (clip_at_zero && ns < 0) ns = 0;

            agent.v = agent.v.resize(abs_clip(ns, physics.MAX_SPEED));
        },
        signals: Object.create(signals), // Make sure agents can't mess with the source object

        // Drop particle
        // If line, pos = x0 and size = x1.
        drop: function(shape, pos, size, color, alpha, rotation, borderColor) {
            shape = shape || 'circle';
            pos = Vector.make(pos);
            if (!pos) pos = new Vector(0, 0);
            size = Vector.make(size);
            if (!size) size = new Vector(10, 10);
            color = color || new Color(0, 0, 0);

            if (pos.len() > physics.MAX_DRAW_DISTANCE) pos = pos.resize(physics.MAX_DRAW_DISTANCE);
            if (size.len() > physics.MAX_SIZE) size = size.resize(physics.MAX_SIZE);
            world.addParticle(agent, new Particle(agent.pos.plus(pos), shape, color, size, rotation, alpha, borderColor));
        },

        // Do something every d frames
        every: function(d, name) {
            var key = 'time_' + name;
            if (!name) {
                every_ctr++;
                key = 'time_default' + every_ctr;
            }
            var ret = !(key in agent.data) || (agent.data[key] + d <= t);
            if (ret) agent.data[key] = t;
            return ret;
        },

        hz: function(d, name) {
            return this.every(Math.max(physics.VFPS / d, 1), name);
        },

        periodic: function(d) {
            return Math.floor(t / (d * physics.VFPS)) % 2 == 0;
        }
    };
};


/**
 * A dropped particle, either circle, rectangle or triangle
 */
var Particle = function(pos, shape, color, size, rotation, alpha, borderColor) {
    assert(pos instanceof Vector, 'pos not a Vector');
    assert(size instanceof Vector, 'size not a Vector');
    assert(color instanceof Color, 'color not a Color');

    this.pos = pos;
    this.shape = shape;
    this.size = size || new Vector(5, 5);
    this.rotation = rotation || 0;
    this.color = color;
    this.alpha = typeof(alpha) == 'undefined' ? 1 : alpha;
    this.borderColor = borderColor;

    // We only need to push and pop a transformation matrix if we do rotation
    // on a shape where that's visible, or uneven scaling on a circle. This
    // saves a lot of CPU. 
    this.pushState = ((this.shape == 'rect' || this.shape == 'triangle') && this.rotation != 0)
                   || (this.shape == 'circle' && this.size.x != this.size.y);
}

Particle.prototype.draw = function(ctx, alpha_factor) {
    var af = typeof(alpha_factor) == 'undefined' ? 1 : alpha_factor;

    var pos = this.pos;
    var size = this.size;
    if (this.pushState) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.scale(this.size.x, this.size.y);
        ctx.rotate(this.rotation);
        // Translation and scale are already encoded in the transformation
        // matrix
        pos = new Vector(0, 0);
        size = new Vector(1, 1);
    }

    var shape = this.shape; // Micro-optimization!

    if (shape == 'line')
        ctx.strokeStyle = this.color.toRGBA(this.alpha * af);
    else {
        // These parameters only for non-lines
        ctx.fillStyle = this.color.toRGBA(this.alpha * af);
        if (this.borderColor) ctx.strokeStyle = this.borderColor.toRGBA(this.alpha * af);
    }

    if (shape == 'line') {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + size.x, pos.y + size.y);
        ctx.stroke();
        ctx.closePath();
    }
    else if (shape == 'circle') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size.x / 2, 0, TAU, true);
        ctx.fill();
        if (this.borderColor) ctx.stroke();
        ctx.closePath();
    }
    else if (shape == 'triangle') {
        ctx.beginPath();
        var twoThirdsY = 2/3 * size.y;
        var oneThirdsY = 1/3 * size.y;

        ctx.moveTo(pos.x, -twoThirdsY);
        ctx.lineTo(pos.x + -0.5 * size.x, oneThirdsY);
        ctx.lineTo(pos.x +  0.5 * size.x, oneThirdsY);
        ctx.closePath();
        ctx.fill();
        if (this.borderColor) ctx.stroke();
    }
    else {
        ctx.fillRect(pos.x - 0.5 * size.x, pos.y - 0.5 * size.y, size.x, size.y);
        if (this.borderColor) ctx.strokeRect(pos.x - 0.5 * size.x, pos.y - 0.5 * size.y, size.x, size.y);
    }

    if (this.pushState) {
        ctx.restore();
    }
}

var MouseAgent = function(element, ident) {
    Agent.call(this, ident);

    var self = this;
    $(element).mousemove(function(ev) {
        var elOfs = $(element).offset(); 
        var Xaspect = element.width ? element.width / $(element).width() : 1;
        var Yaspect = element.height ? element.height / $(element).height() : 1;

        var mx = (ev.pageX - elOfs.left) * Xaspect;
        var my = (ev.pageY - elOfs.top) * Yaspect;

        self.pos = new Vector(mx, my);
        self.v = new Vector(0, 0);
    });
}
MouseAgent.prototype = new Agent();

/**
 * The Simulation drives the world
 *
 * FPS = 0 means as fast as possible, otherwise we're targeting a particular
 * frame rate.
 *
 * We're targeting a virtual FPS 
 */
var Simulation = function(world, fps, reportFps, times) {
    var signals = {};
    var t0;
    var tick0;

    /**
     * Frame counter
     */
    var frames = 0;
    setInterval(function() {
        if (reportFps) reportFps(frames);
        frames = 0;
    }.bind(this), 1000);

    var self = this;

    var driveTick = function(t) {
        // We may have multiple world ticks per invocation
        var targetTick = tick0 + (Date.now() - t0) * (world.virtual_fps / 1000);
        var ticked = false;
        while (world.tickNr() < targetTick) {
            world.tick(signals);
            ticked = true;
        }
        // But we draw at most once
        if (ticked) {
            world.draw();
            frames++;
        }

        if (times !== undefined) {
            if (times-- == 0) self.stop();
        }

        if (fps == 0 && running)
            window.requestAnimationFrame(driveTick);
    }

    var running;
    this.start = function() {
        if (running) return;
        running = true;

        t0 = Date.now();
        tick0 = world.tickNr();

        if (fps == 0)
            window.requestAnimationFrame(driveTick);
        else
            timer = window.setInterval(driveTick, 1000 / fps);
    };

    this.stop = function() {
        if (!running) return;
        running = false;

        if (fps != 0) 
            window.clearInterval(timer);
    };

    this.toggle = function() {
        if (running)
            this.stop();
        else
            this.start();
    }

    this.setSignals = function(sigs) {
        signals = sigs || {};
    };
};
