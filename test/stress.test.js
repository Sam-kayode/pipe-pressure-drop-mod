import assert from 'assert'
import FrictionFactor      from '../src/FrictionFactor.js'
import FluidProperties     from '../src/FluidProperties.js'
import PipeGeometry        from '../src/PipeGeometry.js'
import FlowCharacteristics from '../src/FlowCharacteristics.js'
import PressureDrop        from '../src/PressureDrop.js'
import PumpingPower        from '../src/PumpingPower.js'
import PipePressureDrop    from '../src/PipePressureDrop.js'

const TEST_DURATION_MS  = 5  * 60 * 1000
const INTERVAL_MS       = 60 * 1000
const TEST_TIMEOUT_MS   = TEST_DURATION_MS + INTERVAL_MS + 30000
const SUITE_TIMEOUT_MS  = 40 * 60 * 1000
const BATCH_SIZE        = 2000

function rnd    (lo, hi) { return lo + Math.random() * (hi - lo) }
function rndLog (lo, hi) { return Math.exp(rnd(Math.log(lo), Math.log(hi))) }

function randomParams () {
  return {
    density:          rnd(50, 80),
    dynamicViscosity: rndLog(1e-5, 5e-3),
    diameter:         rnd(0.25, 24),
    flowRate:         rndLog(1e-4, 10),
    pipeLength:       rnd(10, 5000),
    roughness:        rndLog(1e-7, 1e-3)
  }
}

function stressFor (durationMs, batch, done) {
  const deadline = Date.now() + durationMs
  let total = 0
  let errors = 0
  const firstErrors = []

  function tick () {
    for (let i = 0; i < BATCH_SIZE; i++) {
      try {
        batch()
      } catch (err) {
        errors++
        if (firstErrors.length < 3) firstErrors.push(err.message)
      }
    }
    total += BATCH_SIZE

    if (Date.now() < deadline) {
      setImmediate(tick)
    } else {
      const mins = ((Date.now() - deadline + durationMs) / 60000).toFixed(2)
      console.log(`\n    → ${total.toLocaleString()} iterations | ${mins} min | errors: ${errors}`)
      if (errors > 0) {
        done(new Error(`${errors} failure(s):\n  ${firstErrors.join('\n  ')}`))
      } else {
        done()
      }
    }
  }

  setImmediate(tick)
}

