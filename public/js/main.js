
var wasmWorker = new Worker('js/worker.js');


let video = document.querySelector("#video");

let objType = 'region';


// check for getUserMedia support
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

if (navigator.getUserMedia) {
    // get webcam feed if available
    navigator.getUserMedia({ video: true }, handleVideo, () => console.log('error with webcam'));
    // setTimeout(detect, 8000)
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('dom loaded')
}, false);

function handleVideo(stream) {
    video.srcObject = stream;
}

let canvases = {};
canvases.running = false;
canvases.ready = false;
canvases.wasm = {};
canvases.wasm.fps = 0;
canvases.wasm.lastTime = +new Date;
canvases.wasm.fpsArr = [];

canvases.wasm.color = 'rgba(255, 0, 0, 1)';
canvases.width = 320;
canvases.height = 240;
canvases.scale = 2;

canvases.wasm.canvas = document.getElementById('canvas');
canvases.wasm.context = canvases.wasm.canvas.getContext('2d');
canvases.wasm.canvas.width = canvases.width;
canvases.wasm.canvas.height = canvases.height;

canvases.dummy = {};
canvases.dummy.canvas = document.getElementById('dummy');
canvases.dummy.context = canvases.dummy.canvas.getContext('2d');
canvases.dummy.canvas.width = canvases.width;
canvases.dummy.canvas.height = canvases.height;

function opencvIsReady() {
    console.log('OpenCV.js is ready');
    if (!featuresReady) {
      console.log('Requred features are not ready.');
      return;
    }
    info.innerHTML = '';
    initUI();
    startCamera();
  }
  

function detect(type) {
    if (!canvases.running) {
        canvases.running = true;
        startWorker(canvases.wasm.context.getImageData(0, 0, canvases.wasm.canvas.width, canvases.wasm.canvas.height), objType);
    }
}

function startWorker(imageData, command, type) {

    // canvases.dummy.context.drawImage(imageData, 0, 0, imageData.width, imageData.height, 0, 0, Math.round(imageData.width/ canvases.scale), Math.round(imageData.height/canvases.scale));
    
    let message = {
        cmd: command,
        img: canvases.dummy.context.getImageData(0, 0, Math.round(imageData.width/ canvases.scale), Math.round(imageData.height/canvases.scale))
    };

    wasmWorker.postMessage(message);
}

function selectObj(type) {
    if (type == 'face') {
        objType = 'faceDetect';
        document.getElementById('radio-face').checked = true;
        document.getElementById('radio-eyes').checked = false;
    }
    else {
        objType = 'eyesDetect';
        document.getElementById('radio-eyes').checked = true;
        document.getElementById('radio-face').checked = false;
    }
    return;
}

function updateCanvas(e, targetCanvas, plot) {
    targetCanvas.context.drawImage(video, 0, 0, targetCanvas.canvas.width, targetCanvas.canvas.height);
    targetCanvas.context.strokeStyle = targetCanvas.color;
    targetCanvas.context.lineWidth = 2;
    let fps = 1000 / (targetCanvas.startTime - targetCanvas.lastTime)
    if (fps) {
        targetCanvas.fpsArr.push(fps);
    }
    // if (plot.displayPoints.length > 10) {
    //     plot.displayPoints.shift();
    // }
    // if (canvases.js.fpsArr.length === 1 || canvases.asm.fpsArr.length === 2  || canvases.wasm.fpsArr.length === 4 ) {
    //     targetCanvas.context.fps = Math.round((targetCanvas.fpsArr.reduce((a, b) => a + b) / targetCanvas.fpsArr.length) * 100) / 100;
    //     if ( targetCanvas.context.fps > myChart.controller.options.scales.yAxes[0].ticks.max) {
    //         myChart.controller.options.scales.yAxes[0].ticks.max =  targetCanvas.context.fps;
    //     }
    //     // plot.displayPoints.push(targetCanvas.context.fps)
    //     targetCanvas.fpsArr = [];
    // }
    // myChart.update();
    targetCanvas.context.fillStyle = 'rgba(255,255,255,.5)';
    targetCanvas.context.fillRect(0, 0, 90, 30)
    targetCanvas.context.font = "normal 14pt Arial";
    targetCanvas.context.fillStyle = targetCanvas.color;
    targetCanvas.context.fillText(targetCanvas.context.fps + " fps", 5, 20);
    targetCanvas.lastTime = targetCanvas.startTime;
    
    if (!e.data.features) return;
    for (let i = 0; i < e.data.features.length; i++) {
        let rect = e.data.features[i];
        targetCanvas.context.strokeRect(rect.x * canvases.scale, rect.y * canvases.scale, rect.width * canvases.scale, rect.height * canvases.scale);
    }
}

wasmWorker.onmessage = function (e) {
    console.log('main on message', e.data.msg)
    if (e.data.msg == 'wasm') {
        detect();
        if (canvases.ready) {
            detect();
        }
        else {
            canvases.ready = true
        }
    }
    else {
        updateCanvas(e, canvases.wasm);
        requestAnimationFrame((wasmTime) => {
            canvases.wasm.startTime = wasmTime;
            startWorker(canvases.wasm.context.getImageData(0, 0, canvases.wasm.canvas.width, canvases.wasm.canvas.height), objType, 'wasm')
        })
    }
}


window.onerror = function (event) {
    console.log(event)
};
