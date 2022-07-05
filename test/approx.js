import assert from 'assert'

const EPSILON = 0.0001

function isNumber (value) {
  return (value instanceof Number || typeof value === 'number')
}

function equal (a, b, epsilon) {
  if (epsilon === undefined) epsilon = EPSILON

  if (isNumber(a) && isNumber(b)) {
    if (a === b) {
      // exact match
    } else if (isNaN(a)) {
      assert.strictEqual(a.toString(), b.toString())
    } else if (a === 0) {
      assert.ok(Math.abs(b) < epsilon, (a + ' ~= ' + b))
    } else if (b === 0) {
      assert.ok(Math.abs(a) < epsilon, (a + ' ~= ' + b))
    } else {
      const diff = Math.abs(a - b)
      const max = Math.max(Math.abs(a), Math.abs(b))
      assert.ok(diff <= Math.abs(max * epsilon), (a + ' ~= ' + b))
    }
  } else {
    assert.strictEqual(a, b)
  }
}

function deepEqual (a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    assert.strictEqual(a.length, b.length)
    for (let i = 0; i < a.length; i++) deepEqual(a[i], b[i])
  } else if (a instanceof Object && b instanceof Object) {
    for (const prop in a) {
      if (Object.prototype.hasOwnProperty.call(a, prop)) {
        assert.ok(Object.prototype.hasOwnProperty.call(b, prop))
        deepEqual(a[prop], b[prop])
      }
    }
    for (const prop in b) {
      if (Object.prototype.hasOwnProperty.call(b, prop)) {
        assert.ok(Object.prototype.hasOwnProperty.call(a, prop))
      }
    }
  } else {
    equal(a, b)
  }
}

export default { equal, deepEqual }
