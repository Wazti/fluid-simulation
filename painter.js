'use strict'
const THREE = require('three')

function Painters(gl) {

    const {getShader, addShadersToProgram} = require('./utilities')(gl);
  
    var ParticlePainter
    var GridPainter
      (function() {
        var prog = gl.createProgram()
  
        var vs = getShader(require('./glsl/particle_v.glsl'), gl.VERTEX_SHADER);
        var fs = getShader(require('./glsl/particle_f.glsl'), gl.FRAGMENT_SHADER);
        addShadersToProgram(prog, [vs, fs]); // добавление v f шейдеров частицы
  
        var v_id = gl.getAttribLocation(prog, "v_id")
        var u_particles = gl.getUniformLocation(prog, "u_particles")
        var u_texLength = gl.getUniformLocation(prog, "u_texLength") // связь с переменными вершинного шейдера
        var u_viewProj = gl.getUniformLocation(prog, "u_viewProj")
        var u_color = gl.getUniformLocation(prog, "part_color")
        var u_size = gl.getUniformLocation(prog, "size")
        console.log(u_color, u_texLength)
        ParticlePainter = function(_particles) {
          var particles = _particles
          var readBuffer
          var painter = {
            drawParticles: true,
            drawParticleValues: false,
            setBuffer: function(_particles) {
              particles = _particles
              readBuffer = new Float32Array(4*particles.textureLength*particles.textureLength)
            }
          }
  
          function draw(state) {
            let els = document.getElementsByClassName('particle-label')
            while (els[0]) {
              els[0].parentNode.removeChild(els[0])
            }
  
            if (!painter.drawParticles) return
            gl.useProgram(prog)
            
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, particles.A.tex)
            gl.uniform1i(u_particles, 0)
            gl.uniform1i(u_texLength, particles.textureLength)
            gl.uniform3fv(u_color, state.color)
            gl.uniformMatrix4fv(u_viewProj, false, state.cameraMat.elements);
            gl.bindBuffer(gl.ARRAY_BUFFER, particles.ids)
            gl.enableVertexAttribArray(v_id)
            gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)
            gl.drawArrays(gl.POINTS, 0, particles.length)
            gl.disableVertexAttribArray(v_id)
          }
  
          painter.draw = draw
  
          return painter
        };
      })();
      (function() {
        var progcube = gl.createProgram()
        var vs = getShader(require('./glsl/grid_point_v.glsl'), gl.VERTEX_SHADER);
        var fs = getShader(require('./glsl/grid_point_f.glsl'), gl.FRAGMENT_SHADER);
        addShadersToProgram(progcube, [vs, fs]);
  
        var u_grid2 = gl.getUniformLocation(progcube, "u_grid")
        var u_min2 = gl.getUniformLocation(progcube, "u_min")
        var u_count2 = gl.getUniformLocation(progcube, "u_count")
        var u_cellSize2 = gl.getUniformLocation(progcube, "u_cellSize")
        var u_texLength2 = gl.getUniformLocation(progcube, "u_texLength")
        var u_viewProj2 = gl.getUniformLocation(progcube, "u_viewProj")
        var u_mode = gl.getUniformLocation(progcube, "u_mode")
        var u_c = gl.getUniformLocation(progcube, "u_c")
  
        var v_id = gl.getAttribLocation(progcube, "v_id")
  
        var progline = gl.createProgram()
  
        vs = getShader(require('./glsl/grid_v.glsl'), gl.VERTEX_SHADER);
        fs = getShader(require('./glsl/grid_f.glsl'), gl.FRAGMENT_SHADER);
        addShadersToProgram(progline, [vs, fs]);
        var v_id = gl.getAttribLocation(progline, "v_id")
  
        GridPainter = function(_grid) {
          var grid = _grid
          var buf2 = gl.createBuffer()
          var buf1 = gl.createBuffer()
  
          function setup(grid) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf2)
            let data = new Float32Array(2*grid.count[0]*grid.count[1]*grid.count[2])
            for (let i = 0; i < data.length; ++i) {
              data[i] = i;
            }
            buf2.length = data.length
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
  
            gl.bindBuffer(gl.ARRAY_BUFFER, buf1)
            data = new Float32Array(1*grid.count[0]*grid.count[1]*grid.count[2])
            for (let i = 0; i < data.length; ++i) {
              data[i] = i;
            }
            buf1.length = data.length
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
          }
  
          if (grid) setup(grid)
  
          function drawTypes() {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf1)
            gl.enableVertexAttribArray(v_id)
            gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)
  
            gl.drawArrays(gl.POINTS, 0, buf1.length)
  
            gl.disableVertexAttribArray(v_id)
  
          }
  
          var painter = {
            drawTypes: true,
            drawMIC: true,
            setBuffer: function(_grid) {
              grid = _grid
              setup(grid)
            }
          }
  
          function draw(state) {
            let els = document.getElementsByClassName('grid-label')
            while (els[0]) {
              els[0].parentNode.removeChild(els[0])
            }
  
            if (painter.drawTypes || painter.drawMIC) {
              gl.enable(gl.BLEND)
              gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
              gl.useProgram(progcube)
              gl.uniform1i(u_grid2, 0)
              gl.uniform1i(u_texLength2, grid.textureLength)
              gl.uniform3fv(u_min2, grid.min)
              gl.uniform3i(u_count2, grid.count[0], grid.count[1], grid.count[2])
              gl.uniform1f(u_cellSize2, grid.cellSize)
              gl.uniformMatrix4fv(u_viewProj2, false, state.cameraMat.elements);
  
              gl.activeTexture(gl.TEXTURE0)
              if (painter.drawTypes) {
                gl.uniform1i(u_mode, 0)
                gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                drawTypes()
              }
              if (painter.drawMIC) {
                gl.uniform1i(u_mode, 1)
                gl.bindTexture(gl.TEXTURE_2D, grid.MIC1.tex)
  
                drawTypes()
              }
  
            }
          }
          
          painter.draw = draw
  
          return painter
        }
      })();  
    return {
      ParticlePainter,
      GridPainter,
    }
  }
  
  export default Painters