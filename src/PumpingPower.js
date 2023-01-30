/**
 * Calculates the power required to move fluid through a pipe against friction.
 *
 * Two power quantities are defined:
 *
 *   Hydraulic power (fluid power):
 *     P_fluid = ΔP · Q   [ft·lbf/s]
 *   The rate at which energy is transferred from the pump to the fluid.
 *   This is the theoretical minimum required for an ideal (lossless) pump.
 *
 *   Shaft power (brake power / input power):
 *     P_shaft = P_fluid / η_pump   [ft·lbf/s]
 *   The actual power the motor must deliver to the pump shaft, accounting for
 *   internal mechanical and hydraulic losses inside the pump.
 *
 * Pump efficiency η (0 < η ≤ 1):
 *   An ideal pump has η = 1 (P_shaft = P_fluid).
 *   Typical centrifugal pumps have η = 0.60–0.85.
 *
 * Both quantities are reported in ft·lbf/s, hp, W, and kW.
 *
 * Reference: Munson et al. §12.2; Cengel & Cimbala §14-3.
 */

import {
  FT_LBF_PER_S_TO_HP,
  FT_LBF_PER_S_TO_W,
  FT_LBF_PER_S_TO_KW
} from './units.js'

export default class PumpingPower {
  /**
   * @param {Object} params
   * @param {number} params.pressureDrop       - Pressure drop across the pipe in lbf/ft² (> 0)
   * @param {number} params.flowRate           - Volumetric flow rate in ft³/s (> 0)
   * @param {number} [params.pumpEfficiency=1] - Overall pump efficiency η, range (0, 1] (default: 1.0)
   */
  constructor ({ pressureDrop, flowRate, pumpEfficiency = 1.0 }) {
    if (typeof pressureDrop !== 'number' || pressureDrop <= 0) {
      throw new TypeError('pressureDrop must be a positive number (lbf/ft²)')
    }
    if (typeof flowRate !== 'number' || flowRate <= 0) {
      throw new TypeError('flowRate must be a positive number (ft³/s)')
    }
    if (typeof pumpEfficiency !== 'number' || pumpEfficiency <= 0 || pumpEfficiency > 1) {
      throw new RangeError('pumpEfficiency must be in the range (0, 1]')
    }
    this.pressureDrop   = pressureDrop
    this.flowRate       = flowRate
    this.pumpEfficiency = pumpEfficiency
  }

  // ── Hydraulic (fluid) power ──────────────────────────────────────────────────

  /**
   * Hydraulic power delivered to the fluid:
   *   P_fluid = ΔP · Q   [ft·lbf/s]
   */
  get hydraulicPower () {
    return this.pressureDrop * this.flowRate
  }

  /** Hydraulic power in horsepower. */
  get hydraulicPowerHp () {
    return this.hydraulicPower * FT_LBF_PER_S_TO_HP
  }

  /** Hydraulic power in watts. */
  get hydraulicPowerWatts () {
    return this.hydraulicPower * FT_LBF_PER_S_TO_W
  }

  /** Hydraulic power in kilowatts. */
  get hydraulicPowerKW () {
    return this.hydraulicPower * FT_LBF_PER_S_TO_KW
  }

  // ── Shaft (input) power ──────────────────────────────────────────────────────

  /**
   * Required shaft (input) power accounting for pump efficiency:
   *   P_shaft = P_fluid / η   [ft·lbf/s]
   *
   * This is the power the motor must supply.  For an ideal pump (η = 1),
   * P_shaft = P_fluid.
   */
  get shaftPower () {
    return this.hydraulicPower / this.pumpEfficiency
  }

  /** Shaft power in horsepower. */
  get shaftPowerHp () {
    return this.shaftPower * FT_LBF_PER_S_TO_HP
  }

  /** Shaft power in watts. */
  get shaftPowerWatts () {
    return this.shaftPower * FT_LBF_PER_S_TO_W
  }

  /** Shaft power in kilowatts. */
  get shaftPowerKW () {
    return this.shaftPower * FT_LBF_PER_S_TO_KW
  }

  /**
   * Returns a plain-object summary of all power results.
   */
  summary () {
    return {
      pumpEfficiency:       this.pumpEfficiency,
      hydraulicPower:       this.hydraulicPower,
      hydraulicPowerHp:     this.hydraulicPowerHp,
      hydraulicPowerWatts:  this.hydraulicPowerWatts,
      hydraulicPowerKW:     this.hydraulicPowerKW,
      shaftPower:           this.shaftPower,
      shaftPowerHp:         this.shaftPowerHp,
      shaftPowerWatts:      this.shaftPowerWatts,
      shaftPowerKW:         this.shaftPowerKW
    }
  }
}
