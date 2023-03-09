/**
 * Main solver — orchestrates all sub-modules to determine the pressure drop and
 * required pumping power for fully-developed, steady, incompressible flow through
 * a straight circular stainless steel pipe.
 *
 * Computation sequence:
 *   1.  FluidProperties    — stores density and dynamic viscosity; derives ν and γ.
 *   2.  PipeGeometry       — stores diameter and length; derives A, D_h, ε/D, L/D.
 *   3.  FlowCharacteristics — computes V, Re, regime, dynamic pressure, velocity head.
 *   4.  PressureDrop       — applies Darcy-Weisbach using the Colebrook-White f.
 *   5.  PumpingPower       — computes hydraulic and shaft power with pump efficiency.
 *
 * Accepted inputs (US customary units):
 *   density          lbm/ft³
 *   dynamicViscosity lbm/(ft·s)
 *   diameter         inches
 *   flowRate         ft³/s
 *   pipeLength       feet
 *   pumpEfficiency   dimensionless fraction (0, 1]  — optional, default 1.0
 */

import FluidProperties     from './FluidProperties.js'
import PipeGeometry        from './PipeGeometry.js'
import FlowCharacteristics from './FlowCharacteristics.js'
import PressureDrop        from './PressureDrop.js'
import PumpingPower        from './PumpingPower.js'

export default class PipePressureDrop {
  /**
   * @param {Object} params
   * @param {number} params.density           - Water density in lbm/ft³
   * @param {number} params.dynamicViscosity  - Dynamic viscosity in lbm/(ft·s)
   * @param {number} params.diameter          - Pipe internal diameter in inches
   * @param {number} params.flowRate          - Volumetric flow rate in ft³/s
   * @param {number} params.pipeLength        - Pipe length in feet
   * @param {number} [params.pumpEfficiency]  - Pump efficiency η ∈ (0, 1], default 1.0
   */
  constructor ({
    density,
    dynamicViscosity,
    diameter,
    flowRate,
    pipeLength,
    roughness,
    pumpEfficiency = 1.0
  }) {
    this.fluid    = new FluidProperties({ density, dynamicViscosity })
    this.geometry = new PipeGeometry({ diameter, pipeLength, roughness })
    this.flow     = new FlowCharacteristics({
      fluid: this.fluid,
      geometry: this.geometry,
      flowRate
    })
    this.drop  = new PressureDrop({ flow: this.flow, geometry: this.geometry })
    this.power = new PumpingPower({
      pressureDrop: this.drop.total,
      flowRate,
      pumpEfficiency
    })
  }

  /**
   * Returns a complete, flat results object that combines all sub-module outputs.
   * The keys are grouped into sections matching the computation sequence above.
   * @returns {Object}
   */
  solve () {
    return {
      // ── Inputs ────────────────────────────────────────────────────────────────
      density:          this.fluid.density,
      dynamicViscosity: this.fluid.dynamicViscosity,
      diameter:         this.geometry.diameter,
      flowRate:         this.flow.flowRate,
      pipeLength:       this.geometry.pipeLength,
      pumpEfficiency:   this.power.pumpEfficiency,

      // ── Fluid properties (FluidProperties) ───────────────────────────────────
      kinematicViscosity: this.fluid.kinematicViscosity,
      specificWeight:     this.fluid.specificWeight,

      // ── Pipe geometry (PipeGeometry) ──────────────────────────────────────────
      diameterFt:             this.geometry.diameterFt,
      crossSectionalArea:     this.geometry.crossSectionalArea,
      hydraulicDiameter:      this.geometry.hydraulicDiameter,
      roughness:              this.geometry.roughness,
      relativeRoughness:      this.geometry.relativeRoughness,
      lengthToDiameterRatio:  this.geometry.lengthToDiameterRatio,

      // ── Flow characteristics (FlowCharacteristics) ────────────────────────────
      flowRateGpm:             this.flow.flowRateGpm,
      velocity:                this.flow.velocity,
      reynoldsNumber:          this.flow.reynoldsNumber,
      reynoldsNumberKinematic: this.flow.reynoldsNumberKinematic,
      flowRegime:              this.flow.flowRegime,
      dynamicPressure:         this.flow.dynamicPressure,
      velocityHead:            this.flow.velocityHead,

      // ── Friction factor (FrictionFactor via PressureDrop) ─────────────────────
      frictionFactor:          this.drop.frictionFactor,
      frictionFactorChurchill: this.drop.frictionFactorChurchill,

      // ── Pressure drop (PressureDrop) ──────────────────────────────────────────
      pressureDropLbfFt2: this.drop.total,
      pressureDropPsi:    this.drop.totalPsi,
      headLoss:           this.drop.headLoss,

      // ── Pumping power (PumpingPower) ──────────────────────────────────────────
      hydraulicPowerFtLbfPerS: this.power.hydraulicPower,
      hydraulicPowerHp:        this.power.hydraulicPowerHp,
      hydraulicPowerWatts:     this.power.hydraulicPowerWatts,
      hydraulicPowerKW:        this.power.hydraulicPowerKW,
      shaftPowerFtLbfPerS:     this.power.shaftPower,
      shaftPowerHp:            this.power.shaftPowerHp,
      shaftPowerWatts:         this.power.shaftPowerWatts,
      shaftPowerKW:            this.power.shaftPowerKW
    }
  }
}
