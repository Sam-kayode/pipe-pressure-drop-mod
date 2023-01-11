import assert from 'assert'
import FluidProperties     from '../src/FluidProperties.js'
import PipeGeometry        from '../src/PipeGeometry.js'
import FlowCharacteristics from '../src/FlowCharacteristics.js'
import PressureDrop        from '../src/PressureDrop.js'
import FrictionFactor      from '../src/FrictionFactor.js'
import approx from './approx.js'

// ── Shared fixtures ────────────────────────────────────────────────────────────

function makeDrop (diameter, pipeLength, flowRate, viscosity = 0.000672) {
  const fluid    = new FluidProperties({ density: 62.4, dynamicViscosity: viscosity })
  const geometry = new PipeGeometry({ diameter, pipeLength })
  const flow     = new FlowCharacteristics({ fluid, geometry, flowRate })
  return new PressureDrop({ flow, geometry })
}

// Turbulent: 2-in pipe, 100 ft, Q = 0.1 ft³/s, water at 60°F
const turbDrop = makeDrop(2, 100, 0.1)

// Laminar: 1-in pipe, 100 ft, Q = 0.001 ft³/s, μ = 0.001 lbm/(ft·s)
const lamDrop = makeDrop(1, 100, 0.001, 0.001)

describe('PressureDrop', () => {
  describe('frictionFactor', () => {
    it('should match FrictionFactor.compute() for the same Re and ε/D', () => {
      const expected = FrictionFactor.compute(
        turbDrop.flow.reynoldsNumber,
        turbDrop.geometry.relativeRoughness
      )
      assert.strictEqual(turbDrop.frictionFactor, expected)
    })

    it('should use Hagen-Poiseuille (64/Re) for laminar flow', () => {
      approx.equal(lamDrop.frictionFactor, 64 / lamDrop.flow.reynoldsNumber)
    })

    it('should be in a physically reasonable range for turbulent water flow', () => {
      // Moody chart: for Re ≈ 7×10⁴, ε/D ≈ 9×10⁻⁵ → f ≈ 0.019–0.021
      assert(turbDrop.frictionFactor > 0.018 && turbDrop.frictionFactor < 0.022)
    })
  })

  describe('frictionFactorChurchill', () => {
    it('should be within ±0.5 % of Colebrook-White for turbulent flow', () => {
      const fCB  = turbDrop.frictionFactor
      const fCh  = turbDrop.frictionFactorChurchill
      const relErr = Math.abs(fCh - fCB) / fCB
      assert(relErr < 0.005, `Churchill vs Colebrook error: ${(relErr * 100).toFixed(3)}%`)
    })
  })

  describe('majorLoss', () => {
    it('should equal f × (L/D) × dynamicPressure', () => {
      const expected = turbDrop.frictionFactor *
                       turbDrop.geometry.lengthToDiameterRatio *
                       turbDrop.flow.dynamicPressure
      approx.equal(turbDrop.majorLoss, expected)
    })

    it('should scale linearly with pipe length', () => {
      const d1 = makeDrop(2, 100, 0.1)
      const d2 = makeDrop(2, 300, 0.1)
      approx.equal(d2.majorLoss / d1.majorLoss, 3)
    })

    it('should be positive for any valid flow', () => {
      assert(turbDrop.majorLoss > 0)
      assert(lamDrop.majorLoss > 0)
    })

    it('should increase with flow rate (turbulent regime)', () => {
      const d1 = makeDrop(2, 100, 0.1)
      const d2 = makeDrop(2, 100, 0.3)
      assert(d2.majorLoss > d1.majorLoss)
    })
  })

  describe('majorLossPsi', () => {
    it('should equal majorLoss / 144', () => {
      approx.equal(turbDrop.majorLossPsi, turbDrop.majorLoss / 144)
    })

    it('should equal majorLossPsi for laminar flow too', () => {
      approx.equal(lamDrop.majorLossPsi, lamDrop.majorLoss / 144)
    })
  })

  describe('headLoss', () => {
    it('should equal f × (L/D) × velocityHead', () => {
      const expected = turbDrop.frictionFactor *
                       turbDrop.geometry.lengthToDiameterRatio *
                       turbDrop.flow.velocityHead
      approx.equal(turbDrop.headLoss, expected)
    })

    it('should equal majorLoss / specificWeight (at standard gravity)', () => {
      // h_L [ft] = ΔP [lbf/ft²] / γ [lbf/ft³]  and  γ = ρ at standard g
      approx.equal(turbDrop.headLoss, turbDrop.majorLoss / turbDrop.flow.fluid.specificWeight)
    })

    it('should scale linearly with pipe length', () => {
      const d1 = makeDrop(2, 100, 0.1)
      const d2 = makeDrop(2, 200, 0.1)
      approx.equal(d2.headLoss / d1.headLoss, 2)
    })
  })

  describe('total and totalPsi', () => {
    it('total should equal majorLoss', () => {
      assert.strictEqual(turbDrop.total, turbDrop.majorLoss)
    })

    it('totalPsi should equal majorLossPsi', () => {
      assert.strictEqual(turbDrop.totalPsi, turbDrop.majorLossPsi)
    })
  })

  describe('summary', () => {
    it('should return all expected keys', () => {
      const s = turbDrop.summary()
      const keys = [
        'frictionFactor', 'frictionFactorChurchill',
        'majorLoss', 'majorLossPsi', 'headLoss', 'total', 'totalPsi'
      ]
      for (const key of keys) {
        assert.ok(Object.prototype.hasOwnProperty.call(s, key), `missing: ${key}`)
      }
    })
  })

  describe('known hand-calculated example (laminar)', () => {
    it('should match laminar ΔP for 1-in pipe, μ=0.001, Q=0.001 ft³/s, L=100 ft', () => {
      // D = 1/12 ft,  A = π*(1/12)²/4 = π/576 ft²
      // V = 0.001*(576/π) ≈ 0.18335 ft/s
      // Re = 62.4 * 0.18335 * (1/12) / 0.001 ≈ 953.6  → laminar
      // f = 64/953.6 ≈ 0.067122
      // ΔP = 0.067122 * 1200 * 62.4 * (0.18335)² / 64.348 ≈ 2.627 lbf/ft²
      const D = 1 / 12
      const A = Math.PI * D * D / 4
      const V = 0.001 / A
      const Re = 62.4 * V * D / 0.001
      const f = 64 / Re
      const deltaP = f * (100 / D) * 62.4 * V * V / (2 * 32.174)

      approx.equal(lamDrop.frictionFactor, f)
      approx.equal(lamDrop.majorLoss, deltaP)
      approx.equal(lamDrop.majorLoss, 2.627, 0.01)
    })
  })

  describe('known hand-calculated example (turbulent)', () => {
    it('should match turbulent ΔP for 2-in stainless pipe, water at 60°F, Q=0.1 ft³/s, L=100 ft', () => {
      // D = 1/6 ft,  A = π/144 ft²,  V = 14.4/π ft/s ≈ 4.584 ft/s
      // Re = 62.4*(14.4/π)*(1/6)/0.000672 ≈ 70,939  → turbulent
      // Colebrook with ε/D=0.00009 → f ≈ 0.01974
      // ΔP = f * 600 * 62.4 * (14.4/π)² / 64.348 ≈ 241 lbf/ft²
      assert.strictEqual(turbDrop.flow.flowRegime, 'turbulent')
      assert(turbDrop.frictionFactor > 0.018 && turbDrop.frictionFactor < 0.022)
      approx.equal(turbDrop.majorLoss, 241, 0.02)
      approx.equal(turbDrop.majorLossPsi, 1.676, 0.02)
    })
  })
})
