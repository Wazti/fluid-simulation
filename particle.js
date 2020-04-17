'use strict'

const ATTRIB_COUNT = 8

function Particle(i, buffer) {
  var particle = {}
  particle.px = buffer[ATTRIB_COUNT * i + 0]
  particle.py = buffer[ATTRIB_COUNT * i + 1]
  particle.pz = buffer[ATTRIB_COUNT * i + 2]
  particle.vx = buffer[ATTRIB_COUNT * i + 4]
  particle.vy = buffer[ATTRIB_COUNT * i + 5]
  particle.vz = buffer[ATTRIB_COUNT * i + 6]
  return particle
}

export function _ParticleBuffer(gl) {

  const {setupFramebufferTexture} = require('./utilities')(gl)

  return function ParticleBuffer() {
    var particles = []

    var particleBuffer
    
    particleBuffer = {
      addRegion: region => {
        region.particleIterator((x, y, z) => {
          particles.push(x)
          particles.push(y)
          particles.push(z)
          particles.push(Math.random()) 
          particles.push(1)
          particles.push(0) //фильтры цвета
          particles.push(0)
          particles.push(0) 
        })
      },

      create: () => {
        var minPixels = particles.length / 3
        particleBuffer.textureLength = Math.pow(2, Math.ceil(Math.log2(Math.ceil(Math.sqrt(minPixels)))))
        var ids = new Float32Array(particleBuffer.length);
        particleBuffer.buffer = new Float32Array(particleBuffer.textureLength * particleBuffer.textureLength * 4)
        for (let i = 0; i < particles.length; ++i) {
          particleBuffer.buffer[i] = particles[i]
          ids[i] = i
        }

        particleBuffer.A = {
          tex: gl.createTexture(),
          fbo: gl.createFramebuffer()
        }

        particleBuffer.B = {
          tex: gl.createTexture(),
          fbo: gl.createFramebuffer()
        }

        setupFramebufferTexture(particleBuffer.A.tex, particleBuffer.A.fbo, particleBuffer.textureLength, particleBuffer.textureLength, particleBuffer.buffer)
        setupFramebufferTexture(particleBuffer.B.tex, particleBuffer.B.fbo, particleBuffer.textureLength, particleBuffer.textureLength, particleBuffer.buffer)
        particleBuffer.ids = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer.ids)
        gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW)
        gl.bindBuffer(gl.ARRAY_BUFFER, null)

        console.log(`Created ${particles.length / ATTRIB_COUNT} particles`)
      },

      particle: i => {
        return Particle(i, particleBuffer.buffer)
      },

      get length() {
        return particles.length / ATTRIB_COUNT
      },
      swap() {
        var ex = particleBuffer.A
        particleBuffer.A = particleBuffer.B
        particleBuffer.B = ex
      },
      buffer: null
    }

    return particleBuffer
  }
}

class ParticleRegion {
  constructor(density) {
    this.density = density
  }
}

export class BoxRegion extends ParticleRegion {
  constructor(density, bound) {
    super(density)
    this.bound = bound
  }

  particleIterator(cb) {
    var length = 1 / Math.cbrt(this.density)
    for (let x = this.bound.minX; x < this.bound.maxX; x += length) {
      for (let y = this.bound.minY; y < this.bound.maxY; y += length) {
        for (let z = this.bound.minZ; z < this.bound.maxZ; z += length) {
          cb(x, y, z) // расставляем по позициям Box 
        }
      }
    }
  }
}