/* globals GAME_LEVELS */
// Based on Dark Blue Game by Thomas Palef. 
// This game is from the book eloquentjavascript.net
// Code with solution to exercises. 

// CONSTANTS
//==================================================
var SCALE = 20;
var MAX_STEP = 0.5;
var WOOBLE_SPEED = 8;
var WOOBLE_DIST = 0.07;
var PLAYER_X_SPEED = 7;
var GRAVITY = 30;
var JUMP_SPEED = 17;
var ARROW_CODES = {
    27: 'pause',
    37: 'left',
    38: 'up',
    39: 'right'
};
var ACTOR_CHARS = {
    '@': Player,
    'o': Coin,
    '=': Lava,
    '|': Lava,
    'v': Lava
};
var LIVES = 3;
var PAUSE = false;
// VECTOR
//==================================================
function Vector(x, y) {
    this.x = x;
    this.y = y;
}

Vector.prototype.plus = function (otherV) {
    return new Vector(this.x + otherV.x, this.y + otherV.y);
};

Vector.prototype.times = function (factor) {
    return new Vector(this.x * factor, this.y * factor);
};

// LEVEL
//==================================================
function Level(plan) {
    this.width = plan[0].length;
    this.height = plan.length;
    this.grid = [];
    this.actors = [];

    for (var y = 0; y < this.height; y++) {
        var line = plan[y],
            gridLine = [];
        for (var x = 0; x < this.width; x++) {
            var ch = line[x],
                fieldType = null;
            var Actor = ACTOR_CHARS[ch];
            if (Actor) {
                this.actors.push(new Actor(new Vector(x, y), ch));
            } else if (ch === 'x') {
                fieldType = 'wall';
            } else if (ch === '!') {
                fieldType = 'lava';
            }
            gridLine.push(fieldType);
        }
        this.grid.push(gridLine);
    }

    this.player = this.actors.filter(function (actor) {
        return actor.type === 'player';
    })[0];
    this.status = this.finishDelay = null;
}

Level.prototype.isFinished = function () {
    return this.status !== null && this.finishDelay < 0;
};

Level.prototype.obstacleAt = function (pos, size) {
    var xStart = Math.floor(pos.x);
    var xEnd = Math.ceil(pos.x + size.x);
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0) {
        return 'wall';
    }
    if (yEnd > this.height) {
        return 'lava';
    }
    for (var y = yStart; y < yEnd; y++) {
        for (var x = xStart; x < xEnd; x++) {
            var fieldType = this.grid[y][x];
            if (fieldType) {
                return fieldType;
            }
        }
    }
};

Level.prototype.actorAt = function (actor) {
    for (var i = 0; i < this.actors.length; i++) {
        var other = this.actors[i];
        if (other !== actor &&
            actor.pos.x + actor.size.x > other.pos.x &&
            actor.pos.x < other.pos.x + other.size.x &&
            actor.pos.y + actor.size.y > other.pos.y &&
            actor.pos.y < other.pos.y + other.size.y) {
            return other;
        }
    }
};

Level.prototype.animate = function (step, keys) {
    if (this.status !== null) {
        this.finishDelay -= step;
    }

    while (step > 0) {
        var thisStep = Math.min(step, MAX_STEP);
        this.actors.forEach(actorAct, this);
        step -= thisStep;
    }

    function actorAct(actor) {
        actor.act(thisStep, this, keys);
    }
};

Level.prototype.playerTouched = function (type, actor) {
    if (type === 'lava' && this.status === null) {
        this.status = 'lost';
        this.finishDelay = 1;
    } else if (type === 'coin') {
        this.actors = this.actors.filter(function (other) {
            return other !== actor;
        });
        if (!this.actors.some(function (actor) {
                return actor.type === 'coin';
            })) {
            this.status = 'won';
            this.finishDelay = 1;
        }
    }
};

