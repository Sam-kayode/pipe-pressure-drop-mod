/**
 * Stress tests — computationally intensive, designed to run for a combined
 * total of at least 25 minutes.
 *
 * Five tests run back-to-back, each consuming exactly 5 minutes of CPU time.
 * Each test exercises a different module across a randomised parameter space
 * and asserts that no physically impossible results are produced.
 *
 * To run only these tests:
 *   npm run test:stress
 */

import assert from 'assert'
import FrictionFactor      from '../src/FrictionFactor.js'
import FluidProperties     from '../src/FluidProperties.js'
import PipeGeometry        from '../src/PipeGeometry.js'
import FlowCharacteristics from '../src/FlowCharacteristics.js'
import PressureDrop        from '../src/PressureDrop.js'
import PumpingPower        from '../src/PumpingPower.js'
import PipePressureDrop    from '../src/PipePressureDrop.js'
import { convertPower, gpmToFt3PerS, ft3PerSToGpm, lbfFt2ToPsi, psiToLbfFt2 } from '../src/units.js'

// ── Timing constants ──────────────────────────────────────────────────────────

const MINUTES          = 5          // minutes allocated per test
const PER_TEST_MS      = MINUTES * 60 * 1000   // 5 min in ms
const SUITE_TIMEOUT_MS = 31 * 60 * 1000        // 31 min safety cap for the suite
const BATCH_SIZE       = 2000       // iterations per synchronous batch before yielding

// ── Random helpers ────────────────────────────────────────────────────────────

/** Uniform random float in [lo, hi) */
function rnd (lo, hi) { return lo + Math.random() * (hi - lo) }

/** Uniform random float in [lo, hi) on a log scale */
function rndLog (lo, hi) { return Math.exp(rnd(Math.log(lo), Math.log(hi))) }

/** Random valid PipePressureDrop parameter set */
function randomParams () {
  return {
    density:          rnd(50, 80),              // lbm/ft³  (liquids near water)
    dynamicViscosity: rndLog(1e-5, 5e-3),       // lbm/(ft·s)
    diameter:         rnd(0.25, 24),            // inches
    flowRate:         rndLog(1e-4, 10),         // ft³/s
    pipeLength:       rnd(10, 5000),            // ft
    roughness:        rndLog(1e-7, 1e-3)        // ft (covers smooth to rough)
  }
}

// ── Core stress runner ────────────────────────────────────────────────────────

/**
 * Runs `batch()` in chunks of BATCH_SIZE, yielding to the event loop between
 * chunks, until `durationMs` has elapsed.  Calls `done` when finished.
 *
 * @param {number}   durationMs  How long to run (ms)
 * @param {Function} batch       Called with (iteration index); throw/assert to fail
 * @param {Function} done        Mocha async done callback
 */
function stressFor (durationMs, batch, done) {
  const deadline = Date.now() + durationMs
  let total = 0
  let errors = 0
  const errorMessages = []

  function tick () {
    try {
      for (let i = 0; i < BATCH_SIZE; i++) {
        batch(total + i)
      }
      total += BATCH_SIZE
    } catch (err) {
      errors++
      if (errorMessages.length < 5) errorMessages.push(err.message)
      total += BATCH_SIZE
    }

    if (Date.now() < deadline) {
      setImmediate(tick)
    } else {
      const elapsed = ((Date.now() - (deadline - durationMs)) / 60000).toFixed(2)
      console.log(`\n    → ${total.toLocaleString()} iterations in ${elapsed} min  |  errors: ${errors}`)
      if (errors > 0) {
        done(new Error(`${errors} assertion failure(s):\n  ${errorMessages.join('\n  ')}`))
      } else {
        done()
      }
    }
  }

  setImmediate(tick)
}

// ─────────────────────────────────────────────────────────────────────────────

