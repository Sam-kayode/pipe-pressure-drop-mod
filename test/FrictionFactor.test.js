import assert from 'assert'
import FrictionFactor from '../src/FrictionFactor.js'
import approx from './approx.js'

// Stainless steel 2-in pipe: ε/D = 0.000015/(2/12) = 0.00009
const EPS_D_2IN = 0.000015 / (2 / 12)  // 9e-5

describe('FrictionFactor', () => {
  describe('laminar (Hagen-Poiseuille)', () => {
    it('should equal 64 / Re', () => {
      assert.strictEqual(FrictionFactor.laminar(100), 64 / 100)
      assert.strictEqual(FrictionFactor.laminar(2000), 64 / 2000)
    })

    it('should decrease as Re increases', () => {
      assert(FrictionFactor.laminar(500) > FrictionFactor.laminar(1000))
    })

    it('should be inversely proportional to Re', () => {
      approx.equal(FrictionFactor.laminar(2000) / FrictionFactor.laminar(1000), 0.5)
    })

    it('should throw on Re ≤ 0', () => {
      assert.throws(() => FrictionFactor.laminar(0),  /Re/)
      assert.throws(() => FrictionFactor.laminar(-1), /Re/)
    })
  })

  describe('swameeJain (explicit approximation)', () => {
    it('should return a positive value for turbulent flow', () => {
      const f = FrictionFactor.swameeJain(70000, EPS_D_2IN)
      assert(f > 0)
    })

    it('should increase with relative roughness', () => {
      const fSmooth = FrictionFactor.swameeJain(70000, 0.000001)
      const fRough  = FrictionFactor.swameeJain(70000, 0.001)
      assert(fRough > fSmooth)
    })

    it('should decrease with Re for a given roughness', () => {
      const fLow  = FrictionFactor.swameeJain(10000,  EPS_D_2IN)
      const fHigh = FrictionFactor.swameeJain(100000, EPS_D_2IN)
      assert(fHigh < fLow)
    })

    it('should be within ±3 % of Colebrook for valid ranges', () => {
      // Swamee-Jain guarantees ±3 % accuracy for 5e3 ≤ Re ≤ 1e8, 1e-6 ≤ ε/D ≤ 0.01
      for (const Re of [10000, 50000, 200000]) {
        const fSJ = FrictionFactor.swameeJain(Re, EPS_D_2IN)
        const fCB = FrictionFactor.colebrook(Re, EPS_D_2IN)
        const relErr = Math.abs(fSJ - fCB) / fCB
        assert(relErr < 0.03, `Swamee-Jain error ${(relErr * 100).toFixed(2)}% at Re=${Re}`)
      }
    })

    it('should throw on invalid inputs', () => {
      assert.throws(() => FrictionFactor.swameeJain(0,  0.0001), /Re/)
      assert.throws(() => FrictionFactor.swameeJain(1e5, -0.001), /relRoughness/)
    })
  })

  describe('colebrook (Colebrook-White iterative)', () => {
    it('should return a positive value', () => {
      const f = FrictionFactor.colebrook(70939, EPS_D_2IN)
      assert(f > 0)
    })

    it('should produce a physically reasonable f for water in a 2-in pipe', () => {
      // Moody chart values for Re ≈ 7×10⁴, ε/D ≈ 9×10⁻⁵ → f ≈ 0.019–0.021
      const f = FrictionFactor.colebrook(70939, EPS_D_2IN)
      assert(f > 0.018 && f < 0.022, `f = ${f} outside expected range`)
    })

    it('should increase with relative roughness', () => {
      const fSmooth = FrictionFactor.colebrook(70939, 1e-6)
      const fRough  = FrictionFactor.colebrook(70939, 0.01)
      assert(fRough > fSmooth)
    })

    it('should give a physically reasonable value at the turbulent onset (Re=4000)', () => {
      // At the turbulent onset (Re=4000, smooth pipe), Colebrook gives f ≈ 0.040.
      // This is HIGHER than the laminar line (64/4000 = 0.016) because the
      // Moody diagram shows a local friction-factor jump at the laminar→turbulent
      // transition.  The turbulent curve only falls below the laminar line at
      // higher Re.
      const fCB  = FrictionFactor.colebrook(4000, 0)
      const fLam = FrictionFactor.laminar(4000)
      assert(fCB > 0.01, `f = ${fCB} is unrealistically small`)
      assert(fCB < 0.10, `f = ${fCB} is unrealistically large`)
      // At Re = 4000, turbulent onset, Colebrook > laminar is expected
      assert(fCB > fLam, 'Colebrook should exceed Hagen-Poiseuille at turbulent onset')
    })

    it('should be close to the smooth-pipe Prandtl law at Re=1e5, ε/D=0', () => {
      // Prandtl smooth-pipe: 1/√f = 2 log10(Re √f) - 0.8
      // At Re = 1e5, f ≈ 0.01796 (Moody chart)
      const f = FrictionFactor.colebrook(1e5, 0)
      assert(f > 0.015 && f < 0.02, `Smooth-pipe f = ${f} outside expected range`)
    })

    it('should throw on invalid inputs', () => {
      assert.throws(() => FrictionFactor.colebrook(0,   0.0001), /Re/)
      assert.throws(() => FrictionFactor.colebrook(1e5, -0.001), /relRoughness/)
    })
  })

  describe('churchill (universal explicit formula)', () => {
    it('should reproduce f = 64/Re in the laminar regime', () => {
      // Churchill recovers Hagen-Poiseuille exactly as Re → 0
      for (const Re of [100, 500, 1000, 2000]) {
        approx.equal(FrictionFactor.churchill(Re, 0), 64 / Re, 0.005)
      }
    })

    it('should match Colebrook within ±0.5 % for turbulent flow', () => {
      const cases = [
        { Re: 10000,  epsD: EPS_D_2IN },
        { Re: 70939,  epsD: EPS_D_2IN },
        { Re: 200000, epsD: 0.000045  }
      ]
      for (const { Re, epsD } of cases) {
        const fChurchill = FrictionFactor.churchill(Re, epsD)
        const fColebrook = FrictionFactor.colebrook(Re, epsD)
        const relErr = Math.abs(fChurchill - fColebrook) / fColebrook
        assert(relErr < 0.005, `Churchill error ${(relErr * 100).toFixed(3)}% at Re=${Re}`)
      }
    })

    it('should be a continuous function (no jumps between regimes)', () => {
      // Sample across laminar → transitional → turbulent
      let prev = FrictionFactor.churchill(1000, EPS_D_2IN)
      for (let Re = 1200; Re <= 6000; Re += 200) {
        const curr = FrictionFactor.churchill(Re, EPS_D_2IN)
        // No sudden jump larger than 30 % of previous value
        assert(Math.abs(curr - prev) / prev < 0.3,
          `Churchill discontinuity at Re=${Re}: prev=${prev.toFixed(5)}, curr=${curr.toFixed(5)}`)
        prev = curr
      }
    })

    it('should throw on invalid inputs', () => {
      assert.throws(() => FrictionFactor.churchill(0,  0.0001), /Re/)
      assert.throws(() => FrictionFactor.churchill(1e4, -0.001), /relRoughness/)
    })
  })

  describe('compute (regime-selecting method)', () => {
    it('should use Hagen-Poiseuille for Re < 2300', () => {
      const Re = 1500
      approx.equal(FrictionFactor.compute(Re, EPS_D_2IN), FrictionFactor.laminar(Re))
    })

    it('should use Colebrook-White for Re >= 4000', () => {
      const Re = 70939
      approx.equal(
        FrictionFactor.compute(Re, EPS_D_2IN),
        FrictionFactor.colebrook(Re, EPS_D_2IN)
      )
    })

    it('should interpolate between limits in the transitional zone', () => {
      const fAt2300 = FrictionFactor.laminar(2300)            // ≈ 0.02783
      const fAt4000 = FrictionFactor.colebrook(4000, EPS_D_2IN)  // ≈ 0.040+
      // At the midpoint Re = 3150, t = (3150-2300)/1700 ≈ 0.5
      // Note: fAt4000 > fAt2300 because the turbulent onset f is higher than
      // the laminar f at that Re (well-known Moody-diagram jump).
      // The blended midpoint should lie strictly between the two endpoints.
      const fMid = FrictionFactor.compute(3150, EPS_D_2IN)
      const lo = Math.min(fAt2300, fAt4000)
      const hi = Math.max(fAt2300, fAt4000)
      assert(fMid > lo && fMid < hi, `fMid=${fMid} not between ${lo} and ${hi}`)
    })

    it('should be continuous at the Re = 2300 boundary', () => {
      const fJustBelow = FrictionFactor.compute(2299, EPS_D_2IN)
      const fJustAbove = FrictionFactor.compute(2301, EPS_D_2IN)
      approx.equal(fJustBelow, fJustAbove, 0.01)
    })

    it('should be continuous at the Re = 4000 boundary', () => {
      const fJustBelow = FrictionFactor.compute(3999, EPS_D_2IN)
      const fJustAbove = FrictionFactor.compute(4001, EPS_D_2IN)
      approx.equal(fJustBelow, fJustAbove, 0.01)
    })
  })
})
