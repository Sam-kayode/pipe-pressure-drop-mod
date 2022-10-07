/**
 * Computes the internal flow characteristics given the fluid properties, pipe
 * geometry, and volumetric flow rate.
 *
 * Reynolds-number regimes (per ASME / Moody standard):
 *   Re < 2300          — laminar      (orderly, parallel streamlines; viscosity dominates)
 *   2300 ≤ Re < 4000   — transitional (unstable; actual behaviour is hard to predict)
 *   Re ≥ 4000          — turbulent    (chaotic, high-momentum mixing; inertia dominates)
 *
 * Reference: Munson et al., §8.1–8.2; Cengel & Cimbala, §8-2.
 */

import { GC, G_STD, FT3_PER_S_TO_GPM } from './units.js'

/** Upper Re boundary of the laminar regime */
export const LAMINAR_UPPER = 2300

/** Lower Re boundary of the turbulent regime */
export const TURBULENT_LOWER = 4000

export default class FlowCharacteristics {
  /**
   * @param {Object}          params
   * @param {FluidProperties} params.fluid    - Fluid property object
   * @param {PipeGeometry}    params.geometry - Pipe geometry object
   * @param {number}          params.flowRate - Volumetric flow rate in ft³/s (must be > 0)
   */
  constructor ({ fluid, geometry, flowRate }) {
    if (typeof flowRate !== 'number' || flowRate <= 0) {
      throw new TypeError('flowRate must be a positive number (ft³/s)')
    }
    this.fluid    = fluid
    this.geometry = geometry
    this.flowRate = flowRate  // ft³/s
  }

  /**
   * Volumetric flow rate converted to US gallons per minute.
   * 1 ft³/s = 448.831 US gal/min.
   */
  get flowRateGpm () {
    return this.flowRate * FT3_PER_S_TO_GPM
  }

  /**
   * Mean (bulk) flow velocity: V = Q / A  (ft/s).
   *
   * Derived from continuity for an incompressible fluid at steady state.
   * This is the area-averaged velocity; actual local velocities vary across
   * the cross-section (parabolic in laminar, flatter profile in turbulent flow).
   */
  get velocity () {
    return this.flowRate / this.geometry.crossSectionalArea
  }

  /**
   * Reynolds number (density form): Re = ρ V D / μ  (dimensionless).
   *
   * The primary dimensionless parameter governing flow regime in pipe flow.
   * It represents the ratio of inertial forces (ρ V² / L) to viscous forces
   * (μ V / L²).  Named after Osborne Reynolds (1883).
   */
  get reynoldsNumber () {
    return (this.fluid.density * this.velocity * this.geometry.diameterFt) /
           this.fluid.dynamicViscosity
  }

  /**
   * Reynolds number (kinematic form): Re = V D / ν  (dimensionless).
   * Equivalent to the density form; useful as a cross-check and when ν is the
   * primary tabulated viscosity quantity.
   */
  get reynoldsNumberKinematic () {
    return (this.velocity * this.geometry.diameterFt) /
           this.fluid.kinematicViscosity
  }

  /**
   * Flow regime string based on Reynolds number thresholds.
   * Returns 'laminar', 'transitional', or 'turbulent'.
   */
  get flowRegime () {
    const Re = this.reynoldsNumber
    if (Re < LAMINAR_UPPER)   return 'laminar'
    if (Re < TURBULENT_LOWER) return 'transitional'
    return 'turbulent'
  }

  /** True when the flow is fully laminar (Re < 2300). */
  get isLaminar () {
    return this.reynoldsNumber < LAMINAR_UPPER
  }

  /** True when the flow is turbulent (Re ≥ 4000). */
  get isTurbulent () {
    return this.reynoldsNumber >= TURBULENT_LOWER
  }

  /** True when the flow is in the transition zone (2300 ≤ Re < 4000). */
  get isTransitional () {
    return !this.isLaminar && !this.isTurbulent
  }

  /**
   * Dynamic pressure (kinetic energy per unit volume expressed as a pressure):
   *   q = ρ V² / (2 gc)   (lbf/ft²)
   *
   * The Darcy-Weisbach equation multiplies friction factor × L/D × dynamic
   * pressure to give the pressure drop along the pipe.
   */
  get dynamicPressure () {
    return (this.fluid.density * Math.pow(this.velocity, 2)) / (2 * GC)
  }

  /**
   * Velocity head: h_v = V² / (2 g)  (ft).
   *
   * The kinetic-energy head of the flow; the pressure-head equivalent of the
   * dynamic pressure.  Head loss = f · (L/D) · h_v in the Darcy-Weisbach
   * head-loss formulation.
   */
  get velocityHead () {
    return Math.pow(this.velocity, 2) / (2 * G_STD)
  }

  /**
   * Returns a plain-object summary of all flow characteristics.
   */
  summary () {
    return {
      flowRate:                this.flowRate,
      flowRateGpm:             this.flowRateGpm,
      velocity:                this.velocity,
      reynoldsNumber:          this.reynoldsNumber,
      reynoldsNumberKinematic: this.reynoldsNumberKinematic,
      flowRegime:              this.flowRegime,
      isLaminar:               this.isLaminar,
      isTurbulent:             this.isTurbulent,
      isTransitional:          this.isTransitional,
      dynamicPressure:         this.dynamicPressure,
      velocityHead:            this.velocityHead
    }
  }
}
