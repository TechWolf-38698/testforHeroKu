let width = 0;
let height = 0;

let vc = null;

let container = document.getElementById('container');

let canvasOutput;

let stream = null;
let videoCapture = null;

let src = null;
let dstC1 = null;
let preProcessedSrc = null;

let preview;


function startCamera() {
    const video = document.getElementById("video");

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
        //     streaming = true;
        videoCapture = new cv.VideoCapture(video);
        // }
        startVideoProcessing();
    }, false);

}

function startVideoProcessing() {
    stopVideoProcessing();

    src = new cv.Mat(height, width, cv.CV_8UC4);
    preProcessedSrc = new cv.Mat(height, width, cv.CV_8UC1);

    requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
    (src && !src.isDeleted()) && src.delete();
    preProcessedSrc && !preProcessedSrc.isDeleted() && preProcessedSrc.delete();
    preview && !preview.isDeleted() && preview.delete();

    // src = null;
    // preview = null;
}

function processVideo() {

    videoCapture.read(src);

    // preview  = src;

    preview = src.clone()

    const result = process(src);

    // cv.imshow("canvasOutput", src);

    if (result) {
        cv.imshow("canvasOutput", result);

        // result && !result.isDeleted() && result.delete();
    } else {
        cv.imshow("canvasOutput", preProcessedSrc)
    }

    if (preview) {
        cv.imshow("preview", preview)
    }

    requestAnimationFrame(processVideo);
}

function onClickProcess() {
    startCamera();
}


let breakCount = 0;
let detectedForm = null;
let detectingBubbles = false;


function process(src) {

    cv.cvtColor(src, preProcessedSrc, cv.COLOR_RGBA2GRAY);

    cv.erode(preProcessedSrc, preProcessedSrc, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));
    cv.dilate(preProcessedSrc, preProcessedSrc, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));


    // return preProcessedSrc;

    cv.GaussianBlur(preProcessedSrc, preProcessedSrc, {
        width: 3,
        height: 3
    }, 0, 0, cv.BORDER_DEFAULT);

    // cv.threshold(preProcessedSrc, preProcessedSrc, 150, 255, cv.THRESH_BINARY)
    // cv.blur(preProcessedSrc, preProcessedSrc, new cv.Size(5, 5))

    // cv.adaptiveThreshold(preProcessedSrc, preProcessedSrc, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 2);

    // cv.bitwise_not(preProcessedSrc, preProcessedSrc)



    const points = findBubbleRegion3(preProcessedSrc);


    if (!points) {
        if (detectedForm) {
            breakCount++;

            if (breakCount > 30) {
                detectedForm = null;
                console.log('no roi break');
            } else {
                console.log('no roi continue')
                drawBubbleRegion(detectedForm.points);
            }
        } else {
            breakCount = 0;
        }

        return
    }



    if (detectedForm || detectingBubbles) {
        return;
    }

    breakCount = 0;
    detectedForm = {
        id: getFormId(),
        points
    };

    drawBubbleRegion(points);

    // return preProcessedSrc

    // return preProcessedSrc

    // return;


    detectingBubbles = true;
    console.log('processing')


    /**
     * 检测到 ROI
     */
    const ready = extractRoi(preProcessedSrc, points);


    cv.adaptiveThreshold(ready, ready, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 35, 3);

    return ready;

    const result = processBubbleRegion(ready);

    detectingBubbles = false;

    return result
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

    const roi = cropRoi(result.warped, result.width, result.height)


    let readySrc = new cv.Mat();

    const destWidth = 800;
    cv.resize(roi, readySrc, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));

    // 截取原图
    if (originSrc) {
        const srcTransformResult = perspectiveTransform(originSrc, points)
        const srcRoi = cropRoi(srcTransformResult.warped, srcTransformResult.width, srcTransformResult.height)
        cv.resize(srcRoi, srcRoi, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));
        // preview = srcRoi
    }

    result.warped.delete();

    return readySrc
}