describe('stress tests', function () {
  this.timeout(SUITE_TIMEOUT_MS)

  beforeEach(function (done) {
    this.timeout(INTERVAL_MS + 5000)
    setTimeout(done, INTERVAL_MS)
  })

  it('[5 min] FrictionFactor: compute() returns positive finite values across all regimes', function (done) {
    this.timeout(TEST_TIMEOUT_MS)

    stressFor(TEST_DURATION_MS, () => {
      const Re   = rndLog(1, 1e8)
      const epsD = rnd(0, 0.05)
      const f    = FrictionFactor.compute(Re, epsD)

      assert(Number.isFinite(f), `f not finite at Re=${Re.toExponential(2)}`)
      assert(f > 0,              `f ≤ 0 at Re=${Re.toExponential(2)}`)
      assert(f < 1,              `f ≥ 1 at Re=${Re.toExponential(2)}`)

      if (Re < 2300) {
        assert(Math.abs(f - 64 / Re) < 1e-10, `Laminar f ≠ 64/Re at Re=${Re.toFixed(1)}`)
      }
    }, done)
  })

  it('[5 min] Colebrook: solution satisfies the implicit equation to within 1e-8', function (done) {
    this.timeout(TEST_TIMEOUT_MS)

    stressFor(TEST_DURATION_MS, () => {
      const Re   = rndLog(4000, 1e8)
      const epsD = rnd(0, 0.05)
      const f    = FrictionFactor.colebrook(Re, epsD)
      const sqrtF = Math.sqrt(f)

      const residual = Math.abs(1 / sqrtF - (-2.0 * Math.log10(epsD / 3.7 + 2.51 / (Re * sqrtF))))
      assert(residual < 1e-8, `Colebrook residual ${residual.toExponential(3)} at Re=${Re.toExponential(2)}`)

      const relDiff = Math.abs(FrictionFactor.churchill(Re, epsD) - f) / f
      assert(relDiff < 0.005, `Churchill vs Colebrook: ${(relDiff * 100).toFixed(3)}% at Re=${Re.toExponential(2)}`)
    }, done)
  })

  it('[5 min] PressureDrop: ΔP = γ · h_L and psi conversion identity', function (done) {
    this.timeout(TEST_TIMEOUT_MS)

    stressFor(TEST_DURATION_MS, () => {
      const p = randomParams()
      let drop, fluid

      try {
        fluid    = new FluidProperties({ density: p.density, dynamicViscosity: p.dynamicViscosity })
        const geometry = new PipeGeometry({ diameter: p.diameter, pipeLength: p.pipeLength, roughness: p.roughness })
        const flow     = new FlowCharacteristics({ fluid, geometry, flowRate: p.flowRate })
        drop     = new PressureDrop({ flow, geometry })
      } catch (_) { return }

      assert(drop.majorLoss > 0, 'ΔP ≤ 0')

      const ratio = Math.abs(drop.majorLoss - fluid.specificWeight * drop.headLoss) / drop.majorLoss
      assert(ratio < 1e-9, `ΔP ≠ γ·h_L: rel err ${ratio.toExponential(3)}`)

      const psiErr = Math.abs(drop.majorLossPsi - drop.majorLoss / 144) / drop.majorLossPsi
      assert(psiErr < 1e-12, `psi conversion error: ${psiErr.toExponential(3)}`)
    }, done)
  })

  it('[5 min] PumpingPower: P_fluid = ΔP·Q and shaft power scales with efficiency', function (done) {
    this.timeout(TEST_TIMEOUT_MS)

    stressFor(TEST_DURATION_MS, () => {
      const deltaP = rndLog(0.1, 1e5)
      const Q      = rndLog(1e-5, 100)
      const eta    = rnd(0.01, 1.0)
      const pw     = new PumpingPower({ pressureDrop: deltaP, flowRate: Q, pumpEfficiency: eta })

      const hydErr   = Math.abs(pw.hydraulicPower - deltaP * Q) / pw.hydraulicPower
      const shaftErr = Math.abs(pw.shaftPower - pw.hydraulicPower / eta) / pw.shaftPower
      const hpErr    = Math.abs(pw.shaftPowerHp - pw.shaftPower / 550) / pw.shaftPowerHp
      const wErr     = Math.abs(pw.shaftPowerWatts - pw.shaftPower * 1.35582) / pw.shaftPowerWatts
      const kwErr    = Math.abs(pw.shaftPowerKW - pw.shaftPowerWatts / 1000) / pw.shaftPowerKW

      assert(hydErr   < 1e-12, `P_fluid ≠ ΔP·Q: ${hydErr.toExponential(3)}`)
      assert(shaftErr < 1e-12, `P_shaft error: ${shaftErr.toExponential(3)}`)
      assert(hpErr    < 1e-12, `hp error: ${hpErr.toExponential(3)}`)
      assert(wErr     < 1e-9,  `W error: ${wErr.toExponential(3)}`)
      assert(kwErr    < 1e-12, `kW error: ${kwErr.toExponential(3)}`)
    }, done)
  })

  it('[5 min] PipePressureDrop: doubling pipe length exactly doubles ΔP and power', function (done) {
    this.timeout(TEST_TIMEOUT_MS)

    stressFor(TEST_DURATION_MS, () => {
      const p = randomParams()
      let r1, r2
      try {
        r1 = new PipePressureDrop(p).solve()
        r2 = new PipePressureDrop({ ...p, pipeLength: p.pipeLength * 2 }).solve()
      } catch (_) { return }

      const dpRatio    = r2.pressureDropLbfFt2 / r1.pressureDropLbfFt2
      const powerRatio = r2.hydraulicPowerFtLbfPerS / r1.hydraulicPowerFtLbfPerS

      assert(Math.abs(dpRatio    - 2) < 1e-9, `ΔP ratio = ${dpRatio.toFixed(10)}, expected 2`)
      assert(Math.abs(powerRatio - 2) < 1e-9, `Power ratio = ${powerRatio.toFixed(10)}, expected 2`)
      assert(Math.abs(r2.velocity       - r1.velocity)       < 1e-10, 'Velocity changed with L')
      assert(Math.abs(r2.reynoldsNumber - r1.reynoldsNumber) < 1e-6,  'Re changed with L')
    }, done)
  })
})
