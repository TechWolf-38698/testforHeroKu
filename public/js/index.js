let width = 0;
let height = 0;

let vc = null;

let info = document.getElementById('info');
let container = document.getElementById('container');

let canvasOutput;
let ctxOutput

function loadImage() {

  let image = document.getElementById('image');

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  canvasOutput = document.getElementById("canvasOutput");
  ctxOutput = canvasOutput.getContext("2d");

  canvas.width = image.width;
  canvas.height = image.height;

  height = image.width;
  width = image.height;

  canvasOutput.width = image.width;
  canvasOutput.height = image.height;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);


  return;

  image.onload = () => {
    canvas.width = image.width;
    canvas.height = image.height;

    height = image.width;
    width = image.height;

    console.log('image: ', width, height)

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // canvasOutput.width = image.width;
    // canvasOutput.height = image.height;
  }
}



let contoursColor = [];
for (let i = 0; i < 10000; i++) {
  contoursColor.push([Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 255]);
}

let base;



function onClickProcess() {
  startProcessing()

  src = cv.imread(document.getElementById('image'));

  const result = process(src)

  cv.imshow("canvasOutput", result);

  result.delete()
}

function process(src) {

  cv.cvtColor(src, dstC1, cv.COLOR_RGBA2GRAY);

  cv.GaussianBlur(dstC1, dstC1, { width: 3, height: 3 }, 0, 0, cv.BORDER_DEFAULT);

  cv.adaptiveThreshold(dstC1, dstC1, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 75, 10);
  // cv.adaptiveThreshold(dstC1, dstC1, 200, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, Number(controls.adaptiveBlockSize), 2);

  cv.bitwise_not(dstC1, dstC1)


  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(dstC1, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE, { x: 0, y: 0 });
  dstC3.delete();
  dstC3 = cv.Mat.ones(height, width, cv.CV_8UC3);
  console.log(contours.size())
  cv.drawContours(dstC3, contours, -1, [255,255,255, 0], 1)

  // for (let i = 0; i < contours.size(); ++i) {
  //   let color = contoursColor[i];
  //   cv.drawContours(dstC3, contours, i, color, 1, cv.LINE_8, hierarchy);
  // }

  let poly = new cv.MatVector();

  let maxArea = 0;
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    if (cv.contourArea(cnt, false) < 3000) {
      continue
    }

    console.log(cv.contourArea(cnt, false));

    const peri = cv.arcLength(cnt, true)
    console.log(peri, 'peri')
    let tmp = new cv.Mat();
    cv.approxPolyDP(cnt, tmp, peri * 0.02, true)

    console.log(tmp)

    poly.push_back(tmp);

    cnt.delete();
    tmp.delete();
  }



  for (let i = 0; i < poly.size(); ++i) {
    let color = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255));
    cv.drawContours(dstC3, poly, i, color, 2, 8, hierarchy, 0);
  }

  contours.delete();
  hierarchy.delete();

  return dstC3;

  let img = src.clone()

  let lines = new cv.Mat();
  cv.HoughLinesP(dstC1, lines, 1, Math.PI / 180, 80, 400, 10);

  // let img = new cv.Mat(height, width, cv.CV_8UC1);
  // let img = cv.Mat.zeros(dstC1.rows, dstC1.cols, cv.CV_8UC3);

  // console.log(lines.rows)
  for (let i = 0; i < lines.rows; ++i) {
    let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
    let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);

    cv.line(img, startPoint, endPoint, contoursColor[i], 3, cv.LINE_AA);
  }



  return img;
}

function findCorners(lines) {
  let corners = [];
  for (let i = 0; i < lines.rows; i++) {
    console.log(lines)
    for (let j = i + 1; j < lines.rows; j++) {
      let pt = computeIntersect({
        start: new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]),
        end: new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3])
      }, {
        start: new cv.Point(lines.data32S[j * 4], lines.data32S[j * 4 + 1]),
        end: new cv.Point(lines.data32S[j * 4 + 2], lines.data32S[j * 4 + 3])
      })

      if (pt.x >= 0 && pt.y >= 0 && pt.x < img.cols && pt.y < img.rows) {
        corners.push(pt)
      }
    }
  }
}

function computeIntersect(a, b) {

  let x1 = a.start.x, y1 = a.start.y
  let x2 = a.end.x, y2 = a.end.y

  let x3 = b.start.x, y3 = b.start.y
  let x4 = b.end.x, y4 = b.end.y;

  let d = (x1 - x2) * (y3 - y4) - ((y1 - y2) * (x3 - x4))
  if (d) {
    let x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d;
    let y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d;

    return { x, y }
  }

  return { x: -1, y: -1 }


  // if (float d = ((float)(x1-x2) * (y3-y4)) - ((y1-y2) * (x3-x4)))
  // {
  //     cv::Point2f pt;
  //     pt.x = ((x1*y2 - y1*x2) * (x3-x4) - (x1-x2) * (x3*y4 - y3*x4)) / d;
  //     pt.y = ((x1*y2 - y1*x2) * (y3-y4) - (y1-y2) * (x3*y4 - y3*x4)) / d;
  //     return pt;
  // }
  // else
  //     return cv::Point2f(-1, -1);
}

function stopProcessing() {
  if (src != null && !src.isDeleted()) src.delete();
  if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
  if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
  if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}



var stats = null;


var filterName = document.getElementById('filterName');

var controls;


function opencvIsReady() {
  console.log('OpenCV.js is ready');
  if (!featuresReady) {
    console.log('Requred features are not ready.');
    return;
  }
  container.className = '';
  loadImage()
}