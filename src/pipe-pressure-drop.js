#!/usr/bin/env node
/**
 * CLI entry point for the pipe pressure-drop and pumping-power calculator.
 *
 * Usage:
 *   node src/pipe-pressure-drop.js <input.json>
 *
 * The JSON file must supply:
 *   density           — water density in lbm/ft³
 *   dynamicViscosity  — dynamic viscosity in lbm/(ft·s)
 *   diameter          — stainless steel pipe diameter in inches
 *   flowRate          — volumetric flow rate in ft³/s
 *   pipeLength        — pipe length in feet
 *   pumpEfficiency    — (optional) pump efficiency η ∈ (0, 1], default 1.0
 */

import { readFileSync } from 'fs'
import PipePressureDrop from './PipePressureDrop.js'

const jsonPath = process.argv[2]

if (!jsonPath) {
  console.error('Usage: node src/pipe-pressure-drop.js <input.json>')
  console.error('')
  console.error('Required fields in JSON:')
  console.error('  density           - water density in lbm/ft³')
  console.error('  dynamicViscosity  - dynamic viscosity in lbm/(ft·s)')
  console.error('  diameter          - stainless steel pipe diameter in inches')
  console.error('  flowRate          - volumetric flow rate in ft³/s')
  console.error('  pipeLength        - pipe length in feet')
  console.error('')
  console.error('Optional fields in JSON:')
  console.error('  pumpEfficiency    - pump efficiency η ∈ (0, 1]  (default: 1.0)')
  console.error('  roughness         - absolute pipe roughness in feet')
  console.error('                      default: 0.000015 ft (Munson et al.)')
  console.error('                      use 0.000007 ft to match Cengel & Cimbala Table 8-2')
  process.exit(1)
}

let params
try {
  params = JSON.parse(readFileSync(jsonPath, 'utf-8'))
} catch (err) {
  console.error(`Error reading ${jsonPath}: ${err.message}`)
  process.exit(1)
}

const solver = new PipePressureDrop(params)
const r = solver.solve()

const line = (label, value) => console.log(`  ${label.padEnd(38)} ${value}`)
const sep  = () => console.log('  ' + '─'.repeat(58))

console.log('')
console.log('=== Water Pipe Pressure Drop & Pumping Power Calculator ===')
console.log('')

console.log('Input Parameters')
sep()
line('Density:',            `${r.density} lbm/ft³`)
line('Dynamic Viscosity:',  `${r.dynamicViscosity} lbm/(ft·s)`)
line('Pipe Diameter:',      `${r.diameter} in  (${r.diameterFt.toFixed(6)} ft)`)
line('Flow Rate:',          `${r.flowRate} ft³/s  (${r.flowRateGpm.toFixed(2)} gpm)`)
line('Pipe Length:',        `${r.pipeLength} ft`)
line('Pump Efficiency:',    `${(r.pumpEfficiency * 100).toFixed(1)} %`)

console.log('')
console.log('Fluid Properties')
sep()
line('Kinematic Viscosity:',  `${r.kinematicViscosity.toExponential(4)} ft²/s`)
line('Specific Weight:',      `${r.specificWeight.toFixed(3)} lbf/ft³`)

console.log('')
console.log('Pipe Geometry')
sep()
line('Cross-sectional Area:',  `${r.crossSectionalArea.toExponential(6)} ft²`)
line('Hydraulic Diameter:',    `${r.hydraulicDiameter.toFixed(6)} ft  (= pipe diameter)`)
line('Absolute Roughness ε:',  `${r.roughness} ft`)
line('Relative Roughness ε/D:', r.relativeRoughness.toExponential(4))
line('L / D ratio:',           r.lengthToDiameterRatio.toFixed(2))

console.log('')
console.log('Flow Characteristics')
sep()
line('Mean Velocity:',        `${r.velocity.toFixed(4)} ft/s`)
line('Reynolds Number:',      r.reynoldsNumber.toFixed(1))
line('Flow Regime:',          r.flowRegime.toUpperCase())
line('Dynamic Pressure:',     `${r.dynamicPressure.toFixed(4)} lbf/ft²`)
line('Velocity Head:',        `${r.velocityHead.toFixed(4)} ft`)

console.log('')
console.log('Friction Factor (Darcy)')
sep()
line('Colebrook-White (iterative):', r.frictionFactor.toFixed(6))
line('Churchill (1977) explicit:',   r.frictionFactorChurchill.toFixed(6))

console.log('')
console.log('Results')
sep()
line('>>> Pressure Drop:',  `${r.pressureDropLbfFt2.toFixed(4)} lbf/ft²`)
line('',                    `${r.pressureDropPsi.toFixed(4)} psi`)
line('>>> Head Loss:',      `${r.headLoss.toFixed(4)} ft`)
line('>>> Hydraulic Power:', `${r.hydraulicPowerFtLbfPerS.toFixed(4)} ft·lbf/s`)
line('',                    `${r.hydraulicPowerHp.toFixed(6)} hp`)
line('',                    `${r.hydraulicPowerWatts.toFixed(4)} W`)
line('',                    `${r.hydraulicPowerKW.toFixed(6)} kW`)
if (r.pumpEfficiency < 1.0) {
  line('>>> Shaft Power (input):', `${r.shaftPowerFtLbfPerS.toFixed(4)} ft·lbf/s`)
  line('',                        `${r.shaftPowerHp.toFixed(6)} hp`)
  line('',                        `${r.shaftPowerWatts.toFixed(4)} W`)
  line('',                        `${r.shaftPowerKW.toFixed(6)} kW`)
}
console.log('')
