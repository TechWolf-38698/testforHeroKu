let width = 0;
let height = 0;

let vc = null;

let container = document.getElementById('container');
let canvasOutput = document.getElementById('canvas');
let canvasOutputCtx = canvasOutput.getContext('2d');

let canvasInput = null;
let canvasInputCtx = null;

let canvasBuffer = null;
let canvasBufferCtx = null;

let video;

let stream = null;
let videoCapture = null;

let src = null;
let dstC1 = null;
let preProcessedSrc = null;
let roiSrc = null;
let bubbleSrc = null;

let preview;

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



function startCamera() {
    video = document.getElementById("video");

    const videoCanvas = document.getElementById("video-canvas");

    navigator.mediaDevices.getUserMedia({
        video: {
            width: {
                exact: 640
            },
            height: {
                exact: 480
            }
        },
        audio: false
    })
        .then(function (s) {
            stream = s;
            video.srcObject = s;
            video.play();
        })
        .catch(function (err) {
            console.log("An error occured! " + err);
        });

    video.addEventListener("canplay", function (ev) {
        console.log('canplay')
        // if (!streaming) {
        height = video.videoHeight;
        width = video.videoWidth;
        video.setAttribute("width", width);
        video.setAttribute("height", height);
        canvasOutput.width = video.videoWidth;
        canvasOutput.height = video.videoHeight;

        //     streaming = true;
        // videoCapture = new cv.VideoCapture(video);
        // }
        startVideoProcessing();
    }, false);

}

function startVideoProcessing() {
    stopVideoProcessing();

    canvasInput = document.createElement('canvas');
    canvasInput.width = width;
    canvasInput.height = height;
    canvasInputCtx = canvasInput.getContext('2d');

    canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = width;
    canvasBuffer.height = height;
    canvasBufferCtx = canvasBuffer.getContext('2d');

    src = new cv.Mat(height, width, cv.CV_8UC4);
    preProcessedSrc = new cv.Mat(height, width, cv.CV_8UC1);

    requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
    src && !src.isDeleted() && src.delete();
    preProcessedSrc && !preProcessedSrc.isDeleted() && preProcessedSrc.delete();
    preview && !preview.isDeleted() && preview.delete();
}

function processVideo() {

    canvasInputCtx.drawImage(video, 0, 0, width, height);
    let imageData = canvasInputCtx.getImageData(0, 0, width, height);
    src.data.set(imageData.data);

    preview = src.clone()

    const result = process(src);

    if (result) {
        cv.imshow("canvas", result);

        if (result !== src) {
            result && !result.isDeleted() && result.delete();
        }
    } else {
        cv.imshow("canvas", preProcessedSrc)
    }

    if (preview) {
        cv.imshow("preview", preview)
        preview && !preview.isDeleted() && preview.delete();
    }

    requestAnimationFrame(processVideo);
}

function onClickProcess() {
    opencvIsReady()
    // startCamera();
}


let breakCount = 0;
let detectedForm = null;
let detectingBubbles = false;


function process(src) {
    let st = Date.now();
    cv.cvtColor(src, preProcessedSrc, cv.COLOR_RGBA2GRAY);

    const points = findBubbleRegion3(preProcessedSrc);


    if (!points) {
        if (detectedForm) {
            breakCount++;

            if (breakCount > 13) {
                detectedForm = null;
                console.log('!!! no roi break');
            } else {
                console.log('no roi continue')
                drawBubbleRegion(detectedForm.points);
            }
        } else {
            breakCount = 0;
        }

        return
    }



    // if (detectedForm || detectingBubbles) {
    //     return;
    // }

    breakCount = 0;
    detectedForm = {
        id: getFormId(),
        points
    };

    drawBubbleRegion(points);


    // if (detectingBubbles) {
    //     return;
    // }

    // return ;


    /**
     * 检测到 ROI
     */
    const ready = extractRoi(preProcessedSrc, points, preProcessedSrc);

    const lines = findSeparatorLines(ready);

    if (!lines || !lines.length) {
        return
    }

    if (lines[0][0].y < 300) {
        console.log('可能倒置')
        return
    }


    if (lines.length < structure.length) {
        console.log('答题卡结构不匹配')
        return;
    }


    const height = lines.length * 230 + lines.length * 2 + 455

    const destWidth = 800;
    cv.resize(ready, ready, new cv.Size(destWidth, height));
    cv.resize(preview, preview, new cv.Size(destWidth, height));


    // return ready;

    // cv.erode(ready, ready, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)));
    // cv.dilate(ready, ready, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));

    // cv.threshold(ready, ready, 120, 255, cv.THRESH_BINARY)
    // cv.blur(ready, ready, new cv.Size(5, 5))
// 
    // cv.adaptiveThreshold(ready, ready, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 3);

    // cv.GaussianBlur(ready, ready, {
    //     width:3,
    //     height: 3
    // }, 0, 0, cv.BORDER_DEFAULT);
    
    // cv.adaptiveThreshold(ready, ready, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 15, 3);


    // cv.bitwise_not(ready, ready)
    // return ready;

    // preview = ready.clone();

    const result = processBubbleRegion(ready);

    detectingBubbles = false;
    ready && !ready.isDeleted() && ready.delete();

    console.log('TIME: ', Date.now() - st)

    return result
}

