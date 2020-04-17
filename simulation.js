'use strict'

//http://www.danenglesson.com/images/portfolio/FLIP/rapport.pdf
export default function (gl) {
    const {getShader, addShadersToProgram, setupFramebufferTexture} = require('./utilities')(gl)

    var quad_vbo = (function(){
        var buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            1.0, 1.0
        ]), gl.STATIC_DRAW)
        return buffer
    })()

    function Simulation (grid, particles, solverSteps) {

        var clearGridVelocity = (function() {
            var prog = gl.createProgram()

            var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/clear_vel_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var v_pos = gl.getAttribLocation(prog, "v_pos")

            return function() {
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.A.fbo)
                gl.clear(gl.COLOR_BUFFER_BIT)

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.B.fbo)
                gl.clear(gl.COLOR_BUFFER_BIT)

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.old.fbo)
                gl.clear(gl.COLOR_BUFFER_BIT)
            }
        })()

        var projectToGrid = (function() {
            var prog = gl.createProgram()

            var vs = getShader(require('./glsl/transfer_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/transfer_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var u_min = gl.getUniformLocation(prog, "u_min")
            var u_offset = gl.getUniformLocation(prog, "u_offset")
            var u_count = gl.getUniformLocation(prog, "u_count")
            var u_goffset = gl.getUniformLocation(prog, "u_goffset")
            var u_cellSize = gl.getUniformLocation(prog, "u_cellSize")
            var u_texLength = gl.getUniformLocation(prog, "u_texLength")
            var u_g = gl.getUniformLocation(prog, "u_g")
            var u_weights = gl.getUniformLocation(prog, "u_weights")

            var v_id = gl.getAttribLocation(prog, "v_id")
            var u_particles = gl.getUniformLocation(prog, "u_particles")
            var u_particleTexLength = gl.getUniformLocation(prog, "u_particleTexLength")


            var progAvg = gl.createProgram()
            
            var vsAvg = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
            var fsAvg = getShader(require('./glsl/project_average_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(progAvg, [vsAvg, fsAvg]);

            var v_pos = gl.getAttribLocation(progAvg, "v_pos")
            var gU_old = gl.getUniformLocation(progAvg, "gU_old")
            var u_counts = gl.getUniformLocation(progAvg, "u_counts")

            var counts = {
                tex: gl.createTexture(),
                fbo: gl.createFramebuffer()
            }

            setupFramebufferTexture(counts.tex, counts.fbo, grid.textureLength, grid.textureLength, null)

            return function() {

                gl.bindFramebuffer(gl.FRAMEBUFFER, counts.fbo)
                gl.clear(gl.COLOR_BUFFER_BIT)

                gl.useProgram(prog)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, particles.A.tex)
                gl.uniform1i(u_particles, 0)

                gl.uniform1i(u_particleTexLength, particles.textureLength)
                
                gl.uniform3fv(u_min, grid.min)
                gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])
                gl.uniform1f(u_cellSize, grid.cellSize)
                gl.uniform1i(u_texLength, grid.textureLength)

                gl.bindBuffer(gl.ARRAY_BUFFER, particles.ids)
                gl.enableVertexAttribArray(v_id)
                gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.B.fbo)
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                gl.enable(gl.BLEND)
                gl.blendFunc(gl.ONE, gl.ONE)
                gl.uniform1i(u_weights, 0)
                for (let g = 0; g < 3; ++g) {
                    gl.uniform1i(u_g, g);
                    var r = 1;
                    for (let i = -r; i <= r; ++i) {
                        for (let j = -r; j <= r; ++j) {
                            for (let k = -r; k <= r; ++k) {
                                gl.uniform3i(u_goffset, i,j,k);
                                gl.drawArrays(gl.POINTS, 0, particles.length)
                            }
                        }   
                    }
                }

                gl.bindFramebuffer(gl.FRAMEBUFFER, counts.fbo)
                gl.uniform1i(u_weights, 1)
                for (let g = 0; g < 3; ++g) {
                    gl.uniform1i(u_g, g);
                    var r = 1;
                    for (let i = -r; i <= r; ++i) {
                        for (let j = -r; j <= r; ++j) {
                            for (let k = -r; k <= r; ++k) {
                                gl.uniform3i(u_goffset, i,j,k);
                                gl.drawArrays(gl.POINTS, 0, particles.length)
                            }
                        }   
                    }
                }

                gl.disable(gl.BLEND)

                gl.disableVertexAttribArray(v_id)

                grid.swap()

                gl.useProgram(progAvg)
                
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                gl.uniform1i(gU_old, 0)

                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, counts.tex)
                gl.uniform1i(u_counts, 1)

                gl.enableVertexAttribArray(v_pos)

                gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                gl.enableVertexAttribArray(v_pos)
                gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                
                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.B.fbo)
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                gl.disableVertexAttribArray(v_pos)

                grid.swap()

                
            }
        })()

        var copyGrid = (function() {
            var prog = gl.createProgram()

            var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/copy_grid_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var v_pos = gl.getAttribLocation(prog, "v_pos")
            var u_grid = gl.getUniformLocation(prog, "u_grid")

            return function() {
                gl.useProgram(prog)
                
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                gl.uniform1i(u_grid, 0)

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.old.fbo)
                gl.clear(gl.COLOR_BUFFER_BIT)
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                gl.enableVertexAttribArray(v_pos)
                gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                gl.disableVertexAttribArray(v_pos)
            }
        })()

        var gravityUpdate = (function() {
            var prog = gl.createProgram()

            var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/gravity_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var v_pos = gl.getAttribLocation(prog, "v_pos")
            var gU_old = gl.getUniformLocation(prog, "gU_old")
            var u_t = gl.getUniformLocation(prog, "u_t")

            var u_types = gl.getUniformLocation(prog, "u_types")
            var u_texLength = gl.getUniformLocation(prog, "u_texLength")
            var u_count = gl.getUniformLocation(prog, "u_count")

            return function(t) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.B.fbo)
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                gl.useProgram(prog)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                gl.uniform1i(gU_old, 0)
                gl.uniform1f(u_t, t)

                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                gl.uniform1i(u_types, 1)

                gl.uniform1i(u_texLength, grid.textureLength)
                gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                gl.enableVertexAttribArray(v_pos)
                gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                gl.disableVertexAttribArray(v_pos)

                grid.swap()
            }
        })()

        var markCells = (function() {
            var prog = gl.createProgram()
            
            var vs = getShader(require('./glsl/mark_grid_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/mark_grid_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var u_min = gl.getUniformLocation(prog, "u_min")
            var u_count = gl.getUniformLocation(prog, "u_count")
            var u_cellSize = gl.getUniformLocation(prog, "u_cellSize")
            var u_texLength = gl.getUniformLocation(prog, "u_texLength")
            var u_near = gl.getUniformLocation(prog, "u_near")

            var u_particles = gl.getUniformLocation(prog, "u_particles")
            var u_particleTexLength = gl.getUniformLocation(prog, "u_particleTexLength")

            var v_id = gl.getAttribLocation(prog, "v_id")


            var prog2 = gl.createProgram()

            var vs2 = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
            var fs2 = getShader(require('./glsl/mark-edge-frag.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog2, [vs2, fs2]);

            var v_pos = gl.getAttribLocation(prog2, "v_pos")
            var u_texLength2 = gl.getUniformLocation(prog2, "u_texLength")
            var u_count2 = gl.getUniformLocation(prog2, "u_count")
            var u_cellSize2 = gl.getUniformLocation(prog2, "u_cellSize")

            var pointCount = 6 * particles.length
            var pointBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
            var data = new Float32Array(pointCount)
            for (var i = 0; i < pointCount; ++i) { data[i] = i }
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)
            
            return function() {
                gl.useProgram(prog)

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.T.fbo)
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)
                gl.clear(gl.COLOR_BUFFER_BIT)
                
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, particles.A.tex)
                gl.uniform1i(u_particles, 0)

                gl.uniform1i(u_texLength, grid.textureLength)
                gl.uniform1i(u_particleTexLength, particles.textureLength)
                gl.uniform1f(u_cellSize, grid.cellSize)
                gl.uniform3fv(u_min, grid.min)
                gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
                gl.enableVertexAttribArray(v_id)
                gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)

                gl.uniform1i(u_near, 1)
                gl.drawArrays(gl.POINTS, 0, pointCount)
                gl.uniform1i(u_near, 0)
                gl.drawArrays(gl.POINTS, 0, particles.length)

                gl.disableVertexAttribArray(v_id)


                gl.useProgram(prog2)
                
                gl.uniform1i(u_texLength2, grid.textureLength)
                gl.uniform3i(u_count2, grid.count[0], grid.count[1], grid.count[2])
                gl.uniform1f(u_cellSize2, grid.cellSize)

                gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                gl.enableVertexAttribArray(v_pos)
                gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                gl.disableVertexAttribArray(v_pos)
            }
        })()

        var enforceBoundary = (function() {
            var prog = gl.createProgram()

            var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/boundary_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var v_pos = gl.getAttribLocation(prog, "v_pos")
            var u_texLength = gl.getUniformLocation(prog, "u_texLength")
            var u_min = gl.getUniformLocation(prog, "u_min")
            var u_max = gl.getUniformLocation(prog, "u_max")
            var u_cellSize = gl.getUniformLocation(prog, "u_cellSize")
            var u_grid = gl.getUniformLocation(prog, "u_grid")
            var u_types = gl.getUniformLocation(prog, "u_types")
            var u_count = gl.getUniformLocation(prog, "u_count")

            return function() {
                gl.useProgram(prog)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                gl.uniform1i(u_grid, 0)

                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                gl.uniform1i(u_types, 1)

                gl.uniform1i(u_texLength, grid.textureLength)
                gl.uniform3fv(u_min, grid.min)
                gl.uniform3fv(u_max, grid.max)
                gl.uniform1f(u_cellSize, grid.cellSize)
                gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.B.fbo)
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                gl.enableVertexAttribArray(v_pos)
                gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                gl.disableVertexAttribArray(v_pos)

                grid.swap()
            }
        })()

        var pressureSolve = (function() {

            var tempTex = {
                tex: gl.createTexture(),
                fbo: gl.createFramebuffer()
            }

            var tempTex2 = {
                tex: gl.createTexture(),
                fbo: gl.createFramebuffer()
            }

            setupFramebufferTexture(tempTex.tex, tempTex.fbo, 2, 2, null)
            setupFramebufferTexture(tempTex2.tex, tempTex2.fbo, 2, 2, null)

            var q1 = {
                tex: gl.createTexture(),
                fbo: gl.createFramebuffer()
            }

            var q2 = {
                tex: gl.createTexture(),
                fbo: gl.createFramebuffer()
            }

            setupFramebufferTexture(q1.tex, q1.fbo, grid.textureLength, grid.textureLength, null)
            setupFramebufferTexture(q2.tex, q2.fbo, grid.textureLength, grid.textureLength, null)


            var clearMatrices = (function() {
                return function() {
                    gl.clearColor(0,0,0,0)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.P.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.div.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.MIC1.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.MIC2.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG2.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, tempTex.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, tempTex2.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, q1.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, q2.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
                }
            })()

            var buildA = (function() {
                var prog = gl.createProgram()

                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/buildA_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs]);

                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_types = gl.getUniformLocation(prog, "u_types")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")

                var v_pos = gl.getAttribLocation(prog, "v_pos")

                return function() {
                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                    gl.uniform1i(u_types, 0)
                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.P.fbo)
                    gl.clearColor(0,0,0,0)
                    gl.clear(gl.COLOR_BUFFER_BIT)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)

                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    gl.disableVertexAttribArray(v_pos)
                }
            })()


            var setupb = (function() {
                var prog = gl.createProgram()

                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/setupb_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs]);
                
                var v_pos = gl.getAttribLocation(prog, "v_pos")
                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_types = gl.getUniformLocation(prog, "u_types")
                var u_A = gl.getUniformLocation(prog, "u_A")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_scale = gl.getUniformLocation(prog, "u_scale")


                return function() {
                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                    gl.uniform1i(u_types, 0)
                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                    gl.uniform1i(u_A, 1)
                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])
                    gl.uniform1f(u_scale, 1.0 / grid.cellSize)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)
                    gl.clearColor(0,0,0,0)
                    gl.clear(gl.COLOR_BUFFER_BIT)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)

                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.div.fbo)

                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    gl.disableVertexAttribArray(v_pos)

                }
            })()

            var precondition = (function() {
                var prog = gl.createProgram();
                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/precondition_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs])
                
                var v_pos = gl.getAttribLocation(prog, "v_pos")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_A = gl.getUniformLocation(prog, "u_A")
                var u_Pre = gl.getUniformLocation(prog, "u_Pre")
                var u_types = gl.getUniformLocation(prog, "u_types")
                var u_iter = gl.getUniformLocation(prog, "u_iter")

                return function() {
                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.P.tex)
                    gl.uniform1i(u_A, 0)
                    gl.activeTexture(gl.TEXTURE2)
                    gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                    gl.uniform1i(u_types, 2)
                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])
                    
                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.MIC1.fbo)
                    gl.clearColor(0,0,0,0)
                    gl.clear(gl.COLOR_BUFFER_BIT)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)

                    var N = Math.max(Math.max(grid.count[0], grid.count[1]), grid.count[2]);
                    gl.activeTexture(gl.TEXTURE1)
                    gl.uniform1i(u_Pre, 1)
                    for (var i = 0; i < N; ++i) {
                        var temp = grid.MIC1
                        grid.MIC1 = grid.MIC2
                        grid.MIC2 = temp

                        gl.bindFramebuffer(gl.FRAMEBUFFER, grid.MIC1.fbo)
                        gl.bindTexture(gl.TEXTURE_2D, grid.MIC2.tex)
                        gl.uniform1i(u_iter, i)
                        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                    }
                    
                    gl.disableVertexAttribArray(v_pos)

                }
            })()

            var IPPprecondition = (function() {
                var prog = gl.createProgram()

                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/ipp_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs])

                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_A = gl.getUniformLocation(prog, "u_A")
                var u_types = gl.getUniformLocation(prog, "u_types")
                var u_pcg = gl.getUniformLocation(prog, "u_pcg")

                var u_setS = gl.getUniformLocation(prog, "u_setS")
                var u_step = gl.getUniformLocation(prog, "u_step")

                var v_pos = gl.getAttribLocation(prog, "v_pos")

                return function(setS) {
                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.P.tex)
                    gl.uniform1i(u_A, 0)
                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                    gl.uniform1i(u_types, 1)

                    gl.uniform1i(u_setS, setS)
                    
                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                    gl.activeTexture(gl.TEXTURE2)
                    gl.uniform1i(u_pcg, 2)

                    var temp

                    temp = grid.PCG1
                    grid.PCG1 = grid.PCG2
                    grid.PCG2 = temp

                    gl.uniform1i(u_step, 0)
                    gl.uniform1i(u_setS, 0)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG2.tex)
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    temp = grid.PCG1
                    grid.PCG1 = grid.PCG2
                    grid.PCG2 = temp

                    gl.uniform1i(u_step, 1)
                    gl.uniform1i(u_setS, 1)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG2.tex)
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    gl.disableVertexAttribArray(v_pos)
                }
            })()

            var preconditionZ = (function() {
                
                var prog = gl.createProgram();
                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/preconditionz_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs])

                var v_pos = gl.getAttribLocation(prog, "v_pos")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_A = gl.getUniformLocation(prog, "u_A")
                var u_types = gl.getUniformLocation(prog, "u_types")
                var u_pre = gl.getUniformLocation(prog, "u_pre")
                var u_pcg = gl.getUniformLocation(prog, "u_pcg")
                var u_q = gl.getUniformLocation(prog, "u_q")
                var u_setS = gl.getUniformLocation(prog, "u_setS")
                var u_iter = gl.getUniformLocation(prog, "u_iter")
                var u_step = gl.getUniformLocation(prog, "u_step")

                return function(setS) {

                    gl.bindFramebuffer(gl.FRAMEBUFFER, q1.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, q2.fbo)
                    gl.clear(gl.COLOR_BUFFER_BIT)

                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.P.tex)
                    gl.uniform1i(u_A, 0)
                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, grid.MIC1.tex)
                    gl.uniform1i(u_pre, 1)
                    gl.activeTexture(gl.TEXTURE3)
                    gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                    gl.uniform1i(u_types, 3)
                    gl.uniform1i(u_setS, setS)

                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                    var temp

                    var N = Math.max(Math.max(grid.count[0], grid.count[1]), grid.count[2]);
                    gl.activeTexture(gl.TEXTURE2)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG1.tex)
                    gl.uniform1i(u_pcg, 2)

                    gl.uniform1i(u_step, 0)
                    gl.activeTexture(gl.TEXTURE4)
                    gl.uniform1i(u_q, 4)
                    for (var i = 0; i < N; ++i) {
                        temp = q1
                        q1 = q2
                        q2 = temp

                        gl.bindFramebuffer(gl.FRAMEBUFFER, q1.fbo)
                        gl.bindTexture(gl.TEXTURE_2D, q2.tex)
                        gl.uniform1i(u_iter, i)
                        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                    }

                    gl.bindTexture(gl.TEXTURE_2D, q1.tex)

                    gl.uniform1i(u_step, 1)
                    gl.activeTexture(gl.TEXTURE2)
                    for (var i = N-1; i >= 0; --i) {
                        temp = grid.PCG1
                        grid.PCG1 = grid.PCG2
                        grid.PCG2 = temp

                        gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)
                        gl.bindTexture(gl.TEXTURE_2D, grid.PCG2.tex)
                        gl.uniform1i(u_iter, i)
                        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                    }

                    gl.disableVertexAttribArray(v_pos)
                }
            })()

            var computeSigma = (function() {
                var prog = gl.createProgram()
                
                var vs = getShader(require('./glsl/pressure/sigma_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/set_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs]);

                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_pcg = gl.getUniformLocation(prog, "u_pcg")
                var u_preconditioned = gl.getUniformLocation(prog, "u_preconditioned")

                var v_id = gl.getAttribLocation(prog, "v_id")

                var pointCount = grid.count[0]*grid.count[1]*grid.count[2]
                var pointBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
                var data = new Float32Array(pointCount)
                for (var i = 0; i < pointCount; ++i) { data[i] = i }
                gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
                gl.bindBuffer(gl.ARRAY_BUFFER, null)

                return function(useNew, isPreconditioned) {
                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG1.tex)
                    gl.uniform1i(u_pcg, 0);
                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                    gl.uniform1i(u_preconditioned, isPreconditioned)

                    gl.bindFramebuffer(gl.FRAMEBUFFER, tempTex.fbo)
                    gl.enable(gl.SCISSOR_TEST)
                    if (useNew) {
                        gl.viewport(0,1,1,1)
                        gl.scissor(0,1,1,1)
                    } else {
                        gl.viewport(0,0,1,1)
                        gl.scissor(0,0,1,1)
                    }
                    
                    gl.clearColor(0,0,0,0)
                    gl.clear(gl.COLOR_BUFFER_BIT)
                    

                    gl.enable(gl.BLEND)
                    gl.blendFunc(gl.ONE, gl.ONE)
                    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
                    gl.enableVertexAttribArray(v_id)
                    gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)
                    gl.drawArrays(gl.POINTS, 0, pointCount)
                    gl.disableVertexAttribArray(v_id)
                    gl.bindBuffer(gl.ARRAY_BUFFER, null)
                    gl.disable(gl.BLEND)

                    gl.disable(gl.SCISSOR_TEST)
                }
            })()

            var computeAs = (function() {
                var prog = gl.createProgram()

                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/as_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs]);

                var u_A = gl.getUniformLocation(prog, "u_A")
                var u_types = gl.getUniformLocation(prog, "u_types")
                var u_pcg = gl.getUniformLocation(prog, "u_pcg")
                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_scale = gl.getUniformLocation(prog, "u_scale")

                var v_pos = gl.getAttribLocation(prog, "v_pos")

                return function() {
                    gl.useProgram(prog)

                    var temp = grid.PCG1
                    grid.PCG1 = grid.PCG2
                    grid.PCG2 = temp
                    
                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                    gl.uniform1i(u_types, 0);
                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG2.tex)
                    gl.uniform1i(u_pcg, 1);
                    gl.activeTexture(gl.TEXTURE2)
                    gl.bindTexture(gl.TEXTURE_2D, grid.P.tex)
                    gl.uniform1i(u_A, 2);

                    gl.uniform1f(u_scale, 1 / (grid.cellSize * grid.cellSize))

                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                    gl.disableVertexAttribArray(v_pos)
                }
            })()

            var clearZ = (function() {
                var progClear = gl.createProgram()
                var vsClear = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fsClear = getShader(require('./glsl/pressure/clearZ_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(progClear, [vsClear, fsClear]);
                var u_pcgClear = gl.getUniformLocation(progClear, "u_pcg")
                var v_posClear = gl.getAttribLocation(progClear, "v_pos")

                return function() {
                    var temp = grid.PCG1
                    grid.PCG1 = grid.PCG2
                    grid.PCG2 = temp

                    gl.useProgram(progClear)
                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG2.tex)
                    gl.uniform1i(u_pcgClear, 0);
                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                    gl.enableVertexAttribArray(v_posClear)
                    gl.vertexAttribPointer(v_posClear, 2, gl.FLOAT, false, 0, 0)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                    gl.disableVertexAttribArray(v_posClear)
                }
            })()


            var computeAlpha = (function() {
                var prog = gl.createProgram()
                
                var vs = getShader(require('./glsl/pressure/alpha_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/set_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs]);

                var u_count = gl.getUniformLocation(prog, "u_count")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_pcg = gl.getUniformLocation(prog, "u_pcg")

                var v_id = gl.getAttribLocation(prog, "v_id")

                var pointCount = grid.count[0]*grid.count[1]*grid.count[2]
                var pointBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
                var data = new Float32Array(pointCount)
                for (var i = 0; i < pointCount; ++i) { data[i] = i }
                gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
                gl.bindBuffer(gl.ARRAY_BUFFER, null)

                return function() {
                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG1.tex)
                    gl.uniform1i(u_pcg, 0);
                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                    gl.bindFramebuffer(gl.FRAMEBUFFER, tempTex.fbo)
                    gl.enable(gl.SCISSOR_TEST)
                    gl.viewport(1,0,1,1)
                    gl.scissor(1,0,1,1)
                    gl.clearColor(0,0,0,0)
                    gl.clear(gl.COLOR_BUFFER_BIT)
                    

                    gl.enable(gl.BLEND)
                    gl.blendFunc(gl.ONE, gl.ONE)
                    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
                    gl.enableVertexAttribArray(v_id)
                    gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)
                    gl.drawArrays(gl.POINTS, 0, pointCount)
                    gl.disableVertexAttribArray(v_id)
                    gl.bindBuffer(gl.ARRAY_BUFFER, null)
                    gl.disable(gl.BLEND)

                    gl.disable(gl.SCISSOR_TEST)
                }
            })()

            var updateGuess = (function() {
                var prog = gl.createProgram();
                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/updateGuess_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs])

                var v_pos = gl.getAttribLocation(prog, "v_pos")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_count = gl.getUniformLocation(prog, "u_count")

                var u_pcg = gl.getUniformLocation(prog, "u_pcg")
                var u_const = gl.getUniformLocation(prog, "u_const")
                var u_alpha = gl.getUniformLocation(prog, "u_alpha")

                return function() {
                    gl.useProgram(prog)

                    var temp = grid.PCG1
                    grid.PCG1 = grid.PCG2
                    grid.PCG2 = temp

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG2.tex)
                    gl.uniform1i(u_pcg, 0)

                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, tempTex.tex)
                    gl.uniform1i(u_const, 1)
                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)

                    gl.viewport(0,0,grid.textureLength,grid.textureLength)
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    gl.disableVertexAttribArray(v_pos)
                        
                }
            })()


            var updateSearch = (function() {
                var prog = gl.createProgram();
                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
                var fs = getShader(require('./glsl/pressure/updateSearch_f.glsl'), gl.FRAGMENT_SHADER);
                addShadersToProgram(prog, [vs, fs])

                var v_pos = gl.getAttribLocation(prog, "v_pos")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_count = gl.getUniformLocation(prog, "u_count")

                var u_pcg = gl.getUniformLocation(prog, "u_pcg")
                var u_const = gl.getUniformLocation(prog, "u_const")
                var u_beta = gl.getUniformLocation(prog, "u_beta")

                return function() {
                    gl.useProgram(prog)

                    var temp = grid.PCG1
                    grid.PCG1 = grid.PCG2
                    grid.PCG2 = temp

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG2.tex)
                    gl.uniform1i(u_pcg, 0)

                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, tempTex.tex)
                    gl.uniform1i(u_const, 1)

         

                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.PCG1.fbo)

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)

                    gl.viewport(0,0,grid.textureLength,grid.textureLength)
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    gl.disableVertexAttribArray(v_pos)
                }
            })()

            var velocityUpdate = (function() {
                var prog = gl.createProgram()
                var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER)
                var fs = getShader(require('./glsl/pressure/velocityUpdate_f.glsl'), gl.FRAGMENT_SHADER)
                addShadersToProgram(prog, [vs, fs])

                var v_pos = gl.getAttribLocation(prog, "v_pos")
                var u_texLength = gl.getUniformLocation(prog, "u_texLength")
                var u_count = gl.getUniformLocation(prog, "u_count")

                var u_grid = gl.getUniformLocation(prog, "u_grid")
                var u_types = gl.getUniformLocation(prog, "u_types")
                var u_pcg = gl.getUniformLocation(prog, "u_pcg")
                var u_scale = gl.getUniformLocation(prog, "u_scale")
                
                return function(t) {
                    gl.useProgram(prog)

                    gl.activeTexture(gl.TEXTURE0)
                    gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                    gl.uniform1i(u_grid, 0)

                    gl.activeTexture(gl.TEXTURE1)
                    gl.bindTexture(gl.TEXTURE_2D, grid.PCG1.tex)
                    gl.uniform1i(u_pcg, 1)

                    gl.activeTexture(gl.TEXTURE2)
                    gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                    gl.uniform1i(u_types, 2)

                    gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])
                    gl.uniform1i(u_texLength, grid.textureLength)
                    gl.uniform1f(u_scale, 1 / grid.cellSize)

                    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                    
                    gl.enableVertexAttribArray(v_pos)
                    gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                    
                    gl.bindFramebuffer(gl.FRAMEBUFFER, grid.B.fbo)
                    gl.viewport(0, 0, grid.textureLength, grid.textureLength)
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

                    gl.disableVertexAttribArray(v_pos)

                    grid.swap()
                }
            })()

            return function(t, settings) {
                clearMatrices()
           
                buildA()
                setupb()

                if (settings.precondition) {
                    if (settings.ipp) {
                        IPPprecondition(true) // set z = P-1 r, s = z
                    } else {
                        precondition()
                        preconditionZ(true)
                    }
                }
                
                var buf = new Float32Array(4*grid.textureLength*grid.textureLength)

                for (var i = 0; i < solverSteps; ++i) {
                    
                    computeSigma(false, settings.precondition) // compute z dot r

                    clearZ()
                    computeAs() // set z = As 
                    computeAlpha() // compute z dot s

                    updateGuess()

                    if (settings.precondition) {
                        clearZ()
                        if (settings.ipp) {
                            IPPprecondition(false)
                        } else {
                            preconditionZ(false)
                        }
                        
                    }
                    computeSigma(true, settings.precondition)

                    updateSearch()
                }

                velocityUpdate(t)
            }
        })()

        var extrapolateVelocity = (function() {
            
            var prog = gl.createProgram();
            var vs = getShader(require('./glsl/quad_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/pressure/extrapolate_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs])

            var v_pos = gl.getAttribLocation(prog, "v_pos")
            var u_texLength = gl.getUniformLocation(prog, "u_texLength")
            var u_cellSize = gl.getUniformLocation(prog, "u_cellSize")
            var u_grid = gl.getUniformLocation(prog, "u_grid")
            var u_types = gl.getUniformLocation(prog, "u_types")
            var u_count = gl.getUniformLocation(prog, "u_count")

            return function() {
                gl.useProgram(prog);

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                gl.uniform1i(u_grid, 0)

                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, grid.T.tex)
                gl.uniform1i(u_types, 1)

                gl.uniform1i(u_texLength, grid.textureLength)
                gl.uniform1f(u_cellSize, grid.cellSize)
                gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])

                gl.bindFramebuffer(gl.FRAMEBUFFER, grid.B.fbo)
                gl.viewport(0, 0, grid.textureLength, grid.textureLength)

                gl.bindBuffer(gl.ARRAY_BUFFER, quad_vbo)
                
                gl.enableVertexAttribArray(v_pos)
                gl.vertexAttribPointer(v_pos, 2, gl.FLOAT, false, 0, 0)
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
                gl.disableVertexAttribArray(v_pos)

                grid.swap()

            }
        })()

        var updateVelocities = (function() {
            var prog = gl.createProgram()

            var vs = getShader(require('./glsl/updateVel_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/updateVel_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var u_gA = gl.getUniformLocation(prog, "u_gA")
            var u_gOld = gl.getUniformLocation(prog, "u_gOld")
            var u_particles = gl.getUniformLocation(prog, "u_particles")
            var u_particleTexLength = gl.getUniformLocation(prog, "u_particleTexLength")
            var u_gridTexLength = gl.getUniformLocation(prog, "u_gridTexLength")
            var u_copy = gl.getUniformLocation(prog, "u_copy")
            
            var u_min = gl.getUniformLocation(prog, "u_min")
            var u_cellSize = gl.getUniformLocation(prog, "u_cellSize")
            var u_count = gl.getUniformLocation(prog, "u_count")
            var u_t = gl.getUniformLocation(prog, "u_t")
            var u_smooth = gl.getUniformLocation(prog, "u_smooth")

            var v_id = gl.getAttribLocation(prog, "v_id")

            var pointCount = 2*particles.length
            var pointBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
            var data = new Float32Array(pointCount)
            for (var i = 0; i < pointCount; ++i) { data[i] = i }
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)

            return function(t, smooth) {
                gl.useProgram(prog)
                
                gl.bindFramebuffer(gl.FRAMEBUFFER, particles.B.fbo)
                gl.viewport(0, 0, particles.textureLength, particles.textureLength)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, particles.A.tex)
                gl.uniform1i(u_particles, 0)

                gl.activeTexture(gl.TEXTURE1)
                gl.bindTexture(gl.TEXTURE_2D, grid.A.tex)
                gl.uniform1i(u_gA, 1)

                gl.activeTexture(gl.TEXTURE2)
                gl.bindTexture(gl.TEXTURE_2D, grid.old.tex)
                gl.uniform1i(u_gOld, 2)

                gl.uniform1f(u_smooth, smooth)

                gl.uniform1i(u_particleTexLength, particles.textureLength)
                gl.uniform1i(u_gridTexLength, grid.textureLength)
                gl.uniform3fv(u_min, grid.min)
                gl.uniform3i(u_count, grid.count[0], grid.count[1], grid.count[2])
                gl.uniform1f(u_cellSize, grid.cellSize)
                gl.uniform1f(u_t, t);

                gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
                gl.enableVertexAttribArray(v_id)
                gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)

                gl.drawArrays(gl.POINTS, 0, pointCount)

                gl.disableVertexAttribArray(v_id)

                gl.bindBuffer(gl.ARRAY_BUFFER, null)
                gl.bindTexture(gl.TEXTURE_2D, null)
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)

                particles.swap()
            }
        })()

        var updatePositions = (function() {
            var prog = gl.createProgram()

            var vs = getShader(require('./glsl/advect_v.glsl'), gl.VERTEX_SHADER);
            var fs = getShader(require('./glsl/advect_f.glsl'), gl.FRAGMENT_SHADER);
            addShadersToProgram(prog, [vs, fs]);

            var v_id = gl.getAttribLocation(prog, "v_id")
            var u_particles = gl.getUniformLocation(prog, "u_particles")
            var u_particleTexLength = gl.getUniformLocation(prog, "u_particleTexLength")
            var u_t = gl.getUniformLocation(prog, "u_t")
            var u_min = gl.getUniformLocation(prog, "u_min")
            var u_max = gl.getUniformLocation(prog, "u_max")

            var pointCount = 2*particles.length
            var pointBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
            var data = new Float32Array(pointCount)
            for (var i = 0; i < pointCount; ++i) { data[i] = i }
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            gl.bindBuffer(gl.ARRAY_BUFFER, null)

            return function(t) {
                gl.useProgram(prog)

                gl.bindFramebuffer(gl.FRAMEBUFFER, particles.B.fbo)
                gl.viewport(0, 0, particles.textureLength, particles.textureLength)

                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, particles.A.tex)
                gl.uniform1i(u_particles, 0)

                gl.uniform1f(u_t, t)
                gl.uniform3fv(u_min, grid.min)
                gl.uniform3fv(u_max, grid.max)
                gl.uniform1i(u_particleTexLength, particles.textureLength)

                gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
                gl.enableVertexAttribArray(v_id)
                gl.vertexAttribPointer(v_id, 1, gl.FLOAT, false, 0, 0)

                gl.drawArrays(gl.POINTS, 0, pointCount)

                gl.disableVertexAttribArray(v_id)
                gl.bindBuffer(gl.ARRAY_BUFFER, null)
                gl.bindTexture(gl.TEXTURE_2D, null)
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)

                particles.swap()
            }
        })()

        return {
            step: function(t, settings) {
                gl.clearColor(0, 0, 0, 0.0);
                gl.disable(gl.DEPTH_TEST)

                clearGridVelocity()
                
                projectToGrid();

                copyGrid()

                markCells();

                gravityUpdate(t);

                enforceBoundary();

                pressureSolve(t, settings);

                extrapolateVelocity();

                enforceBoundary();

                updateVelocities(t, settings.viscosity / 100);

                updatePositions(t);

            },
            shouldUpdate: false
        }
    }

    return {
        Simulation
    }
}