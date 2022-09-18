import assert from 'assert'
import PipeGeometry from '../src/PipeGeometry.js'
import approx from './approx.js'

const PIPE_2IN_100FT = { diameter: 2, pipeLength: 100 }

describe('PipeGeometry', () => {
  describe('constructor', () => {
    it('should accept valid parameters', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      assert.strictEqual(g.diameter, 2)
      assert.strictEqual(g.pipeLength, 100)
    })

    it('should throw on non-positive diameter', () => {
      assert.throws(() => new PipeGeometry({ ...PIPE_2IN_100FT, diameter: 0 }),  /diameter/)
      assert.throws(() => new PipeGeometry({ ...PIPE_2IN_100FT, diameter: -2 }), /diameter/)
    })

    it('should throw on non-numeric diameter', () => {
      assert.throws(() => new PipeGeometry({ ...PIPE_2IN_100FT, diameter: '2' }), /diameter/)
    })

    it('should throw on non-positive pipeLength', () => {
      assert.throws(() => new PipeGeometry({ ...PIPE_2IN_100FT, pipeLength: 0 }),   /pipeLength/)
      assert.throws(() => new PipeGeometry({ ...PIPE_2IN_100FT, pipeLength: -50 }), /pipeLength/)
    })
  })

  describe('diameterFt', () => {
    it('should convert 12 inches to 1 foot exactly', () => {
      const g = new PipeGeometry({ diameter: 12, pipeLength: 1 })
      assert.strictEqual(g.diameterFt, 1)
    })

    it('should convert 2 inches to 1/6 foot', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      approx.equal(g.diameterFt, 2 / 12)
    })

    it('should scale linearly with diameter', () => {
      const g1 = new PipeGeometry({ diameter: 2, pipeLength: 100 })
      const g2 = new PipeGeometry({ diameter: 4, pipeLength: 100 })
      approx.equal(g2.diameterFt / g1.diameterFt, 2)
    })
  })

  describe('crossSectionalArea', () => {
    it('should compute A = π D² / 4', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      const D = 2 / 12
      approx.equal(g.crossSectionalArea, Math.PI * D * D / 4)
    })

    it('should scale with the square of diameter', () => {
      const g1 = new PipeGeometry({ diameter: 2, pipeLength: 100 })
      const g2 = new PipeGeometry({ diameter: 4, pipeLength: 100 })
      approx.equal(g2.crossSectionalArea / g1.crossSectionalArea, 4)
    })

    it('should be positive for any valid pipe', () => {
      const g = new PipeGeometry({ diameter: 0.5, pipeLength: 50 })
      assert(g.crossSectionalArea > 0)
    })
  })

  describe('wettedPerimeter and hydraulicDiameter', () => {
    it('wettedPerimeter should equal π × D', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      approx.equal(g.wettedPerimeter, Math.PI * g.diameterFt)
    })

    it('hydraulicDiameter should equal the pipe diameter for a full circular pipe', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      approx.equal(g.hydraulicDiameter, g.diameterFt)
    })

    it('hydraulicDiameter = 4A / P identity should hold', () => {
      const g = new PipeGeometry({ diameter: 3, pipeLength: 50 })
      approx.equal(g.hydraulicDiameter, 4 * g.crossSectionalArea / g.wettedPerimeter)
    })
  })

  describe('roughness and relativeRoughness', () => {
    it('roughness should be 0.000015 ft (stainless steel)', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      assert.strictEqual(g.roughness, 0.000015)
    })

    it('relativeRoughness should equal roughness / diameterFt', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      approx.equal(g.relativeRoughness, g.roughness / g.diameterFt)
    })

    it('relativeRoughness should decrease as pipe diameter increases', () => {
      const g1 = new PipeGeometry({ diameter: 1, pipeLength: 100 })
      const g2 = new PipeGeometry({ diameter: 4, pipeLength: 100 })
      assert(g2.relativeRoughness < g1.relativeRoughness)
    })
  })

  describe('lengthToDiameterRatio', () => {
    it('should equal pipeLength / diameterFt', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      approx.equal(g.lengthToDiameterRatio, g.pipeLength / g.diameterFt)
    })

    it('should scale linearly with pipe length', () => {
      const g1 = new PipeGeometry({ diameter: 2, pipeLength: 100 })
      const g2 = new PipeGeometry({ diameter: 2, pipeLength: 200 })
      approx.equal(g2.lengthToDiameterRatio / g1.lengthToDiameterRatio, 2)
    })
  })

  describe('summary', () => {
    it('should include all geometry properties', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      const s = g.summary()
      const keys = [
        'diameter', 'pipeLength', 'diameterFt', 'radius', 'crossSectionalArea',
        'wettedPerimeter', 'hydraulicDiameter', 'roughness', 'relativeRoughness',
        'lengthToDiameterRatio'
      ]
      for (const key of keys) {
        assert.ok(Object.prototype.hasOwnProperty.call(s, key), `missing: ${key}`)
      }
    })

    it('radius should equal diameterFt / 2', () => {
      const g = new PipeGeometry(PIPE_2IN_100FT)
      approx.equal(g.summary().radius, g.diameterFt / 2)
    })
  })
})
