'use strict'
import DAT from 'dat.gui'
import Render from './render'
import Painters from './painter'
import {_ParticleBuffer, BoxRegion} from './particle'
import Bound from './bound'
import Looping from './looping'
import mac from './macGrid'
import simulation from './simulation'


var step_size = 1 / 60; //60fps

const canvas = document.getElementById("canvas");

const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
gl.webgl2 = (typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext)
if (!gl.webgl2) {
  const ext_tex_float = gl.getExtension("OES_texture_float")
} else {
  const ext_color_buffer_float = gl.getExtension("EXT_color_buffer_float")
}
var render = Render(gl);
const {macGrid} = mac(gl)
const {Simulation} = simulation(gl)
const { ParticlePainter, GridPainter } = Painters(gl)
var simulations

const ParticleBuffer = _ParticleBuffer(gl)
var particlePainter = ParticlePainter(null)
var gridPainter = GridPainter(null)
render.add(particlePainter)
render.add(gridPainter)
var particleparams = {
  color: '#FF0000',
}
var boxParams = {x: 0.33,y: 0.72, z:0.84};
var simulationControls = {
  start: function() {
    simulations.shouldUpdate = true
    drawloop.start()
  },
  stop: function() {
    simulations.shouldUpdate = false
  },
  restart: function() {
    var running = simulations.shouldUpdate
    initialize(simulationControls)
    simulations.shouldUpdate = running
    drawloop.start()
  },
  density: 10000,  // particles per cubic meter
  solverSteps: 100,
  viscosity: 5,
}
function initialize(settings) { 
  var CELL_SIZE = 2 / Math.cbrt(settings.density) // ~8 particles per cell
  var box = new BoxRegion(4 * settings.density, new Bound({
    minX: -boxParams.x, maxX:0.0,
    minY: -boxParams.y/2, maxY:boxParams.y/2,
    minZ: -boxParams.z/2, maxZ:boxParams.z/2,
     
  }))
  var particles = new ParticleBuffer()
  particles.addRegion(box)
  particles.create()
  particlePainter.setBuffer(particles)
  var grid = new macGrid(new Bound({
    minX: -0.8, maxX: 0.8,
    minY: -0.5, maxY: 0.5,
    minZ: -0.5, maxZ: 0.5
  }), CELL_SIZE)
  gridPainter.setBuffer(grid)
  simulations = Simulation(grid, particles, settings.solverSteps)
}
var drawloop = Looping(
  () => {
    return simulations.shouldUpdate
  },
  () => {
    if (simulations.shouldUpdate) {
      simulations.step(step_size, simulationControls)
    }
    drawUpdate()
  }  
)
function drawUpdate() { ///перерисовываем канвас 
  gl.enable(gl.DEPTH_TEST)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, canvas.width, canvas.height)
  render.draw(particleparams)
}
// когда render отрисован добавляем возможность двигать камерой
render.ready.then(() => {
  initialize(simulationControls)
  drawloop.start()
  ///вешаем событие при наведении, чтобы объект снова перерисовывался
  render.camera.controls.addEventListener('change', e => {
    drawloop.start()
  })
  window.addEventListener('resize', e => {
    drawloop.start()
  })
})
var debug = {debug: false}
var gui = new DAT.GUI();
gui.add(simulationControls, 'start')
gui.add(simulationControls, 'restart')
gui.add(debug, 'debug').onChange(function(x) {
  gridPainter.drawMIC  = x;
  gridPainter.drawTypes = x;
  drawloop.start();
})
var particleSettings = gui.addFolder('Частица');
particleSettings.addColor( particleparams, 'color' )
      .onChange( function() { drawloop.start() } );
particleSettings.open();

var boxSettings = gui.addFolder('Размеры области')
boxSettings.add(boxParams, 'x', .1, .8).onChange( function() { 
  initialize(simulationControls) 
  drawloop.start()
});
boxSettings.add(boxParams, 'y', .1, .8).onChange( function() { 
  initialize(simulationControls)
  drawloop.start()
});
boxSettings.add(boxParams, 'z', .1, .8).onChange( function() { 
  initialize(simulationControls)
  drawloop.start()
} );

var fluidSettings = gui.addFolder('Жидкость')
fluidSettings.add(simulationControls, 'density')
fluidSettings.add(simulationControls, 'viscosity', 0, 100)
fluidSettings.open()

