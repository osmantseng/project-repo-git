import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import '../../../styles/crop.css';
import { ICropInfo, IRatioOptionUI, IWidthHeight } from '../../../global';
import { parallel } from 'async';

const { obsHandler, cropUIHandler } = window;

// 方位枚举
enum Direction {
  move = 'move',
  t = 't',
  d = 'd',
  l = 'l',
  r = 'r',
  lt = 'lt',
  rt = 'rt',
  ld = 'ld',
  rd = 'rd'
}

interface ICropUIProps {
  //inputResolution: IWidthHeight;
  selectedRatio: IRatioOptionUI;
}

const CropUI = (props: ICropUIProps) => {
  const isinitialized = useRef(false);
  const clipCanvasRef = React.useRef<HTMLDivElement>(null);
  const clipBoundRef = React.useRef<HTMLDivElement>(null);
  const [isCropping, setIsCropping] = useState(true);
  const [isLowResolution, setIsLowResolution] = useState(false);
  const outputResolution = React.useRef({
    width: 1920,
    height: 1080
  } as IWidthHeight);
  const inputResolution = React.useRef({
    width: 1920,
    height: 1080
  } as IWidthHeight);
  const [curClipBound, setCurClipBound] = useState({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  } as ICropInfo);
  const [multipleValue, setMultipleValue] = useState(105);
  const [showUI, setShowUI] = useState(false);
  const controlPoints = ['t', 'd', 'l', 'r', 'lt', 'rt', 'ld', 'rd'] as Direction[];

  const computeZoomRate = useCallback(
    (clipBound: ICropInfo) => {
      //console.log('computeZoomRate', clipBound, curClipBound);
      let resolution = inputResolution.current;
      let percentX = (100 - clipBound.left - clipBound.right) / 100;
      let percentY = (100 - clipBound.top - clipBound.bottom) / 100;
      let pxX = resolution.width * percentX;
      let pxY = resolution.height * percentY;
      if (pxY <= 0 || outputResolution.current.height <= 0) {
        setMultipleValue(0);
        return;
      }

      let outputAspectRatio = outputResolution.current.width / outputResolution.current.height;
      let cropAspectRatio = pxX / pxY;
      let zoomRate = 0;
      if (cropAspectRatio <= outputAspectRatio) {
        zoomRate = _.round((outputResolution.current.height / pxY) * 100);
      } else {
        zoomRate = _.round((outputResolution.current.width / pxX) * 100);
      }

      //console.log('computeZoomRate', clipBound, curClipBound);
      //console.log('computeZoomRate', zoomRate, multipleValue);
      if (zoomRate !== multipleValue) {
        setMultipleValue(zoomRate);
      }
    },
    [multipleValue, /* curClipBound */]
  );

  const beginCrop2 = useCallback(() => {
    console.log('beginCrop2');
    isinitialized.current = true;
    let resolution = inputResolution.current;
    let selectedRatio = props.selectedRatio;

    parallel<IWidthHeight | boolean | undefined>(
      {
        verticalFlip: (callback) => {
          obsHandler.camera.getCamVerticalFlip(0).then((res) => {
            callback(null, res);
          });
        },
        horizontalFlip: (callback) => {
          obsHandler.camera.getCamHorizontalFlip(0).then((res) => {
            callback(null, res);
          });
        },
        outputResolution: (callback) => {
          obsHandler.backend.getOBSOutputResolution().then((res) => {
            callback(null, res);
          });
        },
        inputResolution: (callback) => {
          obsHandler.camera.getCamInputResolution(0).then((res) => {
            callback(null, res);
          });
        }
      },
      (err, results) => {
        if (!_.isNil(err)) {
          return;
        }

        let _outputResolution = _.get(results, 'outputResolution');
        if (!_.isNil(_outputResolution)) {
          outputResolution.current = _outputResolution as IWidthHeight;
        }

        let _inputResolution = _.get(results, 'inputResolution');
        if (!_.isNil(_outputResolution)) {
          inputResolution.current = _inputResolution as IWidthHeight;
        }

        let verticalFlip = _.get(results, 'verticalFlip', false);
        let horizontalFlip = _.get(results, 'horizontalFlip', false);

        let clipBound = {
          top: 0,
          left: 0,
          bottom: 0,
          right: 0
        } as ICropInfo;

        if (_.isNil(selectedRatio.cropInfo)) {
          clipBound = {
            top: 2.5,
            left: 2.5,
            bottom: 2.5,
            right: 2.5
          } as ICropInfo;
          if (selectedRatio.heightRatio > 0 && selectedRatio.widthRatio > 0) {
            let inputAspectRatio = resolution.width / resolution.height;
            let selectedAspectRatio = selectedRatio.widthRatio / selectedRatio.heightRatio;
            if (selectedAspectRatio <= inputAspectRatio) {
              // clipBound max height
              let supposedClipBoundX =
                ((100 * inputAspectRatio -
                  (100 - clipBound.top - clipBound.bottom) * selectedAspectRatio) /
                  (100 * inputAspectRatio) /
                  2) *
                100;
              clipBound.left = supposedClipBoundX;
              clipBound.right = supposedClipBoundX;
            } else if (selectedAspectRatio > inputAspectRatio) {
              // clipBound max width
              inputAspectRatio = resolution.height / resolution.width;
              selectedAspectRatio = selectedRatio.heightRatio / selectedRatio.widthRatio;
              let supposedClipBoundY =
                ((100 * inputAspectRatio -
                  (100 - clipBound.top - clipBound.bottom) * selectedAspectRatio) /
                  (100 * inputAspectRatio) /
                  2) *
                100;
              clipBound.top = supposedClipBoundY;
              clipBound.bottom = supposedClipBoundY;
            }
          }
        } else {
          let cropInfo = selectedRatio.cropInfo;
          clipBound = {
            top: (cropInfo.top / resolution.height) * 100,
            bottom: (cropInfo.bottom / resolution.height) * 100,
            left: (cropInfo.left / resolution.width) * 100,
            right: (cropInfo.right / resolution.width) * 100
          } as ICropInfo;
        }

        if (!!verticalFlip) {
          let tmp = clipBound.top;
          clipBound.top = clipBound.bottom;
          clipBound.bottom = tmp;
        }

        if (!!horizontalFlip) {
          let tmp = clipBound.left;
          clipBound.left = clipBound.right;
          clipBound.right = tmp;
        }

        setShowUI(true);
        setCurClipBound(clipBound);
        computeZoomRate(clipBound);
      }
    );
  }, [props.selectedRatio, setShowUI, setCurClipBound, computeZoomRate]);

  const updateClipBound = useCallback(
    (clipBound: ICropInfo) => {
      //console.log('updateClipBound', clipBound, curClipBound);
      if (!_.isEqual(clipBound, curClipBound)) {
        setCurClipBound(clipBound);
      }
      computeZoomRate(clipBound);
    },
    [curClipBound, setCurClipBound, computeZoomRate]
  );

  const show = useCallback(() => {
    console.log('show UI');
    parallel<IWidthHeight>(
      {
        outputResolution: (callback) => {
          obsHandler.backend.getOBSOutputResolution().then((res) => {
            callback(null, res);
          });
        },
        inputResolution: (callback) => {
          obsHandler.camera.getCamInputResolution(0).then((res) => {
            callback(null, res);
          });
        }
      },
      (err, results) => {
        if (!showUI) {
          setShowUI(true);
        }

        if (!_.isNil(err)) {
          return;
        }

        let _outputResolution = _.get(results, 'outputResolution');
        if (!_.isNil(_outputResolution)) {
          outputResolution.current = _outputResolution as IWidthHeight;
        }

        let _inputResolution = _.get(results, 'inputResolution');
        if (!_.isNil(_inputResolution)) {
          inputResolution.current = _inputResolution as IWidthHeight;
        }
      }
    );
  }, [showUI]);

  const hide = useCallback(() => {
    console.log('hide UI');
    if (showUI) {
      setShowUI(false);
    }
  }, [showUI]);

  useEffect(() => {
    let rmListenerFunc = cropUIHandler.updateClipBound.on(updateClipBound);
    let rmShowListenerFunc = cropUIHandler.show(show);
    let rmHideListenerFunc = cropUIHandler.hide(hide);

    if (!isinitialized.current) {
      beginCrop2();
    }

    return () => {
      rmListenerFunc();
      rmShowListenerFunc();
      rmHideListenerFunc();
    };
  }, [showUI, isCropping, curClipBound, multipleValue, beginCrop2, updateClipBound, show, hide]);

  return (
    <div
      className="clip-canvas"
      ref={clipCanvasRef}
      style={{
        //display: isCropping ? "block" : "none",
        opacity: showUI && isCropping ? 1 : 0,
        transition: 'opacity 0.1s ease 0s'
      }}
    >
      <div
        className={`clip-bound ${isLowResolution ? 'error' : 'normal'}`}
        ref={clipBoundRef}
        style={{
          top: `${curClipBound.top}%`,
          left: `${curClipBound.left}%`,
          bottom: `${curClipBound.bottom}%`,
          right: `${curClipBound.right}%`,
          opacity: showUI ? 1 : 0,
          transition: 'opacity 0.1s ease 0s'
        }}
      >
        {controlPoints.map((p) => (
          <div key={p + 1} className={`control-point control-point-${p}`}></div>
        ))}
        <div
          className="multiple"
          style={{
            opacity: showUI ? 1 : 0,
            transition: 'opacity 0.1s ease 0s'
          }}
        >
          <i className={multipleValue > 100 ? 'icon-ic_zoomout' : 'icon-ic_zoomin'}></i>
          <span>{multipleValue} %</span>
        </div>
      </div>
    </div>
  );
};

export default CropUI;
