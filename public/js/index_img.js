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
    // let graySrc = new cv.Mat();

    // cv.dilate(src, src, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 1)));

    // return src;

    let graySrc = new cv.Mat();

    cv.cvtColor(src, graySrc, cv.COLOR_RGBA2GRAY);

    // let downsample = new cv.Mat();
    // cv.pyrDown(graySrc, downsample, new cv.Size(graySrc.cols/4, graySrc.rows/4));

    // console.log(downsample);

    // return src;



    cv.GaussianBlur(graySrc, graySrc, {
        width: 3,
        height: 3
    }, 0, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(graySrc, graySrc, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 35, 3);

    cv.bitwise_not(graySrc, graySrc)


    // cv.cvtColor(src, graySrc, cv.COLOR_RGBA2GRAY);

    const points = findBubbleRegion(graySrc)

    const result = perspectiveTransform(graySrc, points)
    const roi = cropRoi(result.warped, result.width, result.height)

    let readySrc = new cv.Mat();

    const destWidth = 800;
    cv.resize(roi, readySrc, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));


    const srcTransformResult = perspectiveTransform(src, points)
    const srcRoi = cropRoi(srcTransformResult.warped, srcTransformResult.width, srcTransformResult.height)
    cv.resize(srcRoi, srcRoi, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));
    preview = srcRoi


    cv.threshold(readySrc, readySrc, 100, 255, cv.THRESH_BINARY | cv.THRESH_BINARY_INV)
    // cv.adaptiveThreshold(readySrc, readySrc, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 5, 3);
    cv.bitwise_not(readySrc, readySrc)


    const lines = findSeparatorLines(readySrc);


    const structure = [
        [
            ['1010', '0000', '0001', '1111', '0000'],
            ['0010', '0100', '0010', '0001', '1000']
        ],
        [
            ['1010', '00010', '000001', '1111', '0000'],
            ['0010', '0100', '0010', '0001', '1000']
        ],
        [
            ['1010', '0000', '0001', '1111', '0000'],
            ['0010', '0100', '0010', '0001', '1000'],
            ['0010', '0100', '0010', '0001', '1000']
        ],
        [
            ['0010', '0100', '0010', '0001', '1000']
        ]
    ]

    for (let i= 0; i < structure.length; i++) {
        detectBubbles(readySrc, lines[i][0].y, structure[i]);
    }



    return readySrc;

    decideFilledBubbles(bubbles, readySrc);

    return readySrc;
    // let img = src.clone()

    // let lines = new cv.Mat();
    // cv.HoughLinesP(dstC1, lines, 1, Math.PI / 180, 80, 400, 10);

    // // let img = new cv.Mat(height, width, cv.CV_8UC1);
    // // let img = cv.Mat.zeros(dstC1.rows, dstC1.cols, cv.CV_8UC3);

    // // console.log(lines.rows)
    // for (let i = 0; i < lines.rows; ++i) {
    //     let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
    //     let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);

    //     cv.line(img, startPoint, endPoint, contoursColor[i], 3, cv.LINE_AA);
    // }



    // return img;
}

function detectBubbles(src, baseY, structure) {

    const unit = getBubbleUnit();

    let lastGroupMaxX = unit.group_left_margin;
    for (let i = 0; i < structure.length; i++) {
        let group = structure[i];

        let marginLeft = lastGroupMaxX + (i === 0 ? 0 : unit.group_gap);

        for (let j = 0; j < group.length; j++) {
            let row = group[j];

            let y = baseY + unit.group_top_margin + j * unit.height + j * unit.v_gap

            for (let k = 0; k < row.length; k++) {
                let x = marginLeft + k * unit.width + k * unit.h_gap

                const filled = decideBubbleRegionFilled({
                    points: [new cv.Point(x, y),
                        new cv.Point(x + unit.width, y),
                        new cv.Point(x + unit.width, y + unit.height)
                    ]
                }, src);

                lastGroupMaxX = Math.max(x + unit.width, lastGroupMaxX);

                const color = filled ? [0, 255, 0, 255] : [255, 0, 255, 255]

                cv.rectangle(preview, new cv.Point(x, y), new cv.Point(x + unit.width, y + unit.height), color, cv.LINE_4);

            }
        }
    }


}

function cutRegions(lines, src) {
    const answerMats = [];
    let infoMat;

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];

        const pre = lines[i - 1] || [{
            x: 0,
            y: 0
        }];

        const mat = crop(src, 0, pre[0].y, src.cols, l[0].y - pre[0].y);

        if (i === 0) {
            infoMat = mat;
        } else {
            answerMats.push(mat);
        }
    }

    return {
        infoRegion: infoMat,
        answerRegions: answerMats
    }
}

function decideFilledBubbles(bubbles, src) {
    let filledMat = new cv.MatVector();
    let bubblesMat = new cv.MatVector();

    const unit = getBubbleUnit(bubbles);


    const rows = groupBubblesByRow(bubbles);

    const groups = [];

    for (let row of rows) {
        let cols = sortBubblesLeft2Right(row);

        let results = [];
        let filled = '';

        for (let i = 0; i < cols.length; i++) {
            const bubble = cols[i];
            const next = cols[i + 1] || null;

            let f = decideBubbleFilled(bubble, src, bubbles);

            bubblesMat.push_back(bubble);
            if (f) {
                filledMat.push_back(bubble);
            }

            filled += f ? '1' : '0';


            if (!next || next.data32S[0] - bubble.data32S[0] > unit.width * 2) {
                // 最后一个
                results.push(filled);

                filled = '';
            }
        }

        console.log('results: ', results);
    }


    cv.drawContours(preview, bubblesMat, -1, [0, 255, 0, 255], 1)
    cv.drawContours(preview, filledMat, -1, [255, 0, 0, 255], 1)
}


