var filters = {
  'passThrough': 'Pass Through',
  'gray': 'Gray',
  'hsv': 'HSV',
  'canny': 'Canny Edge Detection',
  'inRange': 'In Range',
  'threshold': 'Threshold',
  'adaptiveThreshold': 'Adaptive Threshold',
  'gaussianBlur': 'Gaussian Blurring',
  'medianBlur': 'Median Blurring',
  'bilateralFilter': 'Bilateral Filtering',
  'sobel': 'Sobel Derivatives',
  'scharr': 'Scharr Derivatives',
  'laplacian': 'Laplacian Derivatives',
  'contours': 'Contours',
  'calcHist': 'Calculation',
  'equalizeHist': 'Equalization',
  'backprojection': 'Backprojection',
  'erosion': 'Erosion',
  'dilation': 'Dilation',
  'morphology': 'Morphology',
};



function initUI() {
    stats = new Stats();
    stats.showPanel(0);
    document.getElementById('container').appendChild(stats.domElement);
  
    controls = {
      filter: 'passThrough',
      setFilter: function (filter) {
        this.filter = filter;
        filterName.innerHTML = filters[filter];
      },
      passThrough: function () { this.setFilter('passThrough'); },
      gray: function () { this.setFilter('gray'); },
      hsv: function () { this.setFilter('hsv'); },
      inRange: function () { this.setFilter('inRange'); },
      inRangeLow: 75,
      inRangeHigh: 150,
      threshold: function () { this.setFilter('threshold'); },
      thresholdValue: 100,
      adaptiveThreshold: function () { this.setFilter('adaptiveThreshold'); },
      adaptiveBlockSize: 80,
      gaussianBlur: function () { this.setFilter('gaussianBlur'); },
      gaussianBlurSize: 7,
      medianBlur: function () { this.setFilter('medianBlur'); },
      medianBlurSize: 5,
      bilateralFilter: function () { this.setFilter('bilateralFilter'); },
      bilateralFilterDiameter: 5,
      bilateralFilterSigma: 75,
      sobel: function () { this.setFilter('sobel'); },
      sobelSize: 3,
      scharr: function () { this.setFilter('scharr'); },
      laplacian: function () { this.setFilter('laplacian'); },
      laplacianSize: 3,
      canny: function () { this.setFilter('canny'); },
      cannyThreshold1: 150,
      cannyThreshold2: 300,
      cannyApertureSize: 3,
      cannyL2Gradient: false,
      contours: function () { this.setFilter('contours'); },
      contoursMode: cv.RETR_CCOMP,
      contoursMethod: cv.CHAIN_APPROX_SIMPLE,
      calcHist: function () { this.setFilter('calcHist'); },
      equalizeHist: function () { this.setFilter('equalizeHist'); },
      backprojection: function () { this.setFilter('backprojection'); },
      backprojectionRangeLow: 0,
      backprojectionRangeHigh: 150,
      morphology: function () { this.setFilter('morphology'); },
      morphologyShape: cv.MORPH_RECT,
      morphologyOp: cv.MORPH_ERODE,
      morphologySize: 5,
      morphologyBorderType: cv.BORDER_CONSTANT,
    };
  
    let gui = new dat.GUI({ autoPlace: false });
    let guiContainer = document.getElementById('guiContainer');
    guiContainer.appendChild(gui.domElement);
  
    let lastFolder = null;
    function closeLastFolder(folder) {
      if (lastFolder != null && lastFolder != folder) {
        lastFolder.close();
      }
      lastFolder = folder;
    }
  
    let passThrough = gui.add(controls, 'passThrough').name(filters['passThrough']).onChange(function () {
      closeLastFolder(null);
    });
  
    let colorConversion = gui.addFolder('Color Conversion');
    colorConversion.add(controls, 'gray').name(filters['gray']).onChange(function () {
      closeLastFolder(null);
    });
  
    colorConversion.add(controls, 'hsv').name(filters['hsv']).onChange(function () {
      closeLastFolder(null);
    });
  
    let inRange = colorConversion.addFolder(filters['inRange']);
    inRange.domElement.onclick = function () {
      closeLastFolder(inRange);
      controls.inRange();
    };
    inRange.add(controls, 'inRangeLow', 0, 255, 1).name('lower boundary');
    inRange.add(controls, 'inRangeHigh', 0, 255, 1).name('higher boundary');
  
    // let geometricTransformations = gui.addFolder('Geometric Transformations');
    // TODO
  
    let thresholding = gui.addFolder('Thresholding');
  
    let threshold = thresholding.addFolder(filters['threshold']);
    threshold.domElement.onclick = function () {
      closeLastFolder(threshold);
      controls.threshold();
    };
    threshold.add(controls, 'thresholdValue', 0, 200, 1).name('threshold value');
  
    let adaptiveThreshold = thresholding.addFolder(filters['adaptiveThreshold']);
    adaptiveThreshold.domElement.onclick = function () {
      closeLastFolder(adaptiveThreshold);
      controls.adaptiveThreshold();
    };
    adaptiveThreshold.add(controls, 'adaptiveBlockSize', 3, 99, 1).name('block size').onChange(function (value) { if (value % 2 === 0) controls.adaptiveBlockSize = value + 1; });
  
    let smoothing = gui.addFolder('Smoothing');
  
    let gaussianBlur = smoothing.addFolder(filters['gaussianBlur']);
    gaussianBlur.domElement.onclick = function () {
      closeLastFolder(gaussianBlur);
      controls.gaussianBlur();
    };
    gaussianBlur.add(controls, 'gaussianBlurSize', 7, 99, 1).name('kernel size').onChange(function (value) { if (value % 2 === 0) controls.gaussianBlurSize = value + 1; });
  
    let medianBlur = smoothing.addFolder(filters['medianBlur']);
    medianBlur.domElement.onclick = function () {
      closeLastFolder(medianBlur);
      controls.medianBlur();
    };
    medianBlur.add(controls, 'medianBlurSize', 3, 99, 1).name('kernel size').onChange(function (value) { if (value % 2 === 0) controls.medianBlurSize = value + 1; });
  
    let bilateralFilter = smoothing.addFolder(filters['bilateralFilter']);
    bilateralFilter.domElement.onclick = function () {
      closeLastFolder(bilateralFilter);
      controls.bilateralFilter();
    };
    bilateralFilter.add(controls, 'bilateralFilterDiameter', 1, 15, 1).name('diameter');
    bilateralFilter.add(controls, 'bilateralFilterSigma', 1, 255, 1).name('sigma')
  
    let morphology = gui.addFolder('Morphology');
    morphology.domElement.onclick = function () {
      closeLastFolder(morphology);
      controls.morphology();
    };
    morphology.add(controls, 'morphologyOp', { 'MORPH_ERODE': cv.MORPH_ERODE, 'MORPH_DILATE': cv.MORPH_DILATE, 'MORPH_OPEN ': cv.MORPH_OPEN, 'MORPH_CLOSE': cv.MORPH_CLOSE, 'MORPH_GRADIENT': cv.MORPH_GRADIENT, 'MORPH_TOPHAT': cv.MORPH_TOPHAT, 'MORPH_BLACKHAT': cv.MORPH_BLACKHAT }).name('operation');
    morphology.add(controls, 'morphologyShape', { 'MORPH_RECT': cv.MORPH_RECT, 'MORPH_CROSS': cv.MORPH_CROSS, 'MORPH_ELLIPSE': cv.MORPH_ELLIPSE }).name('shape');
    morphology.add(controls, 'morphologySize', 1, 15, 1).name('kernel size').onChange(function (value) { if (value % 2 === 0) controls.morphologySize = value + 1; });
    morphology.add(controls, 'morphologyBorderType', { 'BORDER_CONSTANT': cv.BORDER_CONSTANT, 'BORDER_REPLICATE': cv.BORDER_REPLICATE, 'BORDER_REFLECT': cv.BORDER_REFLECT, 'BORDER_REFLECT_101': cv.BORDER_REFLECT_101 }).name('boarder type');
  
    let gradients = gui.addFolder('Gradients')
    let sobel = gradients.addFolder(filters['sobel']);
    sobel.domElement.onclick = function () {
      closeLastFolder(sobel);
      controls.sobel();
    };
    sobel.add(controls, 'sobelSize', 3, 19, 1).name('kernel size').onChange(function (value) { if (value % 2 === 0) controls.sobelSize = value + 1; });
  
    gradients.add(controls, 'scharr').name(filters['scharr']).onChange(function () {
      closeLastFolder(null);
    });
  
    let laplacian = gradients.addFolder(filters['laplacian']);
    laplacian.domElement.onclick = function () {
      closeLastFolder(laplacian);
      controls.laplacian();
    };
    laplacian.add(controls, 'laplacianSize', 1, 19, 1).name('kernel size').onChange(function (value) { if (value % 2 === 0) controls.laplacianSize = value + 1; });
  
    let canny = gui.addFolder(filters['canny']);
    canny.domElement.onclick = function () {
      closeLastFolder(canny);
      controls.canny();
    };
    canny.add(controls, 'cannyThreshold1', 1, 500, 1).name('threshold1');
    canny.add(controls, 'cannyThreshold2', 1, 500, 1).name('threshold2');
    canny.add(controls, 'cannyApertureSize', 3, 7, 1).name('aperture size').onChange(function (value) { if (value % 2 === 0) controls.cannyApertureSize = value + 1; });
    canny.add(controls, 'cannyL2Gradient').name('l2 gradient');
  
    let contours = gui.addFolder(filters['contours']);
    contours.domElement.onclick = function () {
      closeLastFolder(contours);
      controls.contours();
    };
    contours.add(controls, 'contoursMode', { 'RETR_EXTERNAL': cv.RETR_EXTERNAL, 'RETR_LIST': cv.RETR_LIST, 'RETR_CCOMP': cv.RETR_CCOMP, 'RETR_TREE': cv.RETR_TREE }).name('mode');
    contours.add(controls, 'contoursMethod', { 'CHAIN_APPROX_NONE': cv.CHAIN_APPROX_NONE, 'CHAIN_APPROX_SIMPLE': cv.CHAIN_APPROX_SIMPLE, 'CHAIN_APPROX_TC89_L1': cv.CHAIN_APPROX_TC89_L1, 'CHAIN_APPROX_TC89_KCOS': cv.CHAIN_APPROX_TC89_KCOS }).name('method');
  
    let histograms = gui.addFolder('Histograms');
    histograms.add(controls, 'calcHist').name(filters['calcHist']).onChange(function () {
      closeLastFolder(null);
    })
    histograms.add(controls, 'equalizeHist').name(filters['equalizeHist']).onChange(function () {
      closeLastFolder(null);
    });
  
    let backprojection = histograms.addFolder(filters['backprojection']);
    backprojection.domElement.onclick = function () {
      closeLastFolder(backprojection);
      controls.backprojection();
    };
    backprojection.add(controls, 'backprojectionRangeLow', 0, 255, 1).name('range low');
    backprojection.add(controls, 'backprojectionRangeHigh', 0, 255, 1).name('range high');
  }
  