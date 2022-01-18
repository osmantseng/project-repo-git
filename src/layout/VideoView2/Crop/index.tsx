import React, {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import _ from "lodash";
import { cropEvent, CropEvents } from "../../../helpers/util/crop";
import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";
import {
  IRatioOptionUI,
  IWidthHeight,
  ICropInfo,
  IBounds,
} from "../../../global";
import "../../../styles/crop.css";
import { auto, parallel } from "async";
/**
 * 裁剪区域
 */
const mouse = require("mouse-event");
const { obsHandler, cropUIHandler } = window;

// 方位枚举
enum Direction {
  move = "move",
  t = "t",
  d = "d",
  l = "l",
  r = "r",
  lt = "lt",
  rt = "rt",
  ld = "ld",
  rd = "rd",
}

interface ICrop2Prop {
  inputResolution: IWidthHeight;
  previewSize: IWidthHeight;
}

const Crop2 = (props: ICrop2Prop) => {
  const controlPoints = [
    "t",
    "d",
    "l",
    "r",
    "lt",
    "rt",
    "ld",
    "rd",
  ] as Direction[];

  const clipCanvasRef = useRef<HTMLDivElement>(null);
  const clipBoundRef = useRef<HTMLDivElement>(null);

  const isInitializing = useRef(false);
  const isInitialized = useRef(false);
  const [isCropping, setIsCropping] = useState(false);
  //const [isMouseDown, setIsMouseDown] = useState(false);
  const isMouseDown = useRef(false);
  const [direction, setDirection] = useState(Direction.move);
  const [selectedRatio, setSelectedRatio] = useState<IRatioOptionUI>();
  /* const [curMousePos, setCurMousePos] = useState<{
    mouseButton: number;
    x: number;
    y: number;
  }>({
    mouseButton: 0,
    x: 0,
    y: 0,
  }); */
  const curMousePos = useRef<{
    mouseButton: number;
    x: number;
    y: number;
  }>({
    mouseButton: 0,
    x: 0,
    y: 0,
  });
  const prevClipBound = useRef({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  } as ICropInfo);
  const [curClipBound, setCurClipBound] = useState({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  } as ICropInfo);
  const [minSize, setMinSize] = useState({
    width: 10,
    height: 10,
  } as IWidthHeight);
  const [isLowResolution, setIsLowResolution] = useState(false);
  const initialVerticalFlip = useRef(false);
  const initialHoritontalFlip = useRef(false);

  const _onMouseDown = (e: any) => {
    console.log("点击了clip");
    isMouseDown.current = true;
    if (direction !== Direction.move) {
      setDirection(Direction.move);
    }
  };

  const onMouseDown = _.debounce(_onMouseDown, 5, { maxWait: 10 });

  const pointOnMouseDown = (newDirection: Direction, e: any) => {
    e.stopPropagation();
    console.log("控制点", newDirection);
    isMouseDown.current = true;
    if (direction !== newDirection) {
      setDirection(newDirection);
    }
  };

  const beginCrop = useCallback(
    (selectedRatio: IRatioOptionUI) => {
      auto<{
        verticalFlip: boolean;
        horizontalFlip: boolean;
      }>(
        {
          verticalFlip: (callback: Function) => {
            obsHandler.camera.getCamVerticalFlip(0).then((res) => {
              callback(null, res);
            });
          },
          horizontalFlip: (callback: Function) => {
            obsHandler.camera.getCamHorizontalFlip(0).then((res) => {
              callback(null, res);
            });
          },
        },
        (err, results) => {
          isInitializing.current = false;
          isInitialized.current = true;
          if (!_.isNil(err) || _.isNil(results)) {
            console.error(err);
            return;
          }

          let _clipBound = {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          } as ICropInfo;

          let verticalFlip = results.verticalFlip;
          let horizontalFlip = results.horizontalFlip;

          if (_.isNil(selectedRatio)) {
            return;
          }

          if (_.isNil(selectedRatio.cropInfo)) {
            _clipBound = {
              top: 2.5,
              left: 2.5,
              bottom: 2.5,
              right: 2.5,
            } as ICropInfo;
            if (selectedRatio.heightRatio > 0 && selectedRatio.widthRatio > 0) {
              let inputAspectRatio =
                props.inputResolution.width / props.inputResolution.height;
              let selectedAspectRatio =
                selectedRatio.widthRatio / selectedRatio.heightRatio;
              if (selectedAspectRatio <= inputAspectRatio) {
                // clipBound max height
                let supposedClipBoundX =
                  ((100 * inputAspectRatio -
                    (100 - _clipBound.top - _clipBound.bottom) *
                      selectedAspectRatio) /
                    (100 * inputAspectRatio) /
                    2) *
                  100;
                _clipBound.left = supposedClipBoundX;
                _clipBound.right = supposedClipBoundX;
              } else if (selectedAspectRatio > inputAspectRatio) {
                // clipBound max width
                inputAspectRatio =
                  props.inputResolution.height / props.inputResolution.width;
                selectedAspectRatio =
                  selectedRatio.heightRatio / selectedRatio.widthRatio;
                let supposedClipBoundY =
                  ((100 * inputAspectRatio -
                    (100 - _clipBound.top - _clipBound.bottom) *
                      selectedAspectRatio) /
                    (100 * inputAspectRatio) /
                    2) *
                  100;
                _clipBound.top = supposedClipBoundY;
                _clipBound.bottom = supposedClipBoundY;
              }
            }
          } else {
            let cropInfo = selectedRatio.cropInfo;
            _clipBound = {
              top: (cropInfo.top / props.inputResolution.height) * 100,
              bottom: (cropInfo.bottom / props.inputResolution.height) * 100,
              left: (cropInfo.left / props.inputResolution.width) * 100,
              right: (cropInfo.right / props.inputResolution.width) * 100,
            } as ICropInfo;
          }

          if (!!verticalFlip) {
            let tmp = _clipBound.top;
            _clipBound.top = _clipBound.bottom;
            _clipBound.bottom = tmp;
          }

          if (!!horizontalFlip) {
            let tmp = _clipBound.left;
            _clipBound.left = _clipBound.right;
            _clipBound.right = tmp;
          }

          initialVerticalFlip.current = results.verticalFlip;
          initialHoritontalFlip.current = results.horizontalFlip;
          setIsCropping(true);
          setSelectedRatio(selectedRatio);
          setCurClipBound(_clipBound);
        }
      );
    },
    [props.inputResolution]
  );

  const endCrop = useCallback(() => {
    console.log("endCrop");
    setIsCropping(false);
  }, []);

  const applyCrop = useCallback(() => {
    parallel<IWidthHeight | boolean | undefined>(
      {
        resetPreview: (callback) => {
          obsHandler.display.setPreviewCrop(0).then(() => {
            callback(null);
          });
        },
        inputResolution: (callback) => {
          obsHandler.camera.getCamInputResolution(0).then((res) => {
            callback(null, res);
          });
        },
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
      },
      (err, results) => {
        if (!_.isNil(err)) {
          return;
        }
        let inputResolution = _.get(results, "inputResolution");
        if (_.isNil(inputResolution)) {
          console.error("Wrong inputResolution type", inputResolution);
          return;
        }
        let _inputResolution = inputResolution as IWidthHeight;
        let verticalFlip = _.get(results, "verticalFlip", false);
        let horizontalFlip = _.get(results, "horizontalFlip", false);

        let cropInfo = {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        } as ICropInfo;
        //const { curClipBound } = this.state;
        if (!!verticalFlip) {
          let tmp = curClipBound.top;
          curClipBound.top = curClipBound.bottom;
          curClipBound.bottom = tmp;
        }

        if (!!horizontalFlip) {
          let tmp = curClipBound.left;
          curClipBound.left = curClipBound.right;
          curClipBound.right = tmp;
        }

        let croppedOurputResolution = {
          width: _inputResolution.width - cropInfo.left - cropInfo.right,
          height: _inputResolution.height - cropInfo.top - cropInfo.bottom,
        };
        cropInfo.top += _.round(
          (curClipBound.top / 100) * croppedOurputResolution.height
        );
        cropInfo.left += _.round(
          (curClipBound.left / 100) * croppedOurputResolution.width
        );
        cropInfo.bottom += _.round(
          (curClipBound.bottom / 100) * croppedOurputResolution.height
        );
        cropInfo.right += _.round(
          (curClipBound.right / 100) * croppedOurputResolution.width
        );

        console.log("applyCrop", cropInfo);
        cropEvent.emit(CropEvents.UpdateCropInfo, cropInfo);
      }
    );
  }, [curClipBound]);

  const previewCrop = useCallback(
    (enable: boolean) => {
      if (enable) {
        parallel<IWidthHeight | boolean | undefined>(
          {
            inputResolution: (callback) => {
              obsHandler.camera.getCamInputResolution(0).then((res) => {
                callback(null, res);
              });
            },
          },
          (err, results) => {
            if (!_.isNil(err)) {
              return;
            }
            let inputResolution = _.get(results, "inputResolution");
            if (_.isNil(inputResolution)) {
              console.error("Wrong inputResolution type", inputResolution);
              return;
            }
            let _inputResolution = inputResolution as IWidthHeight;

            let cropInfo = {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            } as ICropInfo;

            let croppedOurputResolution = {
              width: _inputResolution.width - cropInfo.left - cropInfo.right,
              height: _inputResolution.height - cropInfo.top - cropInfo.bottom,
            };
            cropInfo.top += _.round(
              (curClipBound.top / 100) * croppedOurputResolution.height
            );
            cropInfo.left += _.round(
              (curClipBound.left / 100) * croppedOurputResolution.width
            );
            cropInfo.bottom += _.round(
              (curClipBound.bottom / 100) * croppedOurputResolution.height
            );
            cropInfo.right += _.round(
              (curClipBound.right / 100) * croppedOurputResolution.width
            );

            console.log("previewCrop", cropInfo);
            obsHandler.display.setPreviewCrop(0, cropInfo).then((res) => {});
          }
        );
      } else {
        obsHandler.display.setPreviewCrop(0).then((res) => {});
      }
    },
    [curClipBound]
  );

  const init = useCallback(() => {
    obsHandler.camera.getCamRatioOptions(0).then((newData) => {
      let selectedRatio = _.find(newData, "isChecked");
      if (!_.isNil(selectedRatio)) {
        beginCrop(selectedRatio);
      } else {
        isInitialized.current = true;
        isInitializing.current = false;
      }
    });
  }, [beginCrop]);

  const globalMouseMove = useCallback(
    (ev: any) => {
      let mouseButton: number = mouse.buttons(ev);
      let mouseRelativeX: number = mouse.x(ev);
      let mouseRelativeY: number = mouse.y(ev);
      let element: HTMLElement = mouse.element(ev);
      let elementRect = element.getBoundingClientRect();
      let newMouseX = elementRect.x + mouseRelativeX;
      let newMouseY = elementRect.y + mouseRelativeY;

      let newCurMousePos = {
        mouseButton: mouseButton,
        x: newMouseX,
        y: newMouseY,
      };
      let newIsMouseDown = isMouseDown.current && mouseButton !== 0;

      let clipCanvasCurrent = clipCanvasRef.current;
      if (!_.isNil(clipCanvasCurrent) && newIsMouseDown) {
        let canvasRect = clipCanvasCurrent.getBoundingClientRect();
        let mouseDeltaX =
          ((newMouseX - curMousePos.current.x) * 100) / canvasRect.width;
        let mouseDeltaY =
          ((newMouseY - curMousePos.current.y) * 100) / canvasRect.height;
        let curClipBoundWidth = 100 - curClipBound.right - curClipBound.left;
        let curClipBoundHeight = 100 - curClipBound.bottom - curClipBound.top;
        let newTop = curClipBound.top;
        let newLeft = curClipBound.left;
        let newBottom = curClipBound.bottom;
        let newRight = curClipBound.right;
        if (direction === Direction.move) {
          newTop += mouseDeltaY;
          newLeft += mouseDeltaX;
          newBottom -= mouseDeltaY;
          newRight -= mouseDeltaX;

          if (newTop <= 0) {
            newTop = 0;
            newBottom = 100 - curClipBoundHeight;
          } else if (newBottom <= 0) {
            newTop = 100 - curClipBoundHeight;
            newBottom = 0;
          }

          if (newLeft <= 0) {
            newLeft = 0;
            newRight = 100 - curClipBoundWidth;
          } else if (newRight <= 0) {
            newLeft = 100 - curClipBoundWidth;
            newRight = 0;
          }

          let newBound = {
            top: newTop,
            left: newLeft,
            bottom: newBottom,
            right: newRight,
          } as ICropInfo;
          if (!_.isEqual(curClipBound, newBound)) {
            setCurClipBound(newBound);
          }
        } else {
          let deltaTop = 0;
          let deltaLeft = 0;
          let deltaBottom = 0;
          let deltaRight = 0;

          let hasRatio =
            !_.isNil(selectedRatio) &&
            selectedRatio.heightRatio > 0 &&
            selectedRatio.widthRatio > 0;
          let WHRatio = 0;
          let HWRatio = 0;
          if (hasRatio && !_.isNil(selectedRatio)) {
            WHRatio = selectedRatio.widthRatio / selectedRatio.heightRatio;
            HWRatio = selectedRatio.heightRatio / selectedRatio.widthRatio;
          }
          let canvasWHRatio = canvasRect.width / canvasRect.height;
          let canvasHWRatio = canvasRect.height / canvasRect.width;

          switch (direction) {
            case Direction.t:
              deltaTop = mouseDeltaY;
              if (hasRatio) {
                deltaLeft = (mouseDeltaY * WHRatio * canvasHWRatio) / 2;
                deltaRight = deltaLeft;
              }
              break;
            case Direction.rt:
              deltaRight = -1 * mouseDeltaX;
              if (hasRatio) {
                deltaTop = -1 * mouseDeltaX * HWRatio * canvasWHRatio;
              } else {
                deltaTop = mouseDeltaY;
              }
              break;
            case Direction.r:
              deltaRight = -1 * mouseDeltaX;
              if (hasRatio) {
                deltaTop = (-1 * (mouseDeltaX * HWRatio * canvasWHRatio)) / 2;
                deltaBottom = deltaTop;
              }
              break;
            case Direction.rd:
              deltaRight = -1 * mouseDeltaX;
              if (hasRatio) {
                deltaBottom = -1 * mouseDeltaX * HWRatio * canvasWHRatio;
              } else {
                deltaBottom = -1 * mouseDeltaY;
              }
              break;
            case Direction.d:
              deltaBottom = -1 * mouseDeltaY;
              if (hasRatio) {
                deltaLeft = (-1 * (mouseDeltaY * WHRatio * canvasHWRatio)) / 2;
                deltaRight = deltaLeft;
              }
              break;
            case Direction.ld:
              deltaLeft = mouseDeltaX;
              if (hasRatio) {
                deltaBottom = mouseDeltaX * HWRatio * canvasWHRatio;
              } else {
                deltaBottom = -1 * mouseDeltaY;
              }
              break;
            case Direction.l:
              deltaLeft = mouseDeltaX;
              if (hasRatio) {
                deltaTop = (mouseDeltaX * HWRatio * canvasWHRatio) / 2;
                deltaBottom = deltaTop;
              }
              break;
            case Direction.lt:
              deltaLeft = mouseDeltaX;
              if (hasRatio) {
                deltaTop = mouseDeltaX * HWRatio * canvasWHRatio;
              } else {
                deltaTop = mouseDeltaY;
              }
              break;
          }

          let scale = 1;
          if (deltaTop < 0 && newTop + deltaTop < 0) {
            scale = Math.min(scale, Math.abs(newTop / deltaTop));
          }
          if (deltaLeft < 0 && newLeft + deltaLeft < 0) {
            scale = Math.min(scale, Math.abs(newLeft / deltaLeft));
          }
          if (deltaBottom < 0 && newBottom + deltaBottom < 0) {
            scale = Math.min(scale, Math.abs(newBottom / deltaBottom));
          }
          if (deltaRight < 0 && newRight + deltaRight < 0) {
            scale = Math.min(scale, Math.abs(newRight / deltaRight));
          }

          let deltaWidth = deltaLeft + deltaRight;
          if (
            deltaWidth > 0 &&
            100 - newLeft - newRight - deltaWidth < minSize.width
          ) {
            scale = Math.min(
              scale,
              Math.abs((100 - newLeft - newRight - minSize.width) / deltaWidth)
            );
          }

          let deltaHeight = deltaTop + deltaBottom;
          if (
            deltaHeight > 0 &&
            100 - newTop - newBottom - deltaHeight < minSize.height
          ) {
            scale = Math.min(
              scale,
              Math.abs(
                (100 - newTop - newBottom - minSize.height) / deltaHeight
              )
            );
          }

          newTop += deltaTop * scale;
          newLeft += deltaLeft * scale;
          newBottom += deltaBottom * scale;
          newRight += deltaRight * scale;

          let newBound = {
            top: newTop,
            left: newLeft,
            bottom: newBottom,
            right: newRight,
          } as ICropInfo;
          if (!_.isEqual(curClipBound, newBound)) {
            setCurClipBound(newBound);
          }
        }
      }

      isMouseDown.current = newIsMouseDown;
      curMousePos.current = newCurMousePos;
    },
    [curClipBound, direction, minSize.height, minSize.width, selectedRatio]
  );

  const _sendNewClipBound = useCallback((clipBound: ICropInfo) => {
    if (!_.isEqual(prevClipBound.current, clipBound)) {
      //console.log("prevClipBound", prevClipBound.current, clipBound);
      prevClipBound.current = clipBound;
      cropUIHandler.updateClipBound.send(0, clipBound);
    }
  }, []);

  const sendNewClipBound = _.debounce(_sendNewClipBound, 10, { maxWait: 15 });

  useEffect(() => {
    if (!isInitialized.current && !isInitializing.current) {
      isInitializing.current = true;
      init();
    } else {
      setTimeout(() => {
        _sendNewClipBound(curClipBound);
      }, 0);
    }

    cropEvent.on(CropEvents.BeginCrop, beginCrop);
    cropEvent.on(CropEvents.EndCrop, endCrop);
    cropEvent.on(CropEvents.ApplyCrop, applyCrop);
    cropEvent.on(CropEvents.PreviewCrop, previewCrop);

    window.addEventListener("mousemove", globalMouseMove);

    return () => {
      cropEvent.removeListener(CropEvents.BeginCrop, beginCrop);
      cropEvent.removeListener(CropEvents.EndCrop, endCrop);
      cropEvent.removeListener(CropEvents.ApplyCrop, applyCrop);
      cropEvent.removeListener(CropEvents.PreviewCrop, previewCrop);

      window.removeEventListener("mousemove", globalMouseMove);
    };
  }, [
    props.previewSize,
    props.inputResolution,
    curClipBound,
    _sendNewClipBound,
    beginCrop,
    endCrop,
    applyCrop,
    previewCrop,
    init,
    globalMouseMove,
  ]);

  return (
    <div
      className="clip-canvas"
      ref={clipCanvasRef}
      onMouseDown={onMouseDown}
      style={{
        display: "block",
        width: `${props.previewSize.width}px`,
        height: `${props.previewSize.height}px`,
      }}
    >
      <div
        className={`clip-bound-transparent ${
          isLowResolution ? "error" : "transparent"
        }`}
        ref={clipBoundRef}
        style={{
          top: `${curClipBound.top}%`,
          left: `${curClipBound.left}%`,
          bottom: `${curClipBound.bottom}%`,
          right: `${curClipBound.right}%`,
        }}
        onMouseDown={onMouseDown}
      >
        {controlPoints.map((p) => (
          <div
            key={p + 1}
            className={`control-point control-point-${p}`}
            onMouseDown={(e) => {
              pointOnMouseDown(p, e);
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export { Crop2 };
