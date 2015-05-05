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

    var MAX_SPEED = 300; // Pixels per second
    var VFPS = 60;
    var FADE_TIME = VFPS * 10;
    var MAX_PARTICLES_PER_AGENT = FADE_TIME;  // One particle per frame ought to be allowed
    var worldSize = new Vector(w, h);

    self.virtual_fps = VFPS;

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
    var makePerspective = function(agent) {
        return new Perspective(tickNr, agent, self, closest(agents, agent), closest(particles, agent), MAX_SPEED);
    };

    /**
     * Find closest element in list
     *
     * FIXME: Need to take world torusness into account
     */
    var closest = function(list, agent) {
        var cvec = null;
        var clen = 0;
        for (var k in list) {
            if (list[k] !== agent) {
                var d = list[k].pos.minus(agent.pos);
                var len = d.len();
                if (!cvec || len < clen) {
                    cvec = d;
                    clen = len;
                }
            }
        }
        return cvec || new Vector(0, 0);
    };

    var clear = function() {
        ctx.fillStyle = palette[0].toRGB();
        ctx.fillRect(0, 0, w, h);
    };

    var particles_per_agent = { };

    /**
     * Make all agents do a thing
     *
     * Do it in random order, so one agent cannot consistently paint over another.
     *
     * First tick simultaneously, then move simultaneously.
     */
    self.tick = function() {
        tickNr++;
        shuffle(agents);
        for (var k in agents) {
            var agent = agents[k];
            var perspective = makePerspective(agent);
//            try {
                agent.tick(perspective.agentView);
            //} catch (e) {
                //if (window.console) console.error(e);
                //agent.logError(e);
                //if (errorHandler) errorSink(agent.ident, JSON.stringify(e) + ' ' + e.toString());
            //}
        }

        for (var k in agents) {
            agents[k].move(VFPS);
            agents[k].pos = agents[k].pos.mod(worldSize);
        }
    }

    /**
     * Draw all particles, and cull the particles that are too old
     */
    self.draw = function() {
        clear();

        var t_min = tickNr - FADE_TIME;
        for (var k in particles) {
            var alpha_factor = Math.max(0, (particles[k].t0 - t_min) / FADE_TIME);
            particles[k].draw(ctx, alpha_factor);
        }

        var i = 0;
        while (i < particles.length && particles[i].t0 < t_min) {
            particles_per_agent[particles[i].agent_ident]--;
            i++;
        }
        if (i > 0) particles.splice(0, i);
    }

    self.addAgent = function(agent) {
        assert(agent instanceof Agent, 'Not an agent');
        // Start at a random position & offset
        agent.v = Vector.fromPolar(
            Math.random() * MAX_SPEED,
            Math.random() * Math.PI * 2);
        agent.pos = new Vector(
            Math.random() * w,
            Math.random() * h);
        agents.push(agent);
    }

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
        if (particles_per_agent[agent.ident] >= MAX_PARTICLES_PER_AGENT)
            return;

        particle.t0 = tickNr;
        particle.agent_ident = agent.ident;
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
var Perspective = function(t, agent, world, closest_agent, closest_particle, MAX_SPEED) {
    var agent_pos = agent.pos;

    var MAX_DRAW_DISTANCE = 100;
    var MAX_SIZE = 100;

    /**
     * The part of this world that an agent is allowed to see
     */
    this.agentView = {
        t: t,
        last_pos: agent.pos.minus(agent.last_pos), // FIXME: Torus
        closest_agent: closest_agent,
        closest_particle: closest_particle,
        turn: function(degrees) {
            agent.v = agent.v.rotate(degrees / 180 * Math.PI);
        },
        left: function(degrees) {
            this.turn(degrees);
        },
        right: function(degrees) {
            this.turn(-degrees);
        },
        setSpeed: function(speed) {
            agent.v = agent.v.resize(abs_clip(speed, MAX_SPEED));
        },
        scaleSpeed: function(f) {
            var speed = agent.v.len();
            agent.v = agent.v.resize(abs_clip(speed * f, MAX_SPEED));
        },
        adjustSpeed: function(tr, clip_at_zero) {
            var ns = speed + tr;
            if (clip_at_zero && ns < 0) ns = 0;

            agent.v = agent.v.resize(abs_clip(ns, MAX_SPEED));
        },
        signals: { }, // FIXME: Signals

        // Drop particle
        drop: function(pos, size, form, color, rotation, alpha) {
            pos = Vector.make(pos);
            if (!pos) pos = new Vector(0, 0);
            form = form || 'circle';
            size = Vector.make(size);
            if (!size) size = new Vector(10, 10);
            color = color || new Color(0, 0, 0);

            if (pos.len() > MAX_DRAW_DISTANCE) pos = pos.resize(MAX_DRAW_DISTANCE);
            if (size.len() > MAX_SIZE) size = size.resize(MAX_SIZE);
            world.addParticle(agent, new Particle(agent.pos.plus(pos), form, color, size, rotation, alpha));
        }
    };
};


