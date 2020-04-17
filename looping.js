'use strict'
import Stats from 'stats-js'
//контролер состояния симуляций 
export default function(shouldUpdate, update) {
  var frameUpdate
  var isRunning = false;
  function tick() {
    update()
    if (shouldUpdate()) {
      isRunning = true
      frameUpdate = requestAnimationFrame(tick)
    } else {
      isRunning = false
    }
        
  }
  function start() {
    if (!isRunning) {
      tick()
    }
  }

  function stop() {
    isRunning = false
  }
  
  return {
    tick: function() {
      if (!running) {
        frameUpdate = requestAnimationFrame(tick)
      }
    },
    start,
    stop,
  }
}