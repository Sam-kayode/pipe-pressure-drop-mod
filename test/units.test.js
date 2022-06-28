import assert from 'assert'
import {
  GC, G_STD,
  IN_TO_FT, FT_TO_IN, FT_TO_M, IN_TO_M,
  LBF_FT2_TO_PSI, PSI_TO_LBF_FT2, LBF_FT2_TO_PA, PSI_TO_PA,
  FT_LBF_PER_S_TO_HP, FT_LBF_PER_S_TO_W, FT_LBF_PER_S_TO_KW,
  GPM_TO_FT3_PER_S, FT3_PER_S_TO_GPM,
  LBM_FT3_TO_KG_M3,
  inchesToFeet, feetToInches,
  lbfFt2ToPsi, psiToLbfFt2,
  gpmToFt3PerS, ft3PerSToGpm,
  convertPower
} from '../src/units.js'
import approx from './approx.js'

describe('units', () => {
  describe('physical constants', () => {
    it('GC should equal 32.174', () => {
      assert.strictEqual(GC, 32.174)
    })

    it('G_STD should equal 32.174', () => {
      assert.strictEqual(G_STD, 32.174)
    })

    it('1 hp should equal 550 ft·lbf/s (exact)', () => {
      approx.equal(FT_LBF_PER_S_TO_HP, 1 / 550)
    })
  })

  describe('length conversions', () => {
    it('12 inches should equal 1 foot', () => {
      approx.equal(12 * IN_TO_FT, 1)
    })

    it('IN_TO_FT and FT_TO_IN should be reciprocals', () => {
      approx.equal(IN_TO_FT * FT_TO_IN, 1)
    })

    it('1 foot should equal 0.3048 m (exact by definition)', () => {
      assert.strictEqual(FT_TO_M, 0.3048)
    })

    it('1 inch should equal 0.0254 m (exact by definition)', () => {
      assert.strictEqual(IN_TO_M, 0.0254)
    })
  })

  describe('pressure conversions', () => {
    it('1 psi should equal 144 lbf/ft²', () => {
      assert.strictEqual(PSI_TO_LBF_FT2, 144)
    })

    it('LBF_FT2_TO_PSI and PSI_TO_LBF_FT2 should be reciprocals', () => {
      approx.equal(LBF_FT2_TO_PSI * PSI_TO_LBF_FT2, 1)
    })

    it('1 lbf/ft² should be approximately 47.88 Pa', () => {
      approx.equal(LBF_FT2_TO_PA, 47.8803, 0.0001)
    })

    it('1 psi should be approximately 6894.76 Pa', () => {
      approx.equal(PSI_TO_PA, 6894.76, 0.001)
    })
  })

  describe('power conversions', () => {
    it('FT_LBF_PER_S_TO_W should be approximately 1.35582', () => {
      approx.equal(FT_LBF_PER_S_TO_W, 1.35582, 0.0001)
    })

    it('FT_LBF_PER_S_TO_KW should be FT_LBF_PER_S_TO_W / 1000', () => {
      approx.equal(FT_LBF_PER_S_TO_KW, FT_LBF_PER_S_TO_W / 1000)
    })
  })

  describe('flow rate conversions', () => {
    it('GPM_TO_FT3_PER_S and FT3_PER_S_TO_GPM should be reciprocals', () => {
      approx.equal(GPM_TO_FT3_PER_S * FT3_PER_S_TO_GPM, 1)
    })

    it('1 ft³/s should be approximately 448.83 gpm', () => {
      approx.equal(FT3_PER_S_TO_GPM, 448.831, 0.001)
    })
  })

  describe('density conversion', () => {
    it('water density at 60°F (62.4 lbm/ft³) should be ~999.7 kg/m³', () => {
      approx.equal(62.4 * LBM_FT3_TO_KG_M3, 999.6, 0.01)
    })
  })

  describe('helper functions', () => {
    it('inchesToFeet(12) should equal 1', () => {
      approx.equal(inchesToFeet(12), 1)
    })

    it('feetToInches(1) should equal 12', () => {
      approx.equal(feetToInches(1), 12)
    })

    it('inchesToFeet and feetToInches should be inverses', () => {
      approx.equal(feetToInches(inchesToFeet(6)), 6)
    })

    it('lbfFt2ToPsi(144) should equal 1', () => {
      approx.equal(lbfFt2ToPsi(144), 1)
    })

    it('psiToLbfFt2(1) should equal 144', () => {
      approx.equal(psiToLbfFt2(1), 144)
    })

    it('lbfFt2ToPsi and psiToLbfFt2 should be inverses', () => {
      approx.equal(psiToLbfFt2(lbfFt2ToPsi(288)), 288)
    })

    it('gpmToFt3PerS(448.831) should be approximately 1', () => {
      approx.equal(gpmToFt3PerS(448.831), 1, 0.001)
    })

    it('ft3PerSToGpm(1) should be approximately 448.831', () => {
      approx.equal(ft3PerSToGpm(1), 448.831, 0.001)
    })

    it('convertPower should return all four keys', () => {
      const p = convertPower(550)
      assert.strictEqual(p.ftLbfPerS, 550)
      approx.equal(p.hp, 1)
      approx.equal(p.W, 550 * 1.35582, 0.001)
      approx.equal(p.kW, 550 * 1.35582e-3, 0.001)
    })
  })
})
