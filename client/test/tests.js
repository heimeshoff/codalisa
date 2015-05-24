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
