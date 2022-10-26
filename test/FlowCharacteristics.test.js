import assert from 'assert'
import FluidProperties     from '../src/FluidProperties.js'
import PipeGeometry        from '../src/PipeGeometry.js'
import FlowCharacteristics, { LAMINAR_UPPER, TURBULENT_LOWER } from '../src/FlowCharacteristics.js'
import approx from './approx.js'

// ── Shared test fixtures ──────────────────────────────────────────────────────

const waterAt60F = new FluidProperties({ density: 62.4, dynamicViscosity: 0.000672 })
const highViscosity = new FluidProperties({ density: 62.4, dynamicViscosity: 0.001 })

const pipe2in100ft = new PipeGeometry({ diameter: 2, pipeLength: 100 })
const pipe1in100ft = new PipeGeometry({ diameter: 1, pipeLength: 100 })

// Turbulent: Re ≈ 70940
const turbulent = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.1 })

// Laminar: Re ≈ 954
const laminar = new FlowCharacteristics({ fluid: highViscosity, geometry: pipe1in100ft, flowRate: 0.001 })

describe('FlowCharacteristics', () => {
  describe('constructor', () => {
    it('should accept valid parameters', () => {
      const f = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.05 })
      assert.strictEqual(f.flowRate, 0.05)
    })

    it('should throw on non-positive flowRate', () => {
      assert.throws(
        () => new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0 }),
        /flowRate/
      )
      assert.throws(
        () => new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: -0.1 }),
        /flowRate/
      )
    })
  })

  describe('flowRateGpm', () => {
    it('should convert ft³/s to gpm using factor 448.831', () => {
      const f = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 1.0 })
      approx.equal(f.flowRateGpm, 448.831, 0.001)
    })

    it('should scale proportionally with flowRate', () => {
      const f1 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.1 })
      const f2 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.2 })
      approx.equal(f2.flowRateGpm / f1.flowRateGpm, 2)
    })
  })

  describe('velocity', () => {
    it('should equal flowRate / crossSectionalArea', () => {
      approx.equal(turbulent.velocity, turbulent.flowRate / pipe2in100ft.crossSectionalArea)
    })

    it('should double when flowRate doubles', () => {
      const f1 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.1 })
      const f2 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.2 })
      approx.equal(f2.velocity / f1.velocity, 2)
    })

    it('should decrease when pipe area increases', () => {
      const small = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe1in100ft, flowRate: 0.05 })
      const large = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.05 })
      assert(small.velocity > large.velocity)
    })
  })

  describe('reynoldsNumber', () => {
    it('should equal ρ V D / μ', () => {
      const Re = (waterAt60F.density * turbulent.velocity * pipe2in100ft.diameterFt) /
                 waterAt60F.dynamicViscosity
      approx.equal(turbulent.reynoldsNumber, Re)
    })

    it('should match the kinematic form (V D / ν)', () => {
      approx.equal(turbulent.reynoldsNumber, turbulent.reynoldsNumberKinematic, 1e-6)
    })

    it('should scale proportionally with flowRate', () => {
      const f1 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.1 })
      const f2 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.3 })
      approx.equal(f2.reynoldsNumber / f1.reynoldsNumber, 3)
    })

    it('should decrease when viscosity increases', () => {
      const low  = new FlowCharacteristics({ fluid: waterAt60F,   geometry: pipe2in100ft, flowRate: 0.1 })
      const high = new FlowCharacteristics({ fluid: highViscosity, geometry: pipe2in100ft, flowRate: 0.1 })
      assert(low.reynoldsNumber > high.reynoldsNumber)
    })
  })

  describe('regime constants', () => {
    it('LAMINAR_UPPER should be 2300', () => {
      assert.strictEqual(LAMINAR_UPPER, 2300)
    })

    it('TURBULENT_LOWER should be 4000', () => {
      assert.strictEqual(TURBULENT_LOWER, 4000)
    })
  })

  describe('flowRegime', () => {
    it('should return "laminar" when Re < 2300', () => {
      assert(laminar.reynoldsNumber < LAMINAR_UPPER)
      assert.strictEqual(laminar.flowRegime, 'laminar')
      assert.strictEqual(laminar.isLaminar, true)
      assert.strictEqual(laminar.isTurbulent, false)
      assert.strictEqual(laminar.isTransitional, false)
    })

    it('should return "turbulent" when Re >= 4000', () => {
      assert(turbulent.reynoldsNumber >= TURBULENT_LOWER)
      assert.strictEqual(turbulent.flowRegime, 'turbulent')
      assert.strictEqual(turbulent.isTurbulent, true)
      assert.strictEqual(turbulent.isLaminar, false)
      assert.strictEqual(turbulent.isTransitional, false)
    })

    it('should return "transitional" for 2300 ≤ Re < 4000', () => {
      // Re ≈ 3000: V = Re*μ/(ρ*D) = 3000*0.000672/(62.4*(1/12)) = 0.3877 ft/s
      // Q = V * A = 0.3877 * π*(1/12)²/4 ≈ 0.002115 ft³/s
      const trans = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe1in100ft, flowRate: 0.00212 })
      assert(trans.reynoldsNumber >= LAMINAR_UPPER && trans.reynoldsNumber < TURBULENT_LOWER)
      assert.strictEqual(trans.flowRegime, 'transitional')
      assert.strictEqual(trans.isTransitional, true)
    })
  })

  describe('dynamicPressure', () => {
    it('should equal ρ V² / (2 gc)', () => {
      const GC = 32.174
      const expected = (waterAt60F.density * Math.pow(turbulent.velocity, 2)) / (2 * GC)
      approx.equal(turbulent.dynamicPressure, expected)
    })

    it('should be positive', () => {
      assert(turbulent.dynamicPressure > 0)
    })

    it('should scale with the square of velocity (quadruples when velocity doubles)', () => {
      const f1 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.1 })
      const f2 = new FlowCharacteristics({ fluid: waterAt60F, geometry: pipe2in100ft, flowRate: 0.2 })
      approx.equal(f2.dynamicPressure / f1.dynamicPressure, 4)
    })
  })

  describe('velocityHead', () => {
    it('should equal V² / (2 × 32.174)', () => {
      const expected = Math.pow(turbulent.velocity, 2) / (2 * 32.174)
      approx.equal(turbulent.velocityHead, expected)
    })

    it('should equal dynamicPressure / specificWeight (at standard gravity)', () => {
      // h_v = q / γ = (ρV²/2gc) / ρ = V²/(2g) when g = gc
      approx.equal(turbulent.velocityHead, turbulent.dynamicPressure / waterAt60F.specificWeight)
    })
  })

  describe('summary', () => {
    it('should return all expected keys', () => {
      const s = turbulent.summary()
      const keys = [
        'flowRate', 'flowRateGpm', 'velocity', 'reynoldsNumber',
        'reynoldsNumberKinematic', 'flowRegime', 'isLaminar', 'isTurbulent',
        'isTransitional', 'dynamicPressure', 'velocityHead'
      ]
      for (const key of keys) {
        assert.ok(Object.prototype.hasOwnProperty.call(s, key), `missing: ${key}`)
      }
    })
  })
})
