/**
 * Darcy-Weisbach friction factor correlations for circular pipe flow.
 *
 * The Darcy (or Moody) friction factor f relates the frictional pressure loss
 * per unit length to the dynamic pressure of the flow:
 *
 *   ΔP = f · (L / D) · (ρ V² / 2gc)
 *
 * Four correlations are implemented, each suited to a different regime or use case:
 *
 *   1. Hagen-Poiseuille  — exact solution for laminar flow (Re < 2300)
 *   2. Swamee-Jain (1976) — explicit approximation for turbulent flow (±3 %)
 *   3. Colebrook-White (1939) — implicit standard for turbulent flow (Moody diagram)
 *   4. Churchill (1977) — universal explicit formula covering all Reynolds numbers
 *
 * The static method `compute` selects the appropriate correlation automatically:
 * Hagen-Poiseuille for laminar, Colebrook-White for turbulent, and a linear
 * blend across the transitional zone (2300 ≤ Re < 4000).
 *
 * References:
 *   Colebrook & White (1937), Proc. R. Soc. Lond. A 161, pp. 367–381.
 *   Moody (1944), Trans. ASME 66, pp. 671–684.
 *   Swamee & Jain (1976), J. Hydraulics Division ASCE 102, pp. 657–664.
 *   Churchill (1977), Chem. Eng. Nov. 7, pp. 91–92.
 */

const LAMINAR_LIMIT   = 2300
const TURBULENT_LIMIT = 4000
const MAX_ITER        = 100    // safety cap for Colebrook iteration
const COLEBROOK_TOL   = 1e-12  // convergence criterion (change in f)

export default class FrictionFactor {
  /**
   * Hagen-Poiseuille friction factor — exact for fully developed laminar flow.
   *
   *   f = 64 / Re
   *
   * Derived analytically from the Navier-Stokes equations for a Newtonian fluid
   * in a straight circular pipe at Re < 2300.  The parabolic velocity profile
   * (Poiseuille flow) gives a friction factor inversely proportional to Re.
   *
   * @param {number} Re - Reynolds number (must be > 0)
   * @returns {number} Darcy friction factor
   */
  static laminar (Re) {
    if (typeof Re !== 'number' || Re <= 0) {
      throw new RangeError('Re must be a positive number')
    }
    return 64 / Re
  }

  /**
   * Swamee-Jain (1976) explicit approximation for turbulent friction factor.
   *
   *   f = 0.25 / { log₁₀[ ε/(3.7 D) + 5.74 / Re^0.9 ] }²
   *
   * An explicit alternative to the implicit Colebrook-White equation, accurate
   * to within ±3 % for:
   *   5 × 10³ ≤ Re ≤ 10⁸   and   10⁻⁶ ≤ ε/D ≤ 10⁻²
   *
   * Also used here as the starting estimate for Colebrook-White iteration.
   *
   * @param {number} Re           - Reynolds number (turbulent)
   * @param {number} relRoughness - Relative roughness ε/D (dimensionless, ≥ 0)
   * @returns {number} Darcy friction factor
   */
  static swameeJain (Re, relRoughness) {
    if (typeof Re !== 'number' || Re <= 0) {
      throw new RangeError('Re must be a positive number')
    }
    if (typeof relRoughness !== 'number' || relRoughness < 0) {
      throw new RangeError('relRoughness must be ≥ 0')
    }
    const term = relRoughness / 3.7 + 5.74 / Math.pow(Re, 0.9)
    return 0.25 / Math.pow(Math.log10(term), 2)
  }