// PLAYER
//==================================================
function Player(pos) {
    this.pos = pos.plus(new Vector(0, -0.5));
    this.size = new Vector(0.8, 1.5);
    this.speed = new Vector(0, 0);
}

Player.prototype.type = 'player';

Player.prototype.moveX = function (step, level, keys) {
    this.speed.x = 0;
    if (keys.left) {
        this.speed.x -= PLAYER_X_SPEED;
    }
    if (keys.right) {
        this.speed.x += PLAYER_X_SPEED;
    }
    var motion = new Vector(this.speed.x * step, 0);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) {
        level.playerTouched(obstacle);
    } else {
        this.pos = newPos;
    }
};

Player.prototype.moveY = function (step, level, keys) {
    this.speed.y += step * GRAVITY;
    var motion = new Vector(0, this.speed.y * step);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle) {
        level.playerTouched(obstacle);
        if (keys.up && this.speed.y > 0) {
            this.speed.y = -JUMP_SPEED;
        } else {
            this.speed.y = 0;
        }
    } else {
        this.pos = newPos;
    }
};

Player.prototype.act = function (step, level, keys) {
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    var otherActor = level.actorAt(this);
    if (otherActor) {
        level.playerTouched(otherActor.type, otherActor);
    }

    // Losing animation
    if (level.status === 'lost') {
        this.pos.y += step;
        this.size.y -= step;
    }
};

// COIN
//==================================================
function Coin(pos) {
    this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
    this.size = new Vector(0.6, 0.6);
    this.wobble = Math.random() * Math.PI * 2;
}

Coin.prototype.type = 'coin';

