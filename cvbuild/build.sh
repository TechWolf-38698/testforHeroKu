#!/bin/bash

VERSION='3.4'

# =================================================================
# =  Check Requirements
# =================================================================

# docker
# 我们使用 docker emscripten 进行编译





# =================================================================
# =  Prepare
# =================================================================

TEMP_DIR=.temp

docker pull emscripten/emsdk

if [ ! -d ${TEMP_DIR} ]; then
    mkdir $TEMP_DIR
    mkdir $TEMP_DIR/output
fi


git clone -b $VERSION https://github.com/opencv/opencv.git --depth=1 $TEMP_DIR/opencv


# =================================================================
# =  Build
# =================================================================


# if $VERSION = '3.4' then

    docker run --rm -v $(pwd)/${TEMP_DIR}:/src \
        -e EMSCRIPTEN=/emsdk/upstream/emscripten \
        emscripten/emsdk python3 /src/opencv/platforms/js/build_js.py /src/output \
        --build_wasm --threads --clean_build_dir --enable_exception

# fi

if [ -f $TEMP_DIR/output/bin/opencv.js  ]; then
    mv $TEMP_DIR/output/bin ./output
fi

# =================================================================
# =  Clean up
# =================================================================
# rm -rf $TEMP_DIR