// var worker = new Worker('js/worker.js');

function processInWorker(mat) {
    worker.postMessage({
        mat,
        cv: cv.threshold
    })
}

/**
 * form 码，或者 学号，或者随机生成一个 id
 */
function getFormId() {
    return Date.now() + '' + Math.floor(Math.random() * 1000) + '' + Math.floor(Math.random() * 100)
}

function drawBubbleRegion(points) {
    if (!preview) return;

    const color = [0, 255, 0, 255];

    cv.line(preview, points.tl, points.tr, color, 3, cv.LINE_AA);
    cv.line(preview, points.tr, points.br, color, 3, cv.LINE_AA);
    cv.line(preview, points.br, points.bl, color, 3, cv.LINE_AA);
    cv.line(preview, points.bl, points.tl, color, 3, cv.LINE_AA);

}

function extractRoi(mat, points, originSrc) {

    const result = perspectiveTransform(mat, points)

    // return result.warped;

    const roi = crop(result.warped, 0, 0, result.width, result.height, 2);

    let readySrc = new cv.Mat();

    const destWidth = 800;
    cv.resize(roi, readySrc, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));

    // 截取原图
    if (originSrc) {
        const srcTransformResult = perspectiveTransform(originSrc, points)
        const srcRoi = crop(srcTransformResult.warped, 0, 0, srcTransformResult.width, srcTransformResult.height, 2);
        cv.resize(srcRoi, preview, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));

        srcRoi.delete();
        srcTransformResult.warped.delete();

    }

    result.warped.delete();
    roi.delete()

    return readySrc
}


function processBubbleRegion(readySrc) {
    const lines = findSeparatorLines(readySrc); // about 30 ms


    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        preview && cv.line(preview, line[0], line[1], [0, 0, 255, 255], 3, cv.LINE_AA);
    }


    if (!lines || !lines.length) {
        return
    }

    if (lines[0][0].y < 300) {
        console.log('可能倒置')
        return
    }

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

    if (lines.length != structure.length) {
        console.log('答题卡结构不匹配')
        return;
    }


    // cv.erode(ready, ready, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));
    // cv.dilate(ready, ready, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));

    // cv.threshold(ready, ready, 150, 255, cv.THRESH_BINARY)
    // cv.blur(ready, ready, new cv.Size(5, 5))

    cv.threshold(readySrc, readySrc, 130, 255, cv.THRESH_BINARY)

    // cv.adaptiveThreshold(ready, ready, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 3);

    // cv.GaussianBlur(readySrc, readySrc, {
    //     width:3,
    //     height: 3
    // }, 0, 0, cv.BORDER_DEFAULT);
    
    // cv.adaptiveThreshold(ready, ready, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 3);

   

        // cv.threshold(ready, ready, 100, 255, cv.THRESH_BINARY | cv.THRESH_BINARY_INV)
    // cv.adaptiveThreshold(readySrc, readySrc, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 5, 3);
    cv.bitwise_not(readySrc, readySrc)

    // preview = readySrc.clone() 


    for (let i = 0; i < structure.length; i++) {
        let height;
        if (!lines[i + 1]) {
            height = readySrc.rows - lines[i][0].y;
        } else {
            height = lines[i + 1][0].y - lines[i][0].y;
        }

        const region = crop(readySrc, 0, lines[i][0].y, readySrc.cols, height , 0);
        cv.resize(region, region, new cv.Size(readySrc.cols, 230));

        detectBubbles(region, 0, structure[i], lines[i][0].y);

        region.delete()
    }

    console.log("%c 识别到了", "color:red;font-weight:bold;font-size:20px")
}