/**
 * A dropped particle, either circle, rectangle or triangle
 */
var Particle = function(pos, form, color, size, rotation, alpha) {
    assert(pos instanceof Vector, 'pos not a Vector');
    assert(size instanceof Vector, 'size not a Vector');
    assert(color instanceof Color, 'color not a Color');

    this.pos = pos;
    this.form = form;
    this.size = size || new Vector(5, 5);
    this.rotation = rotation || 0;
    this.color = color;
    this.alpha = typeof(alpha) == 'undefined' ? 1 : alpha;
}

Particle.prototype.draw = function(ctx, alpha_factor) {
    var af = typeof(alpha_factor) == 'undefined' ? 1 : alpha_factor;
    ctx.save();
    ctx.fillStyle = this.color.toRGBA(this.alpha * af);
    ctx.translate(this.pos.x, this.pos.y);
    ctx.scale(this.size.x, this.size.y);
    ctx.rotate(this.rotation);
    if (this.form == 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, 0.5, 0, 2 * Math.PI, true);
        ctx.fill();
        ctx.closePath();
    }
    else if (this.form == 'triangle') {
        ctx.beginPath();
        var twoThirds = 2/3;
        var oneThirds = 1/3;
        ctx.moveTo(0, -twoThirds);
        ctx.lineTo(-0.5, oneThirds);
        ctx.lineTo( 0.5, oneThirds);
        ctx.closePath();
        ctx.fill();
    }
    else {
        ctx.fillRect(-0.5, -0.5, 1, 1);
    }
    ctx.restore();
}


var MouseSignalGrabber = function(element) {
    var mx = 0;
    var my = 0;
    var click = 0.0;

    $(element).mousemove(function(ev) {
        var elOfs = $(element).offset(); 
        var Xaspect = element.width ? element.width / $(element).width() : 1;
        var Yaspect = element.height ? element.height / $(element).height() : 1;

        mx = (ev.pageX - elOfs.left) * Xaspect;
        my = (ev.pageY - elOfs.top) * Yaspect;
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

/**
 * The Simulation drives the world
 *
 * FPS = 0 means as fast as possible, otherwise we're targeting a particular
 * frame rate.
 *
 * We're targeting a virtual FPS 
 */
var Simulation = function(world, fps, reportFps) {
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

    var driveTick = function(t) {
        // We may have multiple world ticks per invocation
        var targetTick = tick0 + (Date.now() - t0) * (world.virtual_fps / 1000);
        var ticked = false;
        while (world.tickNr() < targetTick) {
            world.tick();
            ticked = true;
        }
        // But we draw at most once
        if (ticked) {
            world.draw();
            frames++;
        }

        if (fps == 0)
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

        if (!burnBabyBurn) 
            window.clearInterval(timer);
    };

    this.setSignals = function(sigs) {
        signals = sigs;
    };
};
