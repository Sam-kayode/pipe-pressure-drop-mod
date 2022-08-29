/**
 * Encapsulates the geometric properties of a full circular stainless steel pipe.
 *
 * Pipe surface roughness (absolute) — reference values for stainless steel:
 *   ε = 0.000007 ft (~2.1 μm)  — Cengel & Cimbala, Table 8-2/8-3
 *   ε = 0.000015 ft (~4.6 μm)  — Munson et al., Table 8.1  (default)
 *
 * Other pipe materials for comparison:
 *   Commercial steel ε ≈ 0.00015  ft  (~46 μm)
 *   Cast iron        ε ≈ 0.00085  ft  (~260 μm)
 *
 * Source: Moody (1944), Trans. ASME 66, pp. 671–684.
 *
 * All computed lengths are in feet unless explicitly noted.
 */

import { IN_TO_FT } from './units.js'

const DEFAULT_ROUGHNESS_FT = 0.000015   // Munson et al. value for stainless steel

export default class PipeGeometry {
  /**
   * @param {Object} params
   * @param {number} params.diameter     - Internal pipe diameter in inches (must be > 0)
   * @param {number} params.pipeLength   - Straight pipe length in feet (must be > 0)
   * @param {number} [params.roughness]  - Absolute pipe roughness in feet (must be > 0,
   *                                       default: 0.000015 ft per Munson et al.
   *                                       Use 0.000007 ft to match Cengel & Cimbala)
   */
  constructor ({ diameter, pipeLength, roughness }) {
    if (typeof diameter !== 'number' || diameter <= 0) {
      throw new TypeError('diameter must be a positive number (inches)')
    }
    if (typeof pipeLength !== 'number' || pipeLength <= 0) {
      throw new TypeError('pipeLength must be a positive number (feet)')
    }
    if (roughness !== undefined && (typeof roughness !== 'number' || roughness <= 0)) {
      throw new TypeError('roughness must be a positive number (feet)')
    }
    this.diameter   = diameter    // inches
    this.pipeLength = pipeLength  // feet
    this._roughness = roughness !== undefined ? roughness : DEFAULT_ROUGHNESS_FT
  }

  /** Internal diameter converted to feet: D [ft] = D [in] / 12 */
  get diameterFt () {
    return this.diameter * IN_TO_FT
  }

  /** Internal pipe radius: r = D / 2  (ft) */
  get radius () {
    return this.diameterFt / 2
  }

  /**
   * Internal cross-sectional flow area: A = π D² / 4  (ft²).
   * Used with volumetric flow rate to compute mean velocity: V = Q / A.
   */
  get crossSectionalArea () {
    return (Math.PI * Math.pow(this.diameterFt, 2)) / 4
  }

  /**
   * Wetted perimeter: P = π D  (ft).
   * For a full circular pipe the wetted perimeter equals the inner circumference.
   */
  get wettedPerimeter () {
    return Math.PI * this.diameterFt
  }

  /**
   * Hydraulic diameter: D_h = 4 A / P  (ft).
   * For a full circular pipe D_h = D exactly, but the formula generalises to
   * non-circular ducts.  Included here to illustrate the general definition.
   */
  get hydraulicDiameter () {
    return (4 * this.crossSectionalArea) / this.wettedPerimeter
  }

  /**
   * Absolute surface roughness ε (ft).
   * Defaults to 0.000015 ft (Munson et al.) unless overridden in the constructor.
   * To match Cengel & Cimbala Table 8-2, supply roughness: 0.000007 in the JSON.
   */
  get roughness () {
    return this._roughness
  }

  /**
   * Relative roughness: ε / D  (dimensionless).
   * The non-dimensional surface roughness is the primary roughness parameter
   * in the Moody diagram and Colebrook-White equation.
   */
  get relativeRoughness () {
    return this.roughness / this.diameterFt
  }

  /**
   * Length-to-diameter ratio: L / D  (dimensionless).
   * Multiplied by the friction factor and dynamic pressure in the
   * Darcy-Weisbach equation to give the total pressure drop.
   */
  get lengthToDiameterRatio () {
    return this.pipeLength / this.diameterFt
  }

  /**
   * Returns a plain-object summary of all geometric properties.
   */
  summary () {
    return {
      diameter:             this.diameter,
      pipeLength:           this.pipeLength,
      diameterFt:           this.diameterFt,
      radius:               this.radius,
      crossSectionalArea:   this.crossSectionalArea,
      wettedPerimeter:      this.wettedPerimeter,
      hydraulicDiameter:    this.hydraulicDiameter,
      roughness:            this.roughness,
      relativeRoughness:    this.relativeRoughness,
      lengthToDiameterRatio: this.lengthToDiameterRatio
    }
  }
}
