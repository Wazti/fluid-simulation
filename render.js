'use strict'

import { vec3 } from 'gl-matrix';

const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
function hexToRgbA(hex){
  var c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
      c= hex.substring(1).split('');
      if(c.length== 3){
          c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c= '0x'+c.join('');
      return [parseFloat((c>>16)&255)/255, parseFloat((c>>8)&255)/255, parseFloat(c&255)/255]
  }
}
function Camera(canvas, controls) {
  var camera = new THREE.PerspectiveCamera( 10, canvas.width / canvas.height, 0.1, 1000 );
  var controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);
  controls.rotateSpeed = 0.3;
  controls.zoomSpeed = 0.5;
  controls.panSpeed = 0.8;

  camera.controls = controls // ставим настройки камеры
  return camera
}
// https://threejs.org/docs/index.html#api/en/core/Object3D дока по камере
export default function Render(gl) {

  var canvas = gl.canvas
  var camera
  var renderReady
  var drawables = []

  function setup() {
    console.log(canvas)
    camera = Camera(canvas)
    camera.position.set(3,-1,8);
  }
  function resize() { //обновление размера канваса
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    camera.aspect = canvas.width / canvas.height;
    camera.updateProjectionMatrix();
    gl.viewport(0, 0 , canvas.width, canvas.height)
  }
  var cameraMat = new THREE.Matrix4();
  function draw(obj) { //отрисовка объектов в буфере
    camera.controls.update()

    camera.updateMatrixWorld();
    camera.matrixWorldInverse.getInverse(camera.matrixWorld);
    
    cameraMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    for (let i = 0; i < drawables.length; ++i) {
      drawables[i].draw({ //отрисовываем объекты
        camera,
        cameraMat: cameraMat,
        projMat: camera.projectionMatrix,
        viewMat: camera.matrixWorldInverse,
        color: obj ? hexToRgbA(obj.color) :  [0.0,0.0,1],
      })
    }
  }

  function add(painter) {
    drawables.push(painter)
  }

  window.addEventListener('load', e => {
    setup()
    resize()
    renderReady()
    draw()
  })

  window.addEventListener('resize', resize)

  return {
    draw,
    add,
    ready: new Promise((resolve, reject) => {
      renderReady = resolve
    }),
    get camera() { return camera }
  }
}