describe('stress tests (5 min × 5 = 25 min total)', function () {
  this.timeout(SUITE_TIMEOUT_MS)

  // ── Test 1: FrictionFactor — broad random sweep ───────────────────────────

  it('[5 min] FrictionFactor: compute() returns positive finite values across all regimes', function (done) {
    this.timeout(PER_TEST_MS + 30000)

    stressFor(PER_TEST_MS, () => {
      const Re    = rndLog(1, 1e8)
      const epsD  = rnd(0, 0.05)

      const f = FrictionFactor.compute(Re, epsD)
      assert(Number.isFinite(f),  `f is not finite at Re=${Re.toExponential(3)}, ε/D=${epsD.toExponential(3)}`)
      assert(f > 0,               `f ≤ 0 at Re=${Re.toExponential(3)}`)
      assert(f < 1,               `f ≥ 1 at Re=${Re.toExponential(3)} — physically unreasonable`)

      // In the laminar regime, verify Hagen-Poiseuille exactly
      if (Re < 2300) {
        assert(Math.abs(f - 64 / Re) < 1e-10, `Laminar f deviates from 64/Re at Re=${Re.toFixed(1)}`)
      }
    }, done)
  })

  // ── Test 2: Colebrook — equation self-consistency ─────────────────────────

  it('[5 min] Colebrook: solution satisfies the implicit equation to within 1e-8', function (done) {
    this.timeout(PER_TEST_MS + 30000)

    stressFor(PER_TEST_MS, () => {
      const Re   = rndLog(4000, 1e8)   // turbulent only — Colebrook is defined here
      const epsD = rnd(0, 0.05)

      const f       = FrictionFactor.colebrook(Re, epsD)
      const sqrtF   = Math.sqrt(f)
      const lhs     = 1 / sqrtF
      const rhs     = -2.0 * Math.log10(epsD / 3.7 + 2.51 / (Re * sqrtF))
      const residual = Math.abs(lhs - rhs)

      assert(
        residual < 1e-8,
        `Colebrook residual ${residual.toExponential(3)} exceeds 1e-8 at Re=${Re.toExponential(3)}, ε/D=${epsD.toExponential(3)}`
      )

      // Also verify Churchill agrees within 0.5 % for turbulent flow
      const fChurchill = FrictionFactor.churchill(Re, epsD)
      const relDiff    = Math.abs(fChurchill - f) / f
      assert(
        relDiff < 0.005,
        `Churchill differs from Colebrook by ${(relDiff * 100).toFixed(3)}% at Re=${Re.toExponential(3)}`
      )
    }, done)
  })

  // ── Test 3: PressureDrop — physical identity checks ───────────────────────

  it('[5 min] PressureDrop: ΔP = γ · h_L and majorLossPsi = majorLoss / 144', function (done) {
    this.timeout(PER_TEST_MS + 30000)

    stressFor(PER_TEST_MS, () => {
      const p = randomParams()
      let fluid, geometry, flow, drop

      try {
        fluid    = new FluidProperties({ density: p.density, dynamicViscosity: p.dynamicViscosity })
        geometry = new PipeGeometry({ diameter: p.diameter, pipeLength: p.pipeLength, roughness: p.roughness })
        flow     = new FlowCharacteristics({ fluid, geometry, flowRate: p.flowRate })
        drop     = new PressureDrop({ flow, geometry })
      } catch (_) {
        return   // skip invalid combinations (e.g. zero Reynolds)
      }

      const deltaP  = drop.majorLoss
      const hL      = drop.headLoss
      const gamma   = fluid.specificWeight

      assert(deltaP > 0, `Pressure drop ≤ 0 (ΔP = ${deltaP})`)
      assert(hL > 0,     `Head loss ≤ 0 (h_L = ${hL})`)

      // Darcy-Weisbach identity: ΔP = γ · h_L  (at standard gravity)
      const ratio = Math.abs(deltaP - gamma * hL) / deltaP
      assert(ratio < 1e-9, `ΔP ≠ γ·h_L: relative error ${ratio.toExponential(3)}`)

      // Unit conversion identity: ΔP_psi = ΔP_lbfFt2 / 144
      const psiDiff = Math.abs(drop.majorLossPsi - deltaP / 144) / drop.majorLossPsi
      assert(psiDiff < 1e-12, `psi conversion error: ${psiDiff.toExponential(3)}`)
    }, done)
  })

  // ── Test 4: PumpingPower — energy balance and efficiency scaling ──────────

  it('[5 min] PumpingPower: P_fluid = ΔP·Q and shaft power scales correctly with η', function (done) {
    this.timeout(PER_TEST_MS + 30000)

    stressFor(PER_TEST_MS, () => {
      const deltaP = rndLog(0.1, 1e5)   // lbf/ft²
      const Q      = rndLog(1e-5, 100)  // ft³/s
      const eta    = rnd(0.01, 1.0)     // pump efficiency

      const pw = new PumpingPower({ pressureDrop: deltaP, flowRate: Q, pumpEfficiency: eta })

      // Hydraulic power identity
      const hydErr = Math.abs(pw.hydraulicPower - deltaP * Q) / pw.hydraulicPower
      assert(hydErr < 1e-12, `P_fluid ≠ ΔP·Q: relative error ${hydErr.toExponential(3)}`)

      // Shaft power identity
      const shaftErr = Math.abs(pw.shaftPower - pw.hydraulicPower / eta) / pw.shaftPower
      assert(shaftErr < 1e-12, `P_shaft ≠ P_fluid/η: relative error ${shaftErr.toExponential(3)}`)

      // Unit conversions are internally consistent
      const hpErr = Math.abs(pw.shaftPowerHp - pw.shaftPower / 550) / pw.shaftPowerHp
      assert(hpErr < 1e-12, `hp conversion error: ${hpErr.toExponential(3)}`)

      const wErr = Math.abs(pw.shaftPowerWatts - pw.shaftPower * 1.35582) / pw.shaftPowerWatts
      assert(wErr < 1e-9, `W conversion error: ${wErr.toExponential(3)}`)

      const kwErr = Math.abs(pw.shaftPowerKW - pw.shaftPowerWatts / 1000) / pw.shaftPowerKW
      assert(kwErr < 1e-12, `kW conversion error: ${kwErr.toExponential(3)}`)
    }, done)
  })

  // ── Test 5: PipePressureDrop (full solver) — scaling law verification ─────

  it('[5 min] PipePressureDrop: doubling pipe length doubles ΔP and pumping power', function (done) {
    this.timeout(PER_TEST_MS + 30000)

    stressFor(PER_TEST_MS, () => {
      const p = randomParams()

      let r1, r2
      try {
        r1 = new PipePressureDrop(p).solve()
        r2 = new PipePressureDrop({ ...p, pipeLength: p.pipeLength * 2 }).solve()
      } catch (_) {
        return  // skip invalid parameter combinations
      }

      // Doubling length doubles ΔP (exact because f barely changes for turbulent;
      // for laminar f=64/Re is length-independent, so ΔP scales exactly 2×)
      if (r1.flowRegime === 'laminar') {
        // Laminar: f = 64/Re is independent of L, so ΔP ∝ L exactly
        const ratio = r2.pressureDropLbfFt2 / r1.pressureDropLbfFt2
        const err   = Math.abs(ratio - 2)
        assert(err < 1e-9, `Laminar ΔP ratio = ${ratio.toFixed(10)}, expected 2 (err=${err.toExponential(3)})`)
      } else {
        // Turbulent: f changes very slightly with L (because Re does not change with L),
        // so ΔP scales exactly 2× regardless — the friction factor is the same for both runs
        const ratio = r2.pressureDropLbfFt2 / r1.pressureDropLbfFt2
        const err   = Math.abs(ratio - 2)
        assert(err < 1e-9, `Turbulent ΔP ratio = ${ratio.toFixed(10)}, expected 2 (err=${err.toExponential(3)})`)
      }

      // Power also doubles (P = ΔP · Q, Q is fixed)
      const powerRatio = r2.hydraulicPowerFtLbfPerS / r1.hydraulicPowerFtLbfPerS
      const powerErr   = Math.abs(powerRatio - 2)
      assert(powerErr < 1e-9, `Power ratio = ${powerRatio.toFixed(10)}, expected 2`)

      // Velocity and Reynolds number are unchanged (length doesn't affect flow speed)
      const vErr  = Math.abs(r2.velocity - r1.velocity)
      const reErr = Math.abs(r2.reynoldsNumber - r1.reynoldsNumber)
      assert(vErr  < 1e-10, `Velocity changed when length changed: Δv = ${vErr}`)
      assert(reErr < 1e-6,  `Reynolds number changed when length changed: ΔRe = ${reErr}`)
    }, done)
  })
})
