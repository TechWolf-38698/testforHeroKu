// var Module = {};
// Module['onRuntimeInitialized'] = function() {
//   console.log('onRuntimeInitialized')
//   postMessage({msg: 'wasm'});
// }

importScripts('newbuild/opencv.js', 'region-worker.js');

function waitForOpencv(callbackFn, waitTimeMs = 30000, stepTimeMs = 100) {
  if (cv && cv.Mat) callbackFn(true)

  let timeSpentMs = 0
  const interval = setInterval(() => {
    const limitReached = timeSpentMs > waitTimeMs
    if (cv.Mat || limitReached) {
      clearInterval(interval)
      return callbackFn(!limitReached)
    } else {
      timeSpentMs += stepTimeMs
    }
  }, stepTimeMs)
}

waitForOpencv(function (success) {
  if (success) postMessage({ msg: 'opencv_loaded' })
  else throw new Error('Error on loading OpenCV')
})

// onmessage = function (e) {
//   console.log('on message')
// 	switch (e.data.cmd) {
// 		case 'region':
//       console.log('region decting');
// 			findBubbleRegion(e.data.img);
// 			break;
// 		case 'eyesDetect': {			
			
// 			break;
// 		}
// 	}
// }

// onerror = function (e) {
// 	console.log(e);
// }
