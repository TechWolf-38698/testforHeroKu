let width = 0;
let height = 0;


/**
 * 检测并找到答题卡区域
 */
function findBubbleRegion(imageData) {

    const img = cv.matFromArray(imageData, 24); // 24 for rgba
    // matFromImageData

    width = img.cols;
    height = img.rows;

    let mat = new cv.Mat();

    // cv.cvtColor(img, mat, cv.COLOR_RGBA2GRAY, 0);
    cv.cvtColor(img, mat, cv.ColorConversionCodes.COLOR_RGBA2GRAY.value, 0);

    return;



    cv.erode(mat, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));
    cv.dilate(mat, mat, cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5)));

    // cv.GaussianBlur(mat, mat, {
    //     width: 3,
    //     height: 3
    // }, 0, 0, cv.BORDER_DEFAULT);

    cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 11, 2);

    // cv.GaussianBlur(src, mat, { width: 5, height: 5 }, 0, 0, cv.BORDER_DEFAULT);

    // let canny = new cv.Mat();
    // cv.Canny(src, mat, 160, 20);

    // cv.adaptiveThreshold(mat, mat, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 35, 2);


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

    contourAreaArray.sort((a, b) => {
        /* Sort largest value first */
        if (a.area < b.area) {
            return 1
        } else if (a.area > b.area) {
            return -1
        }
        return 0
    })


    const possibleRectangles = {};


    for (let cntArea of contourAreaArray) {
        const cnt = contours.get(cntArea.index);

        const peri = cv.arcLength(cnt, true)
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, peri * 0.02, true)

        if (approx.rows === 4) {
            const points = checkApproxIsRectangle(approx)

            if (points) {
                possibleRectangles[cntArea.index] = cnt;
            }
        }

        approx.delete()

        if (Object.keys(possibleRectangles).length >= 8) {
            break;
        }
    }

    cv.drawContours(preview, p, -1, [255, 0, 0, 255], 1)

    let targetPoints
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
                targetPoints = points
                break;
            }
            // break;
        }

    }

    contours.delete();
    hierarchy.delete();
    img.delete();
    mat.delete();

    respond(targetPoints);
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
        Math.abs(tr.y - tl.y) >= height / 2 ||
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


function respond() {
    postMessage({})
}



onmessage = function (e) {
    console.log('on message')
      switch (e.data.cmd) {
          case 'region':
            console.log('region decting', e.data);
              findBubbleRegion(e.data.img);
              break;
          case 'eyesDetect': {			
              
              break;
          }
      }
  }
  
  onerror = function (e) {
      console.log(e);
  }
  console.log('done loading worker')
  