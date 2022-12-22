/**
 * Calculates the major (friction) pressure loss in a straight circular pipe
 * using the Darcy-Weisbach equation:
 *
 *   ΔP = f · (L / D) · (ρ V² / 2 gc)   [lbf/ft²]
 *
 * The equivalent head-loss formulation is:
 *
 *   h_L = f · (L / D) · (V² / 2 g)     [ft]
 *
 * These two forms are related by:  ΔP = γ · h_L  where γ = ρ · g / gc.
 * At standard gravity (g = gc = 32.174), γ = ρ numerically.
 *
 * Two friction-factor results are reported:
 *   · frictionFactor        — Colebrook-White (iterative, ASME standard)
 *   · frictionFactorChurchill — Churchill (1977) explicit universal formula
 *
 * Reference: Munson et al. §8.4; Cengel & Cimbala §8-4.
 */

import FrictionFactor from './FrictionFactor.js'
import { LBF_FT2_TO_PSI } from './units.js'

export default class PressureDrop {
  /**
   * @param {Object}              params
   * @param {FlowCharacteristics} params.flow     - Flow characteristics object
   * @param {PipeGeometry}        params.geometry - Pipe geometry object
   */
  constructor ({ flow, geometry }) {
    this.flow     = flow
    this.geometry = geometry
  }

  /**
   * Darcy friction factor via Colebrook-White (iterative).
   * Delegates to FrictionFactor.compute() which chooses the correct correlation
   * based on flow regime (Hagen-Poiseuille / blended / Colebrook-White).
   */
  get frictionFactor () {
    return FrictionFactor.compute(
      this.flow.reynoldsNumber,
      this.geometry.relativeRoughness
    )
  }

  /**
   * Darcy friction factor via the Churchill (1977) universal explicit formula.
   * Provided for comparison; differs from Colebrook by < 0.5 % at Re > 10⁴.
   */
  get frictionFactorChurchill () {
    return FrictionFactor.churchill(
      this.flow.reynoldsNumber,
      this.geometry.relativeRoughness
    )
  }

  /**
   * Major (Darcy-Weisbach) pressure loss:
   *   ΔP = f · (L/D) · q   (lbf/ft²)
   * where q = ρ V² / (2 gc) is the dynamic pressure from FlowCharacteristics.
   */
  get majorLoss () {
    return (
      this.frictionFactor *
      this.geometry.lengthToDiameterRatio *
      this.flow.dynamicPressure
    )
  }

  /**
   * Major pressure loss converted to psi (lbf/in²).
   */
  get majorLossPsi () {
    return this.majorLoss * LBF_FT2_TO_PSI
  }

  /**
   * Head loss in feet — the Darcy-Weisbach equation in its head form:
   *   h_L = f · (L / D) · (V² / 2g)   [ft]
   *
   * Relates to pressure drop via:  ΔP [lbf/ft²] = γ [lbf/ft³] · h_L [ft]
   * At standard gravity, γ = ρ so h_L = ΔP / ρ.
   */
  get headLoss () {
    return (
      this.frictionFactor *
      this.geometry.lengthToDiameterRatio *
      this.flow.velocityHead
    )
  }

  /**
   * Total pressure drop (major losses only; minor losses from fittings
   * and valves are outside the scope of this module).  Alias for majorLoss.
   */
  get total () {
    return this.majorLoss
  }

  /** Total pressure drop in psi. */
  get totalPsi () {
    return this.majorLossPsi
  }

  /**
   * Returns a plain-object summary of all pressure-drop results.
   */
  summary () {
    return {
      frictionFactor:          this.frictionFactor,
      frictionFactorChurchill: this.frictionFactorChurchill,
      majorLoss:               this.majorLoss,
      majorLossPsi:            this.majorLossPsi,
      headLoss:                this.headLoss,
      total:                   this.total,
      totalPsi:                this.totalPsi
    }
  }
}
