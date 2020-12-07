let width = 0;
let height = 0;

const IMG_DEST_WIDTH = 800;

/**
 * 检测并识别答案
 */
function process(imageData, points, structure) {
    const img = cv.matFromArray(imageData, 24); // 24 for rgba

    width = img.cols;
    height = img.rows;

    let mat = new cv.Mat(width, height, cv.CV_8UC1);

    cv.cvtColor(img, mat, cv.COLOR_RGBA2GRAY, 0);


    const mat = extractRoi(mat, points);


    cv.erode(mat, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));
    cv.dilate(mat, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));

    // cv.threshold(ready, ready, 150, 255, cv.THRESH_BINARY)
    // cv.blur(ready, ready, new cv.Size(5, 5))

    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 9, 1);

    cv.GaussianBlur(mat, mat, {
        width: 5,
        height: 5
    }, 0, 0, cv.BORDER_DEFAULT);

    cv.bitwise_not(mat, mat)



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

    const result = processBubbleRegion(mat, structure);

    if (!result || result.error) {
        console.log("%c 未识别", "color:red;font-weight:bold;font-size:20px")

    } else {
        console.log("%c 识别到了", "color:red;font-weight:bold;font-size:20px")

    }



    mat.delete();
   
    ready && !ready.isDeleted() && ready.delete();
}


function extractRoi(mat, points, originSrc) {

    const result = perspectiveTransform(mat, points)

    const roi = cropRoi(result.warped, result.width, result.height)


    let readySrc = new cv.Mat();

    const destWidth = IMG_DEST_WIDTH;
    cv.resize(roi, readySrc, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));

    // 截取原图
    if (originSrc) {
        const srcTransformResult = perspectiveTransform(originSrc, points)
        const srcRoi = cropRoi(srcTransformResult.warped, srcTransformResult.width, srcTransformResult.height)
        cv.resize(srcRoi, srcRoi, new cv.Size(destWidth, Math.floor(destWidth * result.height / result.width)));
        preview = srcRoi
    }

    result.warped.delete();

    return readySrc
}


function processBubbleRegion(src) {

    cv.threshold(src, src, 100, 255, cv.THRESH_BINARY | cv.THRESH_BINARY_INV)
    // cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 5, 3);
    cv.bitwise_not(src, src)


    const lines = findSeparatorLines(src);


    if (!lines || !lines.length) {
        return
    }

  
    if (lines.length != structure.length) {
        return;
    }

    for (let i = 0; i < structure.length; i++) {
        detectBubbles(src, lines[i][0].y, structure[i]);
    }
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
        preview && cv.line(preview, line[0], line[1], [0, 0, 255, 255], 3, cv.LINE_AA);
    }


    console.log('lines count:', lines.rows, arr.length)

    return arr;
}
