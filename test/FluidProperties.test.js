import assert from 'assert'
import FluidProperties from '../src/FluidProperties.js'
import approx from './approx.js'

// Water at 60°F
const WATER = { density: 62.4, dynamicViscosity: 0.000672 }

describe('FluidProperties', () => {
  describe('constructor', () => {
    it('should accept valid parameters', () => {
      const f = new FluidProperties(WATER)
      assert.strictEqual(f.density, 62.4)
      assert.strictEqual(f.dynamicViscosity, 0.000672)
    })

    it('should throw on non-positive density', () => {
      assert.throws(() => new FluidProperties({ ...WATER, density: 0 }),    /density/)
      assert.throws(() => new FluidProperties({ ...WATER, density: -1 }),   /density/)
    })

    it('should throw on non-numeric density', () => {
      assert.throws(() => new FluidProperties({ ...WATER, density: 'abc' }), /density/)
      assert.throws(() => new FluidProperties({ ...WATER, density: null }),  /density/)
    })

    it('should throw on non-positive dynamicViscosity', () => {
      assert.throws(() => new FluidProperties({ ...WATER, dynamicViscosity: 0 }),  /dynamicViscosity/)
      assert.throws(() => new FluidProperties({ ...WATER, dynamicViscosity: -1 }), /dynamicViscosity/)
    })

    it('should throw on non-numeric dynamicViscosity', () => {
      assert.throws(() => new FluidProperties({ ...WATER, dynamicViscosity: '1e-3' }), /dynamicViscosity/)
    })
  })

  describe('kinematicViscosity', () => {
    it('should equal dynamicViscosity / density', () => {
      const f = new FluidProperties(WATER)
      approx.equal(f.kinematicViscosity, WATER.dynamicViscosity / WATER.density)
    })

    it('should have correct units relationship (ft²/s = lbm/(ft·s) / (lbm/ft³))', () => {
      // nu [ft²/s] = mu [lbm/(ft·s)] / rho [lbm/ft³]  → units check out
      const f = new FluidProperties({ density: 62.4, dynamicViscosity: 0.000672 })
      // Water at 60°F: ν ≈ 1.078 × 10⁻⁵ ft²/s
      approx.equal(f.kinematicViscosity, 1.077e-5, 0.01)
    })

    it('should decrease as density increases (at fixed viscosity)', () => {
      const f1 = new FluidProperties({ density: 60, dynamicViscosity: 0.001 })
      const f2 = new FluidProperties({ density: 70, dynamicViscosity: 0.001 })
      assert(f1.kinematicViscosity > f2.kinematicViscosity)
    })
  })

  describe('specificWeight', () => {
    it('should numerically equal density at standard gravity', () => {
      const f = new FluidProperties(WATER)
      assert.strictEqual(f.specificWeight, f.density)
    })

    it('should scale with density', () => {
      const f1 = new FluidProperties({ density: 62.4, dynamicViscosity: 0.001 })
      const f2 = new FluidProperties({ density: 124.8, dynamicViscosity: 0.001 })
      approx.equal(f2.specificWeight / f1.specificWeight, 2)
    })
  })

  describe('summary', () => {
    it('should return all four properties', () => {
      const f = new FluidProperties(WATER)
      const s = f.summary()
      assert.strictEqual(s.density, f.density)
      assert.strictEqual(s.dynamicViscosity, f.dynamicViscosity)
      assert.strictEqual(s.kinematicViscosity, f.kinematicViscosity)
      assert.strictEqual(s.specificWeight, f.specificWeight)
    })
  })
})
