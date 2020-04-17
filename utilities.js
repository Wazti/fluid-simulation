'use strict'

module.exports = function(gl) {
  function getShader(source, type) {
    var shader = gl.createShader(type); // создание шейдера
    gl.shaderSource(shader, source); // устанавливаем шейдеру его программный код
    gl.compileShader(shader); // компилируем шейдер

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Ошибка связанная с шейдером", source);
    }
    return shader;
  }
  // https://webglfundamentals.org/webgl/lessons/ru/webgl-render-to-texture.html
  function setupFramebufferTexture(tex, fbo, width, height, buffer) {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    if (gl.webgl2) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, buffer)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, buffer)
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  function addShadersToProgram(program, shaders) {
    for (let i = 0; i < shaders.length; ++i) {
      gl.attachShader(program, shaders[i]) // линкуем шейдер
    }

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Ошибка связи шейдера");
    }
  }
  return {
    getShader,
    addShadersToProgram,
    setupFramebufferTexture
  }
}