function decideBubbleRegionFilled(region, src) {
    const mask = cv.Mat.zeros(src.size(), cv.CV_8UC1);

    cv.rectangle(mask, region.points[0], region.points[2], [255, 255, 255, 255], cv.FILLED);

    const conjuction = new cv.Mat(src.size(), cv.CV_8UC1);

    cv.bitwise_and(src, mask, conjuction)

    const noneZero = cv.countNonZero(conjuction)

    let base = getBubbleUnit().area;

    return noneZero / base >= 0.8
}



function getBubbleUnit() {

    return {
        width: 32,
        height: 18,
        area: 576,

        group_top_margin: 40,
        group_left_margin: 62,
        group_bottom_margin: 60,

        group_gap: 84,

        h_gap: 14,
        v_gap: 18,
    }
}

function findSeparatorLines2(src) {
    const mat = src.clone();

    const size = mat.cols / 3;

    const structure = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(size, 1));

    cv.erode(mat, mat, structure, new cv.Point(-1, -1));
    cv.dilate(mat, mat, structure, new cv.Point(-1, -1));

    return findSeparatorLines(mat);
}

function findSeparatorLines(src) {

    let canny = new cv.Mat();

    cv.Canny(src, canny, 50, 150, 3); // 启动的话，line 会分段

    let lines = new cv.Mat();

    // cv.GaussianBlur(src, src, { width: 5, height: 5 }, 0, 0, cv.BORDER_DEFAULT);


    /**
     * TODO: line 长度需大雨 整个宽度的 1/2
     */
    cv.HoughLinesP(src, lines, 1, Math.PI / 2, 80, src.cols * 1 / 3, 3)

    if (lines.rows === 0) {
        // TODO: 使用其他途径再次查找 line
    }

    let arr = [];

    for (let i = 0; i < lines.rows; ++i) {

        const sx = lines.data32S[i * 4];
        const sy = lines.data32S[i * 4 + 1];
        const ex = lines.data32S[i * 4 + 2];
        const ey = lines.data32S[i * 4 + 3];

        if (ex - sx <= 30) { // 忽略竖线
            continue;
        }

        const existedIndex = arr.findIndex(l => {
            return Math.abs(l[0].y - sy) <= 10;
        });


        if (existedIndex >= 0) { // merge lines
            const existed = arr[existedIndex];
            arr[existedIndex] = [new cv.Point(Math.min(sx, existed[0].x), existed[0].y),
                new cv.Point(Math.max(ex, existed[1].x), existed[0].y)
            ]

        } else {
            arr.push([
                new cv.Point(sx, sy),
                new cv.Point(ex, ey)
            ]);
        }
    }

    console.log('lines count:', lines.rows, arr.length)

    arr = arr.filter(item => item[1].x - item[0].x >= src.cols * 2 / 3)

    arr.sort((a, b) => {
        if (a[0].y > b[0].y) return 1;
        return -1;
    })

    for (let i = 0; i < arr.length; i++) {
        const line = arr[i];
        cv.line(preview, line[0], line[1], contoursColor[i], 3, cv.LINE_AA);
    }

    return arr;
}


function findBubbleRegion(src) {
    let mat = src //new cv.Mat(height, width, cv.CV_8UC1);

    // cv.GaussianBlur(src, mat, { width: 1, height: 1 }, 0, 0, cv.BORDER_DEFAULT);

    // cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 35, 3);

    // cv.bitwise_not(mat, mat)

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
            area,
            index: i
        })
    }

    contourAreaArray.sort(sortContourFunc)

    let regionCnt;

    for (let cntArea of contourAreaArray) {
        const cnt = contours.get(cntArea.index);

        const peri = cv.arcLength(cnt, true)
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, peri * 0.02, true)

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
        }
    ]
}

function perspectiveTransform(src, pts) {

    let {
        tl,
        tr,
        br,
        bl
    } = sortCorners(pts)

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

    return {
        warped: warped,
        width: maxWidth,
        height: maxHeight
    }

}

function cropRoi(src, width, height, padding = 15) {

    let warpSize = src.size()

    return crop(src, 0, 0, width, height, padding);

    let rect = new cv.Rect(
        padding, padding,
        Math.min(warpSize.width, width) - padding * 2,
        Math.min(warpSize.height, height) - padding * 2
    )

    let dst = cv.Mat.zeros(rect.width, rect.height, cv.CV_8UC3)
    dst = src.roi(rect)
    return dst;
}

function crop(src, x, y, width, height, padding = 5) {

    let warpSize = src.size()

    let rect = new cv.Rect(
        x + padding, y + padding,
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

    let x1 = a.start.x,
        y1 = a.start.y
    let x2 = a.end.x,
        y2 = a.end.y

    let x3 = b.start.x,
        y3 = b.start.y
    let x4 = b.end.x,
        y4 = b.end.y;

    let d = (x1 - x2) * (y3 - y4) - ((y1 - y2) * (x3 - x4))
    if (d) {
        let x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d;
        let y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d;

        return {
            x,
            y
        }
    }

    return {
        x: -1,
        y: -1
    }


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