  /**
   * Colebrook-White (1939) iterative friction factor — the Moody-diagram standard.
   *
   * Implicit equation solved by fixed-point iteration:
   *   1 / √f = −2 log₁₀[ ε/(3.7 D) + 2.51 / (Re √f) ]
   *
   * Seeded with the Swamee-Jain approximation; typically converges in 4–6
   * iterations to a change in f smaller than 10⁻¹².  Valid for all Re ≥ 4000
   * and all ε/D ≥ 0 (the smooth-pipe limit ε/D → 0 recovers the Prandtl
   * smooth-pipe law, and the fully-rough limit Re → ∞ recovers the von Kármán
   * rough-pipe law).
   *
   * @param {number} Re           - Reynolds number (turbulent, ≥ 4000)
   * @param {number} relRoughness - Relative roughness ε/D (dimensionless, ≥ 0)
   * @returns {number} Darcy friction factor
   */
  static colebrook (Re, relRoughness) {
    if (typeof Re !== 'number' || Re <= 0) {
      throw new RangeError('Re must be a positive number')
    }
    if (typeof relRoughness !== 'number' || relRoughness < 0) {
      throw new RangeError('relRoughness must be ≥ 0')
    }
    const roughTerm = relRoughness / 3.7
    let f = FrictionFactor.swameeJain(Re, relRoughness)  // initial guess
    for (let i = 0; i < MAX_ITER; i++) {
      const fNew = Math.pow(
        -2.0 * Math.log10(roughTerm + 2.51 / (Re * Math.sqrt(f))),
        -2
      )
      if (Math.abs(fNew - f) < COLEBROOK_TOL) { f = fNew; break }
      f = fNew
    }
    return f
  }

  /**
   * Churchill (1977) universal friction factor — explicit, covers all Re.
   *
   *   f = 8 · [ (8/Re)¹² + (A + B)^(−3/2) ]^(1/12)
   *
   *   A = { −2.457 · ln[ (7/Re)^0.9 + 0.27 · (ε/D) ] }¹⁶
   *   B = (37530 / Re)¹⁶
   *
   * Key properties:
   *   · Reproduces f = 64/Re exactly in the laminar limit (Re → 0).
   *   · Matches Colebrook-White to within ±0.5 % for Re > 10⁴.
   *   · No iteration required — useful for rapid design calculations.
   *   · A single formula spanning laminar, transitional, and turbulent regimes.
   *
   * @param {number} Re           - Reynolds number (any value > 0)
   * @param {number} relRoughness - Relative roughness ε/D (≥ 0)
   * @returns {number} Darcy friction factor
   */
  static churchill (Re, relRoughness) {
    if (typeof Re !== 'number' || Re <= 0) {
      throw new RangeError('Re must be a positive number')
    }
    if (typeof relRoughness !== 'number' || relRoughness < 0) {
      throw new RangeError('relRoughness must be ≥ 0')
    }
    const A = Math.pow(
      -2.457 * Math.log(Math.pow(7 / Re, 0.9) + 0.27 * relRoughness),
      16
    )
    const B = Math.pow(37530 / Re, 16)
    return 8 * Math.pow(Math.pow(8 / Re, 12) + Math.pow(A + B, -1.5), 1 / 12)
  }

  /**
   * Selects the appropriate friction-factor correlation for the given Re.
   *
   *   Re < 2300          → Hagen-Poiseuille (exact laminar solution)
   *   Re ≥ 4000          → Colebrook-White  (ASME/Moody industry standard)
   *   2300 ≤ Re < 4000   → Linear interpolation between the two regime limits
   *                         (the transitional zone is physically indeterminate;
   *                          results here should be treated as estimates only)
   *
   * @param {number} Re           - Reynolds number
   * @param {number} relRoughness - Relative roughness ε/D (dimensionless, ≥ 0)
   * @returns {number} Darcy friction factor
   */
  static compute (Re, relRoughness) {
    if (Re < LAMINAR_LIMIT) {
      return FrictionFactor.laminar(Re)
    }
    if (Re >= TURBULENT_LIMIT) {
      return FrictionFactor.colebrook(Re, relRoughness)
    }
    // Transitional blend: linearly interpolate between the laminar limit at
    // Re = 2300 and the turbulent (Colebrook) value at Re = 4000.
    const fAt2300 = FrictionFactor.laminar(LAMINAR_LIMIT)
    const fAt4000 = FrictionFactor.colebrook(TURBULENT_LIMIT, relRoughness)
    const t = (Re - LAMINAR_LIMIT) / (TURBULENT_LIMIT - LAMINAR_LIMIT)
    return fAt2300 + t * (fAt4000 - fAt2300)
  }
}
