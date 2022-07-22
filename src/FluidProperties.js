/**
 * Encapsulates the physical properties of the fluid flowing through the pipe.
 *
 * For water at standard conditions (60 °F / 15.6 °C):
 *   density           ≈ 62.4  lbm/ft³
 *   dynamic viscosity ≈ 6.72 × 10⁻⁴  lbm/(ft·s)   [= 1.002 cP]
 *   kinematic viscosity ≈ 1.078 × 10⁻⁵  ft²/s
 *
 * Reference: Munson, Young & Okiishi — Fundamentals of Fluid Mechanics, 8th ed.
 *            Cengel & Cimbala — Fluid Mechanics, 3rd ed., Appendix Table A-9.
 */

export default class FluidProperties {
  /**
   * @param {Object} params
   * @param {number} params.density           - Fluid density in lbm/ft³ (must be > 0)
   * @param {number} params.dynamicViscosity  - Dynamic viscosity in lbm/(ft·s) (must be > 0)
   */
  constructor ({ density, dynamicViscosity }) {
    if (typeof density !== 'number' || density <= 0) {
      throw new TypeError('density must be a positive number (lbm/ft³)')
    }
    if (typeof dynamicViscosity !== 'number' || dynamicViscosity <= 0) {
      throw new TypeError('dynamicViscosity must be a positive number (lbm/(ft·s))')
    }
    this.density = density
    this.dynamicViscosity = dynamicViscosity
  }

  /**
   * Kinematic viscosity: ν = μ / ρ  (ft²/s).
   *
   * Kinematic viscosity represents the ratio of viscous forces to inertial
   * forces per unit density.  It appears in the Reynolds number when the
   * formulation uses velocity and length alone: Re = V·D / ν.
   */
  get kinematicViscosity () {
    return this.dynamicViscosity / this.density
  }

  /**
   * Specific weight: γ = ρ · g / gc  (lbf/ft³).
   *
   * At standard gravity (g = gc = 32.174 ft/s² and 32.174 lbm·ft/(lbf·s²)),
   * γ numerically equals ρ in lbf/ft³.  Specific weight is used to convert
   * between pressure drop (lbf/ft²) and head loss (ft):  h_L = ΔP / γ.
   */
  get specificWeight () {
    return this.density   // g/gc = 1 at standard conditions
  }

  /**
   * Returns a plain-object summary of all fluid properties.
   * @returns {{ density: number, dynamicViscosity: number, kinematicViscosity: number, specificWeight: number }}
   */
  summary () {
    return {
      density: this.density,
      dynamicViscosity: this.dynamicViscosity,
      kinematicViscosity: this.kinematicViscosity,
      specificWeight: this.specificWeight
    }
  }
}