function processBubbleRegion(readySrc) {

    cv.threshold(readySrc, readySrc, 100, 255, cv.THRESH_BINARY | cv.THRESH_BINARY_INV)
    // cv.adaptiveThreshold(readySrc, readySrc, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 5, 3);
    cv.bitwise_not(readySrc, readySrc)


    const lines = findSeparatorLines(readySrc);


    if (!lines || !lines.length) {
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
        return;
    }

    for (let i = 0; i < structure.length; i++) {
        detectBubbles(readySrc, lines[i][0].y, structure[i]);
    }


    console.log("%c 识别到了", "color:red;font-weight:bold;font-size:20px")

    readySrc.delete();
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

                // cv.rectangle(preview, new cv.Point(x, y), new cv.Point(x + unit.width, y + unit.height), color, cv.LINE_4);

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

    arr = arr.filter(item => item[1].x - item[0].x >= src.cols * 2 / 3)

    arr.sort((a, b) => {
        if (a[0].y > b[0].y) return 1;
        return -1;
    })

    for (let i = 0; i < arr.length; i++) {
        const line = arr[i];
        preview && cv.line(preview, line[0], line[1], contoursColor[i], 3, cv.LINE_AA);
    }


    console.log('lines count:', lines.rows, arr.length)

    return arr;
}


function findBubbleRegion2(src) {
    let mat = src //new cv.Mat(height, width, cv.CV_8UC1);

    // cv.GaussianBlur(src, mat, { width: 1, height: 1 }, 0, 0, cv.BORDER_DEFAULT);

    // cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 35, 3);

    // cv.bitwise_not(mat, mat)

    // let canny = new cv.Mat();

    // cv.Canny(src, canny, 5, controls.cannyThreshold2, controls.cannyApertureSize, controls.cannyL2Gradient);

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
        if (area > 1000 || area < 10) {
            continue
        }

        contourAreaArray.push({
            area,
            index: i
        })
    }

    // cv.drawContours(preview, contours, -1, [255, 0, 0, 255], 1)

    // return;
    // contourAreaArray.sort(sortContourFunc)

    let regionCnt;

    let p = new cv.MatVector();

    for (let cntArea of contourAreaArray) {
        const cnt = contours.get(cntArea.index);

        const peri = cv.arcLength(cnt, true)
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, peri * 0.02, true)

        if (approx.rows === 4) {
            p.push_back(cnt);
            // regionCnt = approx;
            // break;
        } else {
            approx.delete()
        }
    }


    cv.drawContours(preview, p, -1, [255, 0, 0, 255], 1)

    if (!regionCnt) {
        // we could not find a 4-side poly
        // try other ways to find it

        return;
    }


    contours.delete();
    hierarchy.delete();


    const data = regionCnt.data32S

    regionCnt.delete();


    const points = [{
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

    let {
        tl,
        tr,
        br,
        bl
    } = sortCorners(points)

    if (tr.x - tl.x <= width / 20 ||
        Math.abs(tr.y - tl.y) >= height / 2 ||
        br.x - tr.x >= 300 ||
        Math.abs(br.y - tr.y) <= height / 5 ||
        br.x - bl.x < width / 5 ||
        Math.abs(bl.y - br.y) >= 300 ||

        (tr.y - tl.y) / (br.y - bl.y) > 2 ||
        (tr.y - tl.y) / (br.y - bl.y) < 0.5
    ) {
        return null;
    }


    // cv.drawContours(preview, regionCnt, -1, [255, 0, 0, 255], 1)

    return {
        tl,
        tr,
        br,
        bl
    };
}


function findBubbleRegion3(src) {
    let mat = new cv.Mat(src.cols, src.rows, cv.CV_8UC1);
    // let mat = src;

    cv.adaptiveThreshold(src, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 2);

    // cv.GaussianBlur(src, mat, { width: 5, height: 5 }, 0, 0, cv.BORDER_DEFAULT);

    // let canny = new cv.Mat();
    // cv.Canny(src, mat, 160, 20);

    // cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 35, 2);
   

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

    const minArea = width * height / 8
    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt, false)
        if (area < minArea) {
            continue
        }

        contourAreaArray.push({
            area,
            index: i
        })
    }

    contourAreaArray.sort(sortContourFunc)


    const possibleRectangles = {};

    let p = new cv.MatVector();

    for (let cntArea of contourAreaArray) {
        const cnt = contours.get(cntArea.index);

        const peri = cv.arcLength(cnt, true)
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, peri * 0.02, true)

        if (approx.rows === 4) {
            const points = checkApproxIsRectangle(approx)

            if (points) {
                possibleRectangles[cntArea.index] = cnt;

                p.push_back(cnt);
            }
        }

        approx.delete()

        if (Object.keys(possibleRectangles).length >= 8) {
            break;
        }
    }

    cv.drawContours(preview, p, -1, [255, 0, 0, 255], 1)

    p.delete()

    for (let i in possibleRectangles) {

        const rectangle = possibleRectangles[i];

        let index = +i;

        // hierarchy: [Next, Previous, First_Child, Parent]

        const ids = hierarchy.intPtr(0, index);
        let nextId = ids[0];
        let previousId = ids[1];

        if (nextId != -1 && previousId != -1) continue;

        let k = index;
        let c = 0;

        while (hierarchy.intPtr(0, k)[2] !== -1) {
            k = hierarchy.intPtr(0, k)[2];
            c++;
        }

        // if (hierarchy.intPtr(0, k)[2] != -1) c ++;

        if (c >= 1) {

            const peri = cv.arcLength(contours.get(index), true)
            let approx = new cv.Mat();
            cv.approxPolyDP(contours.get(index), approx, peri * 0.02, true)

            const points = checkApproxIsRectangle(approx)

            approx.delete()

            if (points) {
                return points;
            }
            break;
        }

    }

    contours.delete();
    hierarchy.delete();

    return
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

    // console.log(br.x - tr.x >= 300 ,
    //     Math.abs(br.y - tr.y) <= height / 5 ,
    //     br.x - bl.x < width / 5 ,
    //     Math.abs(bl.y - br.y) >= 300 ,

    //     (tr.y - tl.y) / (br.y - bl.y) > 3 ,
    //     (tr.y - tl.y) / (br.y - bl.y) < 0.3)

    if (
        tr.x - tl.x <= width / 20 ||
        Math.abs(tr.y - tl.y) >= height / 2||
        br.x - tr.x >= 300 ||
        Math.abs(br.y - tr.y) <= height / 5 ||
        br.x - bl.x < width / 5 ||
        Math.abs(bl.y - br.y) >= 300 ||

        (tr.y - tl.y) / (br.y - bl.y) > 3 ||
        (tr.y - tl.y) / (br.y - bl.y) < 0.3
    ) {
        return false;
    }

    return true;
}