Coin.prototype.act = function (step) {
    this.wobble += step * WOOBLE_SPEED;
    var wobblePos = Math.sin(this.wobble) * WOOBLE_DIST;
    this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

// LAVA
//==================================================
function Lava(pos, ch) {
    this.pos = pos;
    this.size = new Vector(1, 1);
    if (ch === '=') {
        this.speed = new Vector(2, 0);
    } else if (ch === '|') {
        this.speed = new Vector(0, 2);
    } else if (ch === 'v') {
        this.speed = new Vector(0, 3);
        this.repeatPos = pos;
    }
}

Lava.prototype.type = 'lava';

Lava.prototype.act = function (step, level) {
    var newPos = this.pos.plus(this.speed.times(step));
    if (!level.obstacleAt(newPos, this.size)) {
        this.pos = newPos;
    } else if (this.repeatPos) {
        this.pos = this.repeatPos;
    } else {
        this.speed = this.speed.times(-1);
    }
};

// HELPER FUNCTIONS
//==================================================
function newElement(name, className) {
    var newE = document.createElement(name);
    if (className) {
        newE.className = className;
    }
    return newE;
}

// DOMDISPLAY
//==================================================
function DOMDisplay(parent, level) {
    this.wrap = parent.appendChild(newElement('div', 'game'));
    this.level = level;

    this.wrap.appendChild(this.drawBackground());
    this.actorLayer = null;
    this.drawFrame();
}

DOMDisplay.prototype.drawBackground = function () {
    var table = newElement('table', 'background');
    table.style.width = this.level.width * SCALE + 'px';
    this.level.grid.forEach(function (row) {
        var newRow = table.appendChild(newElement('tr'));
        newRow.style.height = SCALE + 'px';
        row.forEach(function (type) {
            newRow.appendChild(newElement('td', type));
        });
    });
    return table;
};

DOMDisplay.prototype.drawActors = function () {
    var wrap = newElement('div');
    this.level.actors.forEach(function (actor) {
        var rect = wrap.appendChild(newElement('div', 'actor ' + actor.type));
        rect.style.width = actor.size.x * SCALE + 'px';
        rect.style.height = actor.size.y * SCALE + 'px';
        rect.style.left = actor.pos.x * SCALE + 'px';
        rect.style.top = actor.pos.y * SCALE + 'px';
    });
    return wrap;
};

DOMDisplay.prototype.drawFrame = function () {
    if (this.actorLayer) {
        this.wrap.removeChild(this.actorLayer);
    }
    this.actorLayer = this.wrap.appendChild(this.drawActors());
    this.wrap.className = "game " + (this.level.status || "");
    this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function () {
    var width = this.wrap.clientWidth;
    var height = this.wrap.clientHeight;
    var margin = width / 3;

    // The viewport
    var left = this.wrap.scrollLeft,
        rigth = left + width;
    var top = this.wrap.scrollTop,
        bottom = top + height;

    var player = this.level.player;
    var center = player.pos.plus(player.size.times(0.5)).times(SCALE);

    if (center.x < left + margin) {
        this.wrap.scrollLeft = center.x - margin;
    } else if (center.x > rigth - margin) {
        this.wrap.scrollLeft = center.x + margin - width;
    }

    if (center.y < top + margin) {
        this.wrap.scrollTop = center.y - margin;
    } else if (center.y > bottom - margin) {
        this.wrap.scrollTop = center.y + margin - height;
    }
};

DOMDisplay.prototype.clear = function () {
    this.wrap.parentNode.removeChild(this.wrap);
};

// KEYBOARD HANDLER EVENTS
//==================================================
function trackKeys(codes) {
    var pressed = Object.create(null);

    function handler(event) {
        if (codes.hasOwnProperty(event.keyCode)) {
            var down = event.type === 'keydown';
            pressed[codes[event.keyCode]] = down;
            event.preventDefault();
        }
    }

    function pause(event) {
        if (codes.hasOwnProperty(event.keyCode) && codes[event.keyCode] === 'pause') {
            PAUSE = !PAUSE;
            if (PAUSE) {
                console.log('GAME PAUSED');
                stopMotion();
            } else {
                console.log('GAME RESUMED');
                activateMotion();
            }
            event.preventDefault();
        }
    }

    function activateMotion() {
        addEventListener('keydown', handler);
        addEventListener('keyup', handler);
    }

    function stopMotion() {
        removeEventListener('keydown', handler);
        removeEventListener('keyup', handler);
    }

    activateMotion();
    addEventListener('keyup', pause);
    return pressed;
}

// ANIMATION
//==================================================
function runAnimation(frameFunc) {
    var lastTime = null;

    function frame(time) {
        var stop = false;
        if (lastTime !== null) {
            var timeStep = Math.min(time - lastTime, 100) / 1000;
            stop = frameFunc(timeStep) === false;
        }
        lastTime = time;
        if (!stop) {
            requestAnimationFrame(frame);
        }
    }
    requestAnimationFrame(frame);
}

// THE GAME
//==================================================
var arrows = trackKeys(ARROW_CODES);

function runLevel(level, Display, andThen) {
    var display = new Display(document.body, level);
    runAnimation(function (step) {
        if (!PAUSE) {
            level.animate(step, arrows);
            display.drawFrame(step);
            if (level.isFinished()) {
                display.clear();
                if (andThen) {
                    andThen(level.status);
                }
                return false;
            }
        } else {
            // jshint -W089
            for (var k in arrows) {
                arrows[k] = false;
            }
        }
    });
}

function runGame(plans, Display) {
    function startLevel(n) {
        runLevel(new Level(plans[n]), Display, function (status) {
            if (status === 'lost') {
                LIVES -= 1;
                if (LIVES > 0) {
                    startLevel(n);
                } else {
                    console.log('GAME OVER');
                    LIVES = 3;
                    startLevel(0);
                }
            } else if (n < plans.length - 1) {
                startLevel(n + 1);
            } else {
                console.log("You win!");
            }
            console.log('Lives->', LIVES);
        });
    }
    console.log('Lives->', LIVES);
    startLevel(0);
}

// LET'S PLAY
//==================================================
runGame(GAME_LEVELS, DOMDisplay);