function detectBubbles(src, baseY, structure, previewY) {

    const unit = getBubbleUnit();

    let error = false;

    let lastGroupMaxX = unit.group_left_margin;

    columns:
    for (let i = 0; i < structure.length; i++) {
        let group = structure[i];

        let marginLeft = lastGroupMaxX + (i === 0 ? 0 : unit.group_gap);

        question:
        for (let j = 0; j < group.length; j++) {
            let row = group[j];

            let y = baseY + unit.group_top_margin + j * unit.height + j * unit.v_gap

            options:
            for (let k = 0; k < row.length; k++) {
                let x = marginLeft + k * unit.width + k * unit.h_gap

                if (x <= 0 || y <= 0 || x + unit.width >= 800 || y + unit.height >= src.rows) {
                    error = true
                    break columns;
                }

                const filled = decideBubbleRegionFilled({
                    rect: {
                        x: x,
                        y: y,
                        width: unit.width,
                        height: unit.height
                    }
                }, src);

                lastGroupMaxX = Math.max(x + unit.width, lastGroupMaxX);

                // const color = filled ? [0, 255, 0, 255] : [255, 0, 255, 255]
                const color = filled ? [255, 255, 255, 255] : [0, 0, 0, 255]

                if (filled) {
                    cv.circle(preview, new cv.Point(x + 10, 4 + y + previewY), 10, color, 2, cv.LINE_4);

                } else {
                    cv.rectangle(preview, new cv.Point(x, y + previewY), new cv.Point(x + unit.width, y + previewY + unit.height), color, 2, cv.LINE_4);

                }
                
            }
        }
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

    // const rect = {
    //     x: region.rect.x + 1,
    //     y: region.rect.y + 1,
    //     width: region.rect.width - 2,
    //     height: region.rect.height - 2
    // }

    const rect = region.rect;

    let b = src.roi(rect)
    const noneZero = cv.countNonZero(b)

    b.delete()

    let base = getBubbleUnit().area;

    return noneZero / base >= 0.8
}



function getBubbleUnit() {

    return {
        width: 35,
        height: 20,
        area: 576,

        group_top_margin: 35,
        group_left_margin: 70,
        group_bottom_margin: 60,

        group_gap: 75,

        h_gap: 8,
        v_gap: 11,
    }
}

function findSeparatorLines(src) {

    let mat = new cv.Mat(src.size(), cv.CV_8UC1);


    cv.erode(src, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));
    cv.dilate(mat, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));

    cv.GaussianBlur(mat, mat, {
        width:3,
        height: 3
    }, 0, 0, cv.BORDER_DEFAULT);
    
    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 3);

    cv.bitwise_not(mat, mat)


    // let canny = new cv.Mat();
    // cv.Canny(src, canny, 50, 150, 3); // 启动的话，line 会分段

    let lines = new cv.Mat();

    /**
     * TODO: line 长度需大于 整个宽度的 1/2
     */
    cv.HoughLinesP(mat, lines, 1, Math.PI / 2, 80, src.cols * 1 / 3, 3)

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

    arr = arr.filter(item => item[0].y >= 10 && item[1].x - item[0].x >= src.cols * 2 / 3)

    arr.sort((a, b) => {
        if (a[0].y > b[0].y) return 1;
        return -1;
    })


    // console.log('lines count:', lines.rows, arr.length)

    lines.delete();
    mat.delete();

    return arr;
}


function findBubbleRegion3(src) {
    let mat = new cv.Mat(src.size(), cv.CV_8UC1);

    // mat = src.clone();
    // cv.dilate(src, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5) ));
    cv.erode(src, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));
    cv.dilate(mat, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5) ));

    cv.GaussianBlur(mat, mat, {
        width: 3,
        height: 3
    }, 0, 0, cv.BORDER_DEFAULT);

    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 3);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(mat, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    const possibleTargets = [];

    let p = new cv.MatVector();

    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);

        let region = checkIsTargetRegion(cnt);
        if (region) {
            possibleTargets.push({
                area: region.area,
                index: i,
                points: region.points
            })

            p.push_back(cnt);
        }

        cnt.delete()
    }

    cv.drawContours(preview, p, -1, [0, 0, 255, 255], 1)

    p.delete()

    possibleTargets.sort((a, b) => {
        /* Sort largest value first */
        if (a.area < b.area) {
            return 1
        } else if (a.area > b.area) {
            return -1
        }
        return 0
    })


    // cv.drawContours(preview, contours, -1, [255, 0, 0, 255], 1)


    let targetPoints

    for (let target of possibleTargets) {

        let index = +target.index;

        // hierarchy: [Next, Previous, First_Child, Parent]

        const [next, pre, firstChild, parent] = hierarchy.intPtr(0, index);

        // 只允许有一个答题卡框
        // 如果兄弟轮廓 也可能是目标区域，则认为其不是 目标

        if (next != -1) {
            const cnt = contours.get(next);
            if (checkIsTargetRegion(cnt)) {
                console.log('has next')
                cnt.delete();
                continue
            }

            cnt.delete();
        }

        if (pre != -1) {
            const cnt = contours.get(pre);
            if (checkIsTargetRegion(cnt)) {
                console.log('has pre')
                cnt.delete();
                continue
            }

            cnt.delete();
        }

        // cv.drawContours(preview, p, -1, [0, 0, 255, 255], 1)
        // p.delete()

       
        let k = index;
        let c = 0;

        while (hierarchy.intPtr(0, k)[2] !== -1) {
            k = hierarchy.intPtr(0, k)[2];
            c++;
        }

        // if (hierarchy.intPtr(0, k)[2] != -1) c ++;

        if (c >= 2) {
            targetPoints = target.points
            break;
        }

    }

    contours.delete();
    hierarchy.delete();
    mat.delete()

    return targetPoints
}

