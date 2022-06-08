/**
 * US customary unit conversion constants and helper functions.
 *
 * All fluid-mechanics calculations in this project use US customary units:
 *   length   : feet (ft), inches (in)
 *   mass     : lbm (pound-mass)
 *   force    : lbf (pound-force)
 *   time     : seconds (s)
 *   pressure : lbf/ft²  (convertible to psi)
 *   power    : ft·lbf/s (convertible to hp, W, or kW)
 *
 * Newton's second law in the US system requires the gravitational conversion
 * constant gc = 32.174 lbm·ft/(lbf·s²) so that F [lbf] = m [lbm] · a [ft/s²] / gc.
 */

// ── Gravitational constants ───────────────────────────────────────────────────

/** Gravitational conversion constant: lbm·ft / (lbf·s²)  (not acceleration) */
export const GC = 32.174

/** Standard gravitational acceleration at sea level: ft/s² */
export const G_STD = 32.174

// ── Length ────────────────────────────────────────────────────────────────────

export const IN_TO_FT = 1 / 12   // 1 in  = 1/12 ft
export const FT_TO_IN = 12       // 1 ft  = 12 in
export const FT_TO_M  = 0.3048   // 1 ft  = 0.3048 m  (exact, by definition)
export const IN_TO_M  = 0.0254   // 1 in  = 0.0254 m  (exact)

// ── Pressure ──────────────────────────────────────────────────────────────────

export const LBF_FT2_TO_PSI = 1 / 144    // 1 lbf/ft²  = 1/144 psi
export const PSI_TO_LBF_FT2 = 144        // 1 psi      = 144 lbf/ft²
export const LBF_FT2_TO_PA  = 47.8803   // 1 lbf/ft²  = 47.8803 Pa
export const PSI_TO_PA       = 6894.76   // 1 psi      = 6894.76 Pa

// ── Power (from ft·lbf/s) ────────────────────────────────────────────────────

export const FT_LBF_PER_S_TO_HP  = 1 / 550      // 1 hp  = 550 ft·lbf/s  (exact, by definition)
export const FT_LBF_PER_S_TO_W   = 1.35582      // 1 ft·lbf/s ≈ 1.35582 W
export const FT_LBF_PER_S_TO_KW  = 1.35582e-3   // 1 ft·lbf/s ≈ 1.35582×10⁻³ kW

// ── Volumetric flow rate ──────────────────────────────────────────────────────

export const GPM_TO_FT3_PER_S = 1 / 448.831   // 1 US gal/min = 1/448.831 ft³/s
export const FT3_PER_S_TO_GPM = 448.831       // 1 ft³/s = 448.831 US gal/min

// ── Density ───────────────────────────────────────────────────────────────────

export const LBM_FT3_TO_KG_M3 = 16.0185  // 1 lbm/ft³ = 16.0185 kg/m³

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Convert pipe diameter from inches to feet.
 * @param {number} inches
 * @returns {number} feet
 */
export function inchesToFeet (inches) {
  return inches * IN_TO_FT
}

/**
 * Convert length from feet to inches.
 * @param {number} feet
 * @returns {number} inches
 */
export function feetToInches (feet) {
  return feet * FT_TO_IN
}

/**
 * Convert pressure from lbf/ft² to psi.
 * @param {number} lbfPerFt2
 * @returns {number} psi
 */
export function lbfFt2ToPsi (lbfPerFt2) {
  return lbfPerFt2 * LBF_FT2_TO_PSI
}

/**
 * Convert pressure from psi to lbf/ft².
 * @param {number} psi
 * @returns {number} lbf/ft²
 */
export function psiToLbfFt2 (psi) {
  return psi * PSI_TO_LBF_FT2
}

/**
 * Convert volumetric flow rate from US gallons per minute to ft³/s.
 * @param {number} gpm
 * @returns {number} ft³/s
 */
export function gpmToFt3PerS (gpm) {
  return gpm * GPM_TO_FT3_PER_S
}

/**
 * Convert volumetric flow rate from ft³/s to US gallons per minute.
 * @param {number} ft3PerS
 * @returns {number} gpm
 */
export function ft3PerSToGpm (ft3PerS) {
  return ft3PerS * FT3_PER_S_TO_GPM
}

/**
 * Convert a power value in ft·lbf/s to all common power units at once.
 * @param {number} ftLbfPerS
 * @returns {{ ftLbfPerS: number, hp: number, W: number, kW: number }}
 */
export function convertPower (ftLbfPerS) {
  return {
    ftLbfPerS,
    hp: ftLbfPerS * FT_LBF_PER_S_TO_HP,
    W:  ftLbfPerS * FT_LBF_PER_S_TO_W,
    kW: ftLbfPerS * FT_LBF_PER_S_TO_KW
  }
}
