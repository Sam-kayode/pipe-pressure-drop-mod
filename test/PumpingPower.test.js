import assert from 'assert'
import PumpingPower from '../src/PumpingPower.js'
import approx from './approx.js'

const BASE = { pressureDrop: 241.3, flowRate: 0.1, pumpEfficiency: 1.0 }

describe('PumpingPower', () => {
  describe('constructor', () => {
    it('should accept valid parameters including default efficiency', () => {
      const p = new PumpingPower({ pressureDrop: 100, flowRate: 0.5 })
      assert.strictEqual(p.pressureDrop, 100)
      assert.strictEqual(p.flowRate, 0.5)
      assert.strictEqual(p.pumpEfficiency, 1.0)
    })

    it('should accept explicit pump efficiency', () => {
      const p = new PumpingPower({ ...BASE, pumpEfficiency: 0.75 })
      assert.strictEqual(p.pumpEfficiency, 0.75)
    })

    it('should throw on non-positive pressureDrop', () => {
      assert.throws(() => new PumpingPower({ ...BASE, pressureDrop: 0 }),   /pressureDrop/)
      assert.throws(() => new PumpingPower({ ...BASE, pressureDrop: -10 }), /pressureDrop/)
    })

    it('should throw on non-positive flowRate', () => {
      assert.throws(() => new PumpingPower({ ...BASE, flowRate: 0 }),    /flowRate/)
      assert.throws(() => new PumpingPower({ ...BASE, flowRate: -0.1 }), /flowRate/)
    })

    it('should throw on pumpEfficiency ≤ 0', () => {
      assert.throws(() => new PumpingPower({ ...BASE, pumpEfficiency: 0 }),  /pumpEfficiency/)
      assert.throws(() => new PumpingPower({ ...BASE, pumpEfficiency: -1 }), /pumpEfficiency/)
    })

    it('should throw on pumpEfficiency > 1', () => {
      assert.throws(() => new PumpingPower({ ...BASE, pumpEfficiency: 1.01 }), /pumpEfficiency/)
      assert.throws(() => new PumpingPower({ ...BASE, pumpEfficiency: 2.0 }),  /pumpEfficiency/)
    })

    it('should accept pumpEfficiency = 1 (ideal pump)', () => {
      const p = new PumpingPower({ ...BASE, pumpEfficiency: 1 })
      assert.strictEqual(p.pumpEfficiency, 1)
    })
  })

  describe('hydraulicPower', () => {
    it('should equal pressureDrop × flowRate', () => {
      const p = new PumpingPower(BASE)
      approx.equal(p.hydraulicPower, BASE.pressureDrop * BASE.flowRate)
    })

    it('should scale linearly with flowRate', () => {
      const p1 = new PumpingPower({ ...BASE, flowRate: 0.1 })
      const p2 = new PumpingPower({ ...BASE, flowRate: 0.2 })
      approx.equal(p2.hydraulicPower / p1.hydraulicPower, 2)
    })

    it('should scale linearly with pressureDrop', () => {
      const p1 = new PumpingPower({ ...BASE, pressureDrop: 100 })
      const p2 = new PumpingPower({ ...BASE, pressureDrop: 400 })
      approx.equal(p2.hydraulicPower / p1.hydraulicPower, 4)
    })
  })

  describe('shaftPower', () => {
    it('should equal hydraulicPower for a perfect pump (η = 1)', () => {
      const p = new PumpingPower(BASE)
      assert.strictEqual(p.shaftPower, p.hydraulicPower)
    })

    it('should be greater than hydraulicPower for η < 1', () => {
      const p = new PumpingPower({ ...BASE, pumpEfficiency: 0.75 })
      assert(p.shaftPower > p.hydraulicPower)
    })

    it('should equal hydraulicPower / pumpEfficiency', () => {
      const p = new PumpingPower({ ...BASE, pumpEfficiency: 0.80 })
      approx.equal(p.shaftPower, p.hydraulicPower / 0.80)
    })

    it('should double when efficiency halves', () => {
      const p1 = new PumpingPower({ ...BASE, pumpEfficiency: 0.80 })
      const p2 = new PumpingPower({ ...BASE, pumpEfficiency: 0.40 })
      approx.equal(p2.shaftPower / p1.shaftPower, 2)
    })
  })

  describe('unit conversions — hydraulic power', () => {
    it('hydraulicPowerHp should equal hydraulicPower / 550', () => {
      const p = new PumpingPower(BASE)
      approx.equal(p.hydraulicPowerHp, p.hydraulicPower / 550)
    })

    it('hydraulicPowerWatts should equal hydraulicPower × 1.35582', () => {
      const p = new PumpingPower(BASE)
      approx.equal(p.hydraulicPowerWatts, p.hydraulicPower * 1.35582, 0.001)
    })

    it('hydraulicPowerKW should equal hydraulicPowerWatts / 1000', () => {
      const p = new PumpingPower(BASE)
      approx.equal(p.hydraulicPowerKW, p.hydraulicPowerWatts / 1000)
    })
  })

  describe('unit conversions — shaft power', () => {
    it('shaftPowerHp should equal shaftPower / 550', () => {
      const p = new PumpingPower({ ...BASE, pumpEfficiency: 0.75 })
      approx.equal(p.shaftPowerHp, p.shaftPower / 550)
    })

    it('shaftPowerWatts should equal shaftPower × 1.35582', () => {
      const p = new PumpingPower({ ...BASE, pumpEfficiency: 0.75 })
      approx.equal(p.shaftPowerWatts, p.shaftPower * 1.35582, 0.001)
    })

    it('shaftPowerKW should equal shaftPowerWatts / 1000', () => {
      const p = new PumpingPower({ ...BASE, pumpEfficiency: 0.75 })
      approx.equal(p.shaftPowerKW, p.shaftPowerWatts / 1000)
    })
  })

  describe('known hand-calculated example', () => {
    it('should match hydraulic power for 2-in pipe, Q=0.1, ΔP=241.3 lbf/ft²', () => {
      // P_fluid = 241.3 × 0.1 = 24.13 ft·lbf/s
      // P_hp    = 24.13 / 550 = 0.04387 hp
      // P_W     = 24.13 × 1.35582 = 32.72 W
      const p = new PumpingPower({ pressureDrop: 241.3, flowRate: 0.1 })
      approx.equal(p.hydraulicPower,       24.13,   0.01)
      approx.equal(p.hydraulicPowerHp,      0.04387, 0.02)
      approx.equal(p.hydraulicPowerWatts,  32.72,   0.02)
    })

    it('should apply pump efficiency correctly', () => {
      // Same as above but η = 0.75  →  P_shaft = 24.13 / 0.75 = 32.17 ft·lbf/s
      const p = new PumpingPower({ pressureDrop: 241.3, flowRate: 0.1, pumpEfficiency: 0.75 })
      approx.equal(p.shaftPower,   24.13 / 0.75, 0.01)
      approx.equal(p.shaftPowerHp, p.shaftPower / 550)
    })
  })

  describe('summary', () => {
    it('should return all nine power keys', () => {
      const p = new PumpingPower(BASE)
      const s = p.summary()
      const keys = [
        'pumpEfficiency',
        'hydraulicPower', 'hydraulicPowerHp', 'hydraulicPowerWatts', 'hydraulicPowerKW',
        'shaftPower',     'shaftPowerHp',     'shaftPowerWatts',     'shaftPowerKW'
      ]
      for (const key of keys) {
        assert.ok(Object.prototype.hasOwnProperty.call(s, key), `missing: ${key}`)
      }
    })
  })
})