function checkIsTargetRegion(cnt) {
    const area = cv.contourArea(cnt, false)

    if (area < width * height / 9) {
        // console.log('too small area')
        return false
    }

    const peri = cv.arcLength(cnt, true)
    let approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, peri * 0.02, true)

    const data = approx.data32S
    const sides = approx.rows;

    approx.delete()

    if (sides !== 4) {
        return false;
    }

    let points = [{
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

    points = sortCorners(points)

    if (checkIsRectangle(points)) {
        return {
            points,
            area
        };
    }
}

/**
 * 根据面积判断是否可能是目标区域
 */
function checkContourByArea(cnt) {
  
}

function checkApproxIsRectangle(approx) {
    const data = approx.data32S

    let points = [{
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

    points = sortCorners(points)

    if (checkIsRectangle(points)) {
        return points
    }
}

function checkIsRectangle(points) {
    let {
        tl,
        tr,
        br,
        bl
    } = points;

    if (
        // 宽高不能过大
        (tr.x - tl.x >= width - 50) ||
        br.x - bl.x >= width - 50 ||
        br.y - tr.y >= height - 50 ||
        bl.y - tl.y >= height - 50 ||

        // 宽高不能过小
        tr.x - tl.x < width / 4,
        br.x - bl.x < width / 4,
        br.y - tr.y < height / 4,
        bl.y - tl.y < height / 4,

        // 不能太过倾斜
        Math.abs(br.x - tr.x) >= width / 4 ||
        Math.abs(tr.y - tl.y) >= height / 4 ||
        Math.abs(bl.y - br.y) >= height / 8 ||


        // 两宽不能差距太大
        // 两宽不能差距太大
        (tr.x - tl.x) / (br.x - bl.x) > 3 ||
        (tr.x - tl.x) / (br.x - bl.x) < 0.3 ||
        (br.y - tr.y) / (bl.y - tl.y) > 3 ||
        (br.y - tr.y) / (bl.y - tl.y) < 0.3 ||


        (tr.y - tl.y) / (br.y - bl.y) > 3 
        // (tr.y - tl.y) / (br.y - bl.y) < 0.3
    ) {
        return false;
    }

    return true;
}



function perspectiveTransform(src, pts, destRect=null) {

    let {
        tl,
        tr,
        br,
        bl
    } = pts


    if (!destRect) {
    
        let widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2))
        let widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2))
        let maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB))

        let heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2))
        let heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2))
        let maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB))

        destRect =  [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight];
    }



    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, destRect)

    let M = cv.getPerspectiveTransform(srcTri, dstTri)

    // let dstTri2 = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1])
    // const result = cv.findHomography(src, dstTri2)
    // console.log('++ ', result)


    let dsize = new cv.Size(src.cols, src.rows)
    let warped = new cv.Mat()
    cv.warpPerspective(src, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())

    srcTri.delete()
    dstTri.delete()
    M.delete()

    return {
        warped: warped,
        width: destRect[2] - destRect[0],
        height: destRect[5] - destRect[1]
    }

}

function crop(src, x, y, width, height, padding = 5) {

    let warpSize = src.size()

    let rect = new cv.Rect(
        x + padding, y + padding,
        Math.min(warpSize.width, width) - padding * 2,
        Math.min(warpSize.height, height) - padding * 2
    )

    return src.roi(rect);
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



function opencvIsReady() {
    console.log('OpenCV.js is ready');
    if (!featuresReady) {
        console.log('Requred features are not ready.');
        return;
    }
    container.className = '';
    // loadImage()

    // init threads number 
    // cv.parallel_pthreads_set_threads_num(1);

    // cv.parallel_pthreads_set_threads_num(4);

    cv().then(res => {
        cv = res;

        startCamera();
    })


}