var Module = {};
Module['onRuntimeInitialized'] = function() {
  console.log('onRuntimeInitialized')
  postMessage({msg: 'wasm'});
}

importScripts('cv-wasm.js', 'region-worker.js');


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
