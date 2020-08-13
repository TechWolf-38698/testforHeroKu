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

let preview;

function onClickProcess() {

    src = new cv.Mat(height, width, cv.CV_8UC4);
    dstC1 = new cv.Mat(height, width, cv.CV_8UC1);
    dstC3 = new cv.Mat(height, width, cv.CV_8UC3);
    dstC4 = new cv.Mat(height, width, cv.CV_8UC4);



    src = cv.imread(document.getElementById('image'));
    preview = src.clone()

    const result = process(src)

    cv.imshow("canvasOutput", result);

    cv.imshow("canvas", preview);

    result.delete()
    preview.delete()
}



function process(src) {
    // dstC1 =  new cv.Mat(height, width, cv.CV_8UC1);
    let graySrc = new cv.Mat(height, width, cv.CV_8UC1);;

    cv.cvtColor(src, graySrc, cv.COLOR_RGBA2GRAY);

    const points = findBubbleRegion(graySrc)

    // cv.line(src, points[0], points[1], [255, 255, 0, 255], 3, cv.LINE_AA);
    // cv.line(src, points[1], points[2], [255, 255, 0, 255], 3, cv.LINE_AA);
    // cv.line(src, points[2], points[3], [255, 255, 0, 255], 3, cv.LINE_AA);
    // cv.line(src, points[3], points[0], [255, 255, 0, 255], 3, cv.LINE_AA);

    const result = perspectiveTransform(graySrc, points)

    const roi = cropRoi(result.warped, result.width, result.height)

    let readySrc = new cv.Mat(height, width, cv.CV_8UC1);;
    cv.threshold(roi, readySrc, 0, 255,
        cv.THRESH_BINARY_INV | cv.THRESH_OTSU)

    cv.bitwise_not(readySrc, readySrc)



    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(readySrc, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

   


    const bubbles = [];

    let mat = new cv.MatVector();

    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);

        const rect = cv.boundingRect(cnt);

        const ratio = rect.width / rect.height


        if (ratio >= 0.8 && ratio <= 1.2 && rect.width >= 10) {
            bubbles.push(cnt)
            // mat.push_back(cnt)
        } else {
            // console.log(ratio)
        }
    }

    // cv.drawContours(preview, mat, -1, [0, 0, 255, 255], 1)

    let filled = new cv.MatVector(); 

    for (let cnt of bubbles) {
        const mask = cv.Mat.zeros(readySrc.size(), cv.CV_8UC1);

        let mat = new cv.MatVector();
        mat.push_back(cnt)
        cv.drawContours(mask, mat, -1, [255,255,255,255], -1)

        let bubble = new cv.Mat();
        cv.bitwise_and(readySrc, readySrc, bubble, mask)

        const total = cv.countNonZero(bubble)
        // console.log(total, cv.contourArea(cnt, false))

        if (cv.contourArea(cnt, false) - total < 1000) {
            console.log('===  true')

            filled.push_back(cnt)
        }

		// if bubbled is None or total > bubbled[0]:
		// 	bubbled = (total, j)

        
        // preview = mask;
    }

    cv.drawContours(preview, filled, -1, [255, 0, 0, 255], 5)


    return readySrc


    return;
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


function findBubbleRegion(src) {
    let mat = src//new cv.Mat(height, width, cv.CV_8UC1);

    cv.GaussianBlur(src, mat, { width: 3, height: 3 }, 0, 0, cv.BORDER_DEFAULT);

    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 75, 10);

    cv.bitwise_not(mat, mat)

    // cv.Canny(dstC1, dstC1, 5, controls.cannyThreshold2, controls.cannyApertureSize, controls.cannyL2Gradient);

    // cv.dilate(dstC1, dstC1, new cv.Mat(), {x: -1, y: -1})


    // get the contour with four sides

    function sortContourFunc(a, b) {
        /* Sort largest value first */
        if (a.area < b.area) {
            return 1
        } else if (a.area > b.area) {
            return -1
        }
        return 0
    }

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(mat, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);



    const contourAreaArray = [];

    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt, false)
        // if (area < 1000) {
        //     continue
        // }

        contourAreaArray.push({
            area, index: i
        })
    }

    contourAreaArray.sort(sortContourFunc)

    let regionCnt;

    for (let cntArea of contourAreaArray) {
        const cnt = contours.get(cntArea.index);

        const peri = cv.arcLength(cnt, true)
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, peri * 0.02, true)

        console.log('approx rows: ', approx.rows)

        if (approx.rows === 4) {
            regionCnt = approx;
            break;
        } else {
            approx.delete()
        }
    }


    if (!regionCnt) {
        // we could not find a 4-side poly
        // try other ways to find it

        return;
    }


    contours.delete();
    hierarchy.delete();


    const data = regionCnt.data32S

    console.log(data)

    return [{
        x: data[0],
        y: data[1]
    }, {
        x: data[2],
        y: data[3]
    },
    {
        x: data[4],
        y: data[5]
    }, {
        x: data[6],
        y: data[7]
    }]
}

function perspectiveTransform(src, pts) {

    let { tl, tr, br, bl } = sortCorners(pts)

    console.log({ tl, tr, br, bl })

    // let [tl, tr, br, bl] = rect

    // compute the width of the new image, which will be the
    // maximum distance between bottom-right and bottom-left
    // x-coordiates or the top-right and top-left x-coordinates
    let widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2))
    let widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2))
    let maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB))
    //
    // compute the height of the new image, which will be the
    // maximum distance between the top-right and bottom-right
    // y-coordinates or the top-left and bottom-left y-coordinates
    let heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2))
    let heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2))
    let maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB))

    console.log(maxWidth, maxHeight)


    // now that we have the dimensions of the new image, construct
    // the set of destination points to obtain a "birds eye view",
    // (i.e. top-down view) of the image, again specifying points
    // in the top-left, top-right, bottom-right, and bottom-left
    // order
    let dstRect = [
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ]


    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1])
    let M = cv.getPerspectiveTransform(srcTri, dstTri)
    let dsize = new cv.Size(src.cols, src.rows)
    let warped = new cv.Mat()
    cv.warpPerspective(src, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())

    srcTri.delete()
    dstTri.delete()
    M.delete()

    return { warped: warped, width: maxWidth, height: maxHeight }

}

function cropRoi(src, width, height, padding = 15) {

    let warpSize = src.size()

    console.log(warpSize, width, height)

    let rect = new cv.Rect(
        padding, padding,
        Math.min(warpSize.width, width) - padding * 2,
        Math.min(warpSize.height, height) - padding * 2
    )

    let dst = cv.Mat.zeros(rect.width, rect.height, cv.CV_8UC3)
    dst = src.roi(rect)
    return dst;
}

function sortCorners(pts) {

    // the top-left point will have the smallest sum, and
    // the bottom-right point will have the largest sum
    let max = 0
    let min = Infinity
    let diffMax = -Infinity
    let diffMin = Infinity

    const corners = {};

    for (let pt of pts) {
        let sum = pt.x + pt.y
        let diff = pt.x - pt.y

        if (sum > max) {
            max = sum;
            corners.br = pt;
        }

        if (sum < min) {
            min = sum
            corners.tl = pt;
        }

        if (diff > diffMax) {
            diffMax = diff
            corners.tr = pt
        }
        if (diff < diffMin) {
            diffMin = diff
            corners.bl = pt
        }
    }

    return corners
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