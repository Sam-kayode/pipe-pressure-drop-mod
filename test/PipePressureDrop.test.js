import assert from 'assert'
import { execFileSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import PipePressureDrop from '../src/PipePressureDrop.js'
import approx from './approx.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Shared test fixtures ──────────────────────────────────────────────────────

// Turbulent: water at 60°F, 2-in stainless steel pipe, 100 ft
const TURBULENT = {
  density: 62.4,
  dynamicViscosity: 0.000672,
  diameter: 2,
  flowRate: 0.1,
  pipeLength: 100
}

// Laminar: higher viscosity, 1-in pipe, low flow
const LAMINAR = {
  density: 62.4,
  dynamicViscosity: 0.001,
  diameter: 1,
  flowRate: 0.001,
  pipeLength: 100
}

// With pump efficiency
const WITH_EFFICIENCY = { ...TURBULENT, pumpEfficiency: 0.75 }

describe('PipePressureDrop (integration)', () => {
  describe('constructor and sub-modules', () => {
    it('should expose fluid, geometry, flow, drop, and power sub-modules', () => {
      const solver = new PipePressureDrop(TURBULENT)
      assert.ok(solver.fluid)
      assert.ok(solver.geometry)
      assert.ok(solver.flow)
      assert.ok(solver.drop)
      assert.ok(solver.power)
    })

    it('should pass density and viscosity to FluidProperties correctly', () => {
      const solver = new PipePressureDrop(TURBULENT)
      assert.strictEqual(solver.fluid.density, 62.4)
      assert.strictEqual(solver.fluid.dynamicViscosity, 0.000672)
    })

    it('should pass diameter and length to PipeGeometry correctly', () => {
      const solver = new PipePressureDrop(TURBULENT)
      assert.strictEqual(solver.geometry.diameter, 2)
      assert.strictEqual(solver.geometry.pipeLength, 100)
    })

    it('should default pumpEfficiency to 1.0', () => {
      const solver = new PipePressureDrop(TURBULENT)
      assert.strictEqual(solver.power.pumpEfficiency, 1.0)
    })

    it('should accept an explicit pumpEfficiency', () => {
      const solver = new PipePressureDrop(WITH_EFFICIENCY)
      assert.strictEqual(solver.power.pumpEfficiency, 0.75)
    })
  })

  describe('solve() output — keys', () => {
    it('should return a results object with all expected keys', () => {
      const r = new PipePressureDrop(TURBULENT).solve()
      const keys = [
        // inputs
        'density', 'dynamicViscosity', 'diameter', 'flowRate', 'pipeLength', 'pumpEfficiency',
        // fluid
        'kinematicViscosity', 'specificWeight',
        // geometry
        'diameterFt', 'crossSectionalArea', 'hydraulicDiameter',
        'roughness', 'relativeRoughness', 'lengthToDiameterRatio',
        // flow
        'flowRateGpm', 'velocity', 'reynoldsNumber', 'reynoldsNumberKinematic',
        'flowRegime', 'dynamicPressure', 'velocityHead',
        // friction factor
        'frictionFactor', 'frictionFactorChurchill',
        // pressure drop
        'pressureDropLbfFt2', 'pressureDropPsi', 'headLoss',
        // pumping power
        'hydraulicPowerFtLbfPerS', 'hydraulicPowerHp', 'hydraulicPowerWatts', 'hydraulicPowerKW',
        'shaftPowerFtLbfPerS', 'shaftPowerHp', 'shaftPowerWatts', 'shaftPowerKW'
      ]
      for (const key of keys) {
        assert.ok(Object.prototype.hasOwnProperty.call(r, key), `missing key: ${key}`)
      }
    })
  })

  describe('solve() output — value consistency', () => {
    it('pressureDropPsi should equal pressureDropLbfFt2 / 144', () => {
      const r = new PipePressureDrop(TURBULENT).solve()
      approx.equal(r.pressureDropPsi, r.pressureDropLbfFt2 / 144)
    })

    it('hydraulicPowerFtLbfPerS should equal pressureDropLbfFt2 × flowRate', () => {
      const r = new PipePressureDrop(TURBULENT).solve()
      approx.equal(r.hydraulicPowerFtLbfPerS, r.pressureDropLbfFt2 * r.flowRate)
    })

    it('shaftPowerFtLbfPerS should equal hydraulicPowerFtLbfPerS / pumpEfficiency', () => {
      const r = new PipePressureDrop(WITH_EFFICIENCY).solve()
      approx.equal(r.shaftPowerFtLbfPerS, r.hydraulicPowerFtLbfPerS / r.pumpEfficiency)
    })

    it('shaftPowerHp should be larger than hydraulicPowerHp when η < 1', () => {
      const r = new PipePressureDrop(WITH_EFFICIENCY).solve()
      assert(r.shaftPowerHp > r.hydraulicPowerHp)
    })

    it('hydraulicDiameter should equal diameterFt for a circular pipe', () => {
      const r = new PipePressureDrop(TURBULENT).solve()
      approx.equal(r.hydraulicDiameter, r.diameterFt)
    })

    it('reynoldsNumber should equal reynoldsNumberKinematic', () => {
      const r = new PipePressureDrop(TURBULENT).solve()
      approx.equal(r.reynoldsNumber, r.reynoldsNumberKinematic, 1e-6)
    })

    it('headLoss should equal pressureDropLbfFt2 / density (at standard gravity)', () => {
      const r = new PipePressureDrop(TURBULENT).solve()
      approx.equal(r.headLoss, r.pressureDropLbfFt2 / r.density)
    })
  })

  describe('laminar flow', () => {
    it('should identify laminar regime correctly', () => {
      const r = new PipePressureDrop(LAMINAR).solve()
      assert.strictEqual(r.flowRegime, 'laminar')
    })

    it('friction factor should equal 64/Re for laminar flow', () => {
      const r = new PipePressureDrop(LAMINAR).solve()
      approx.equal(r.frictionFactor, 64 / r.reynoldsNumber)
    })
  })

  describe('turbulent flow', () => {
    it('should identify turbulent regime correctly', () => {
      const r = new PipePressureDrop(TURBULENT).solve()
      assert.strictEqual(r.flowRegime, 'turbulent')
    })
  })

  describe('parametric behaviour', () => {
    it('pressure drop should double when pipe length doubles', () => {
      const r1 = new PipePressureDrop({ ...TURBULENT, pipeLength: 100 }).solve()
      const r2 = new PipePressureDrop({ ...TURBULENT, pipeLength: 200 }).solve()
      approx.equal(r2.pressureDropLbfFt2 / r1.pressureDropLbfFt2, 2)
    })

    it('pressure drop should increase with flow rate', () => {
      const r1 = new PipePressureDrop({ ...TURBULENT, flowRate: 0.1 }).solve()
      const r2 = new PipePressureDrop({ ...TURBULENT, flowRate: 0.3 }).solve()
      assert(r2.pressureDropLbfFt2 > r1.pressureDropLbfFt2)
    })

    it('pumping power should increase with flow rate', () => {
      const r1 = new PipePressureDrop({ ...TURBULENT, flowRate: 0.1 }).solve()
      const r2 = new PipePressureDrop({ ...TURBULENT, flowRate: 0.3 }).solve()
      assert(r2.hydraulicPowerFtLbfPerS > r1.hydraulicPowerFtLbfPerS)
    })
  })

  describe('known hand-calculated examples', () => {
    it('turbulent: 2-in stainless pipe, water at 60°F, Q = 0.1 ft³/s, L = 100 ft', () => {
      // D = 1/6 ft,  A = π/144 ft²
      // V = 14.4/π ≈ 4.584 ft/s
      // Re ≈ 70939  → turbulent
      // Colebrook with ε/D = 0.00009  → f ≈ 0.01974
      // ΔP ≈ 241 lbf/ft²,  1.676 psi
      // P_fluid = 241.3 × 0.1 = 24.1 ft·lbf/s ≈ 0.0439 hp
      const r = new PipePressureDrop(TURBULENT).solve()
      assert.strictEqual(r.flowRegime, 'turbulent')
      approx.equal(r.reynoldsNumber, 70939, 0.005)
      approx.equal(r.pressureDropLbfFt2, 241,   0.02)
      approx.equal(r.pressureDropPsi,    1.676, 0.02)
      approx.equal(r.hydraulicPowerHp,   0.0438, 0.02)
    })

    it('laminar: 1-in pipe, μ = 0.001, Q = 0.001 ft³/s, L = 100 ft', () => {
      // V ≈ 0.1834 ft/s,  Re ≈ 953.6  → laminar,  f = 64/953.6 ≈ 0.0671
      // ΔP ≈ 2.627 lbf/ft²
      const r = new PipePressureDrop(LAMINAR).solve()
      assert.strictEqual(r.flowRegime, 'laminar')
      approx.equal(r.frictionFactor, 64 / r.reynoldsNumber)
      approx.equal(r.pressureDropLbfFt2, 2.627, 0.01)
    })
  })

  describe('CLI (pipe-pressure-drop.js)', () => {
    const tmpJson = join(ROOT, 'test', '_tmp_pipe_input.json')

    afterEach(() => {
      try { unlinkSync(tmpJson) } catch (_) {}
    })

    it('should print a full results table for a valid JSON input', () => {
      writeFileSync(tmpJson, JSON.stringify(TURBULENT))
      const out = execFileSync('node', [join(ROOT, 'src', 'pipe-pressure-drop.js'), tmpJson], { encoding: 'utf-8', timeout: 1500000 })
      assert(out.includes('Pressure Drop'),     'missing Pressure Drop section')
      assert(out.includes('Pumping Power'),     'missing Pumping Power label')
      assert(out.includes('TURBULENT'),         'missing flow regime')
      assert(out.includes('Colebrook-White'),   'missing friction factor section')
      assert(out.includes('Head Loss'),         'missing Head Loss')
    })

    it('should print usage when no argument is supplied', () => {
      try {
        execFileSync('node', [join(ROOT, 'src', 'pipe-pressure-drop.js')], { encoding: 'utf-8', stdio: 'pipe', timeout: 1500000 })
        assert.fail('Expected non-zero exit')
      } catch (err) {
        assert(err.stderr.includes('Usage'))
      }
    })

    it('should accept an optional pumpEfficiency field and show shaft power', () => {
      writeFileSync(tmpJson, JSON.stringify({ ...TURBULENT, pumpEfficiency: 0.75 }))
      const out = execFileSync('node', [join(ROOT, 'src', 'pipe-pressure-drop.js'), tmpJson], { encoding: 'utf-8', timeout: 1500000 })
      assert(out.includes('Shaft Power'), 'shaft power should appear when η < 1')
      assert(out.includes('75.0 %'),      'efficiency should be printed')
    })
  })
})