function findBubbleRegion(src) {
    let mat = src //new cv.Mat(height, width, cv.CV_8UC1);

    // cv.GaussianBlur(src, mat, { width: 1, height: 1 }, 0, 0, cv.BORDER_DEFAULT);

    // let canny = new cv.Mat();
    cv.Canny(src, mat, 160, 20);


    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 2);

    // cv.bitwise_not(mat, mat)

    // let canny = new cv.Mat();

    // cv.Canny(src, canny, 5, controls.cannyThreshold2, controls.cannyApertureSize, controls.cannyL2Gradient);

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

    const minArea = width * height / 4
    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt, false)
        if (area < minArea) {
            continue
        }

        contourAreaArray.push({
            area,
            index: i
        })
    }

    // cv.drawContours(preview, contours, -1, [255, 0, 0, 255], 1)

    contourAreaArray.sort(sortContourFunc)

    let regionCnt;

    let p = new cv.MatVector();

    for (let cntArea of contourAreaArray) {
        const cnt = contours.get(cntArea.index);

        const peri = cv.arcLength(cnt, true)
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, peri * 0.02, true)

        if (approx.rows === 4) {
            p.push_back(cnt);
            // if (!regionCnt) regionCnt = approx;
            // else {
            //     regionCnt = approx;
            //     break;
            // }
            regionCnt = approx;
            break;
        } else {
            approx.delete()
        }
    }

    cv.drawContours(preview, p, -1, [255, 0, 0, 255], 1)

    p.delete()


    if (!regionCnt) {
        // we could not find a 4-side poly
        // try other ways to find it

        return;
    }


    contours.delete();
    hierarchy.delete();


    const data = regionCnt.data32S

    regionCnt.delete();


    const points = [{
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

    let {
        tl,
        tr,
        br,
        bl
    } = sortCorners(points)

    if (tr.x - tl.x <= width / 20 ||
        Math.abs(tr.y - tl.y) >= height / 2 ||
        br.x - tr.x >= 300 ||
        Math.abs(br.y - tr.y) <= height / 5 ||
        br.x - bl.x < width / 5 ||
        Math.abs(bl.y - br.y) >= 300 ||

        (tr.y - tl.y) / (br.y - bl.y) > 2 ||
        (tr.y - tl.y) / (br.y - bl.y) < 0.5
    ) {
        return null;
    }


    // cv.drawContours(preview, regionCnt, -1, [255, 0, 0, 255], 1)

    return {
        tl,
        tr,
        br,
        bl
    };
}

function perspectiveTransform(src, pts) {

    let {
        tl,
        tr,
        br,
        bl
    } = pts

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

function cropRoi(src, width, height, padding = 2) {

    return crop(src, 0, 0, width, height, padding);
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



function opencvIsReady() {
    console.log('OpenCV.js is ready');
    if (!featuresReady) {
        console.log('Requred features are not ready.');
        return;
    }
    container.className = '';
    // loadImage()
}