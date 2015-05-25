QUnit.test('GridTest', function(assert) {
  for (var i = 0; i < 100; i++) {
    var grid = new GridIndex(900, 900, 100);
    var x0 = Math.random() * 900;
    var y0 = Math.random() * 900;

    var x1 = Math.random() * 900;
    var y1 = Math.random() * 900;

    grid.add(x0, y0, {x: x0, y: y0});
    var f = grid.find(x1, y1);

    assert.ok(f, 'Searching for (' + x0 + ',' + y0 + ') from (' + x1 + ',' + y1 + ')');
  }
});


function clockwise_deg(s, t) {
  return clockwise(rad(s), rad(t));
}

function angle_dist_deg(s, t) {
  return deg(angle_dist(rad(s), rad(t)));
}

function approxEqual(assert, actual, expected) {
  if (Math.abs(actual - expected) < 0.00001)
    assert.ok(true);
  else
    assert.equal(actual, expected);
}

function vectorEqual(assert, actual, expected) {
  assert.equal(String(actual), String(expected));
}

QUnit.test('DirTest', function(assert) {
  assert.equal(clockwise_deg(90, 135), false);
  assert.equal(clockwise_deg(90, 45), true);
  assert.equal(clockwise_deg(10, 55), false);
  assert.equal(clockwise_deg(10, 335), true);
  assert.equal(clockwise_deg(335, 10), false);
  assert.equal(clockwise_deg(10, 180), false);
  assert.equal(clockwise_deg(10, 200), true);
});

QUnit.test('AngleTest', function(assert) {
  approxEqual(assert, angle_dist_deg(90, 135), 45);
  approxEqual(assert, angle_dist_deg(90, 45), -45);
  approxEqual(assert, angle_dist_deg(10, 55), 45);
  approxEqual(assert, angle_dist_deg(10, 325), -45);
  approxEqual(assert, angle_dist_deg(325, 10), 45);
  approxEqual(assert, angle_dist_deg(10, 180), 170);
  approxEqual(assert, angle_dist_deg(10, 200), -170);
  approxEqual(assert, angle_dist_deg(270, 180), -90);
});

QUnit.test('TorusTest', function(assert) {
  var w = new Vector(100, 100);

  var check = function(x, y, expected) {
    assert.equal(String(x.torus_minus(y, w)), String(expected));
  }

  check(new Vector(90, 90), new Vector(80, 80), new Vector(10, 10));
  check(new Vector(90, 90), new Vector(10, 10), new Vector(-20, -20));
  check(new Vector(10, 10), new Vector(90, 90), new Vector(20, 20));

  var gi = new GridIndex(100, 100, 10);
  assert.equal(gi.norm(90, 10, 10, 10), 20 * 20); // Squared distance
});

QUnit.test('AngleDistTest', function(assert) {
  // Right turns (in normal coord system at least)
  approxEqual(assert, deg(angle_dist(rad(270), rad(180))), -90);
  approxEqual(assert, deg(angle_dist(rad(10), rad(325))), -45);

  // Left turns
  approxEqual(assert, deg(angle_dist(rad(10), rad(55))), 45);
  approxEqual(assert, deg(angle_dist(rad(300), rad(10))), 70);
});

QUnit.test('VectorAngleTest', function(assert) {
  approxEqual(assert, deg(new Vector(1, 0).angle()), 0);
  approxEqual(assert, deg(new Vector(1, 1).angle()), 45);
  approxEqual(assert, deg(new Vector(1, -1).angle()), 315);
  approxEqual(assert, deg(new Vector(-33, 59).angle()), 119.21924);
});

QUnit.test('RotateTowardsTest', function(assert) {
  for (var i = 0; i < 30; i++) {
    var v1 = new Vector(Math.random() * 10, Math.random() * 10);
    var v2 = new Vector(Math.random() * 10, Math.random() * 10);

    var d = angle_dist(v1.angle(), v2.angle());
    var v3 = v1.rotate(d);

    approxEqual(assert, v3.angle(), v2.angle());
  }
});

QUnit.test('RotateHalfwayTowardsTest', function(assert) {
  for (var i = 0; i < 30; i++) {
    var v1 = new Vector(Math.random() * 10, Math.random() * 10);
    var v2 = new Vector(Math.random() * 10, Math.random() * 10);

    var d = angle_dist(v1.angle(), v2.angle());
    var v3 = v1.rotate(d * 0.5);

    approxEqual(assert, v3.angle(), (v2.angle() + v1.angle()) / 2);
  }
});
