import React, { Component } from "react";
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
import { parallel } from "async";
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

interface ICropProp {
  outputResolution: IWidthHeight;
}
interface ICropState {
  isCropping: boolean;
  isMouseDown: boolean;
  direction: Direction;
  selectedRatio: IRatioOptionUI | undefined;
  curMousePos: {
    mouseButton: number;
    x: number;
    y: number;
  };
  curClipBound: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
  minSize: {
    width: number;
    height: number;
  };
  zoomRate: number;
  isLowResolution: boolean;
  initialResolution: {
    width: number;
    height: number;
  };
  initialVerticalFlip: boolean;
  initialHoritontalFlip: boolean;
}

export default class Crop extends Component<ICropProp, ICropState> {
  clipCanvasRef = React.createRef<HTMLDivElement>();
  clipBoundRef = React.createRef<HTMLDivElement>();
  controlPoints = ["t", "d", "l", "r", "lt", "rt", "ld", "rd"] as Direction[];
  constructor(props: ICropProp) {
    super(props);
    this.state = {
      isCropping: false,
      isMouseDown: false,
      direction: Direction.move,
      selectedRatio: undefined,
      curMousePos: {
        mouseButton: 0,
        x: 0,
        y: 0,
      },
      curClipBound: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      },
      minSize: {
        width: 10,
        height: 10,
      },
      // Zoom Rate
      zoomRate: 0,
      isLowResolution: false,
      // 初始resolution
      initialResolution: {
        width: 0,
        height: 0,
      },
      initialVerticalFlip: false,
      initialHoritontalFlip: false,
    };
  }

  globalMouseMove = (ev: any) => {
    let {
      isMouseDown,
      curMousePos,
      curClipBound,
      direction,
      minSize,
      selectedRatio,
      //ratioValue,
    } = this.state;

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
    let newIsMouseDown = isMouseDown && mouseButton !== 0;
    //let elementClassName = element.className;
    /* let isMouseInClipRange =
      _.includes(elementClassName, "clip-") ||
      _.includes(elementClassName, "control-point"); */
    //let isMouseDownOutsideWindow = newIsMouseDown && element.tagName === "HTML";

    let clipCanvasCurrent = this.clipCanvasRef.current;
    if (!_.isNil(clipCanvasCurrent) && newIsMouseDown) {
      let canvasRect = clipCanvasCurrent.getBoundingClientRect();
      let mouseDeltaX = ((newMouseX - curMousePos.x) * 100) / canvasRect.width;
      let mouseDeltaY = ((newMouseY - curMousePos.y) * 100) / canvasRect.height;
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

        curClipBound = {
          top: newTop,
          left: newLeft,
          bottom: newBottom,
          right: newRight,
        };
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
            Math.abs((100 - newTop - newBottom - minSize.height) / deltaHeight)
          );
        }

        newTop += deltaTop * scale;
        newLeft += deltaLeft * scale;
        newBottom += deltaBottom * scale;
        newRight += deltaRight * scale;

        curClipBound = {
          top: newTop,
          left: newLeft,
          bottom: newBottom,
          right: newRight,
        };
      }
    }
    this.setState({
      isMouseDown: newIsMouseDown,
      curMousePos: newCurMousePos,
      curClipBound: curClipBound,
      // 获取鼠标进行移动或者拖拽操作时，重新计算zoom rate
      /* zoomRate: Math.round(
        this.computeZoomRate(
          curClipBound,
          clipCanvasCurrent,
          this.state.initialResolution
        )
      ), */
    });
  };

  pointOnMouseDown = (direction: Direction, e: any) => {
    e.stopPropagation();
    console.log("控制点", direction);
    this.setState({
      isMouseDown: true,
      direction: direction,
    });
  };

  onMouseDown = (e: any) => {
    console.log("点击了clip");
    this.setState({
      isMouseDown: true,
      direction: Direction.move,
    });
  };

  beginCrop2 = (selectedRatio: IRatioOptionUI) => {
    console.log("beginCrop", selectedRatio);

    parallel<IWidthHeight | boolean | undefined>(
      {
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

        let clipBound = {
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        } as ICropInfo;

        if (_.isNil(selectedRatio.cropInfo)) {
          clipBound = {
            top: 2.5,
            left: 2.5,
            bottom: 2.5,
            right: 2.5,
          } as ICropInfo;
          if (selectedRatio.heightRatio > 0 && selectedRatio.widthRatio > 0) {
            let inputAspectRatio =
              _inputResolution.width / _inputResolution.height;
            let selectedAspectRatio =
              selectedRatio.widthRatio / selectedRatio.heightRatio;
            if (selectedAspectRatio <= inputAspectRatio) {
              // clipBound max height
              let supposedClipBoundX =
                ((100 * inputAspectRatio -
                  (100 - clipBound.top - clipBound.bottom) *
                    selectedAspectRatio) /
                  (100 * inputAspectRatio) /
                  2) *
                100;
              clipBound.left = supposedClipBoundX;
              clipBound.right = supposedClipBoundX;
            } else if (selectedAspectRatio > inputAspectRatio) {
              // clipBound max width
              inputAspectRatio =
                _inputResolution.height / _inputResolution.width;
              selectedAspectRatio =
                selectedRatio.heightRatio / selectedRatio.widthRatio;
              let supposedClipBoundY =
                ((100 * inputAspectRatio -
                  (100 - clipBound.top - clipBound.bottom) *
                    selectedAspectRatio) /
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
            top: (cropInfo.top / _inputResolution.height) * 100,
            bottom: (cropInfo.bottom / _inputResolution.height) * 100,
            left: (cropInfo.left / _inputResolution.width) * 100,
            right: (cropInfo.right / _inputResolution.width) * 100,
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

        // 获取初始的resolution 计算zoom rate
        this.setState({
          zoomRate: 100,
          initialResolution: _inputResolution,
          isCropping: true,
          curClipBound: clipBound,
          selectedRatio: selectedRatio,
          initialVerticalFlip: !!verticalFlip,
          initialHoritontalFlip: !!horizontalFlip,
        });
      }
    );
  };

  endCrop = () => {
    console.log("endCrop");
    this.setState({ isCropping: false });
  };

  applyCrop = () => {
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
        const { curClipBound } = this.state;
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
  };

  previewCrop = (enable: boolean) => {
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
          const { curClipBound } = this.state;

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
  };

  componentDidMount = () => {
    cropEvent.on(CropEvents.BeginCrop, this.beginCrop2);
    cropEvent.on(CropEvents.EndCrop, this.endCrop);
    cropEvent.on(CropEvents.ApplyCrop, this.applyCrop);
    cropEvent.on(CropEvents.PreviewCrop, this.previewCrop);
    konnectUIEvent.on(KonnectUIEvents.Switch2Menu, this.endCrop);
    window.addEventListener("mousemove", this.globalMouseMove);
  };

  componentWillUnmount = () => {
    cropEvent.removeListener(CropEvents.BeginCrop, this.beginCrop2);
    cropEvent.removeListener(CropEvents.EndCrop, this.endCrop);
    cropEvent.removeListener(CropEvents.ApplyCrop, this.applyCrop);
    cropEvent.removeListener(CropEvents.PreviewCrop, this.previewCrop);
    konnectUIEvent.removeListener(KonnectUIEvents.Switch2Menu, this.endCrop);
    window.removeEventListener("mousemove", this.globalMouseMove);
  };

  shouldComponentUpdate = (nextProps: ICropProp, nextState: ICropState) => {
    let curClipBound = this.state.curClipBound;
    let nextClipBound = nextState.curClipBound;

    if (
      curClipBound.top !== nextClipBound.top ||
      curClipBound.left !== nextClipBound.left ||
      curClipBound.bottom !== nextClipBound.bottom ||
      curClipBound.right !== nextClipBound.right
    ) {
      this.sendNewClipBound(nextClipBound);
      return true;
    }

    if (
      this.props.outputResolution.height !==
        nextProps.outputResolution.height ||
      this.props.outputResolution.width !== nextProps.outputResolution.width
    ) {
      return true;
    }

    if (this.state.isCropping !== nextState.isCropping) {
      return true;
    }

    if (this.state.isMouseDown || nextState.isMouseDown) {
      if (!nextState.isMouseDown) {
        this.sendNewClipBound(nextClipBound);
      }
      return true;
    }

    return false;
  };

  sendNewClipBound = (clipBound: ICropInfo) => {
    cropUIHandler.updateClipBound.send(0, clipBound);
  };
  debounceSend = _.debounce(this.sendNewClipBound, 5, { maxWait: 15 });
  trottleSend = _.throttle(this.sendNewClipBound, 50);

  render() {
    const { curClipBound, zoomRate } = this.state;
    return (
      <div
        className="clip-canvas"
        ref={this.clipCanvasRef}
        onMouseDown={(e) => {
          this.onMouseDown(e);
        }}
        style={{ display: this.state.isCropping ? "block" : "none" }}
      >
        <div
          className={`clip-bound-transparent ${
            this.state.isLowResolution ? "error" : "transparent"
          }`}
          ref={this.clipBoundRef}
          style={{
            top: `${curClipBound.top}%`,
            left: `${curClipBound.left}%`,
            bottom: `${curClipBound.bottom}%`,
            right: `${curClipBound.right}%`,
          }}
          onMouseDown={(e) => {
            this.onMouseDown(e);
          }}
        >
          {this.controlPoints.map((p) => (
            <div
              key={p + 1}
              className={`control-point control-point-${p}`}
              onMouseDown={(e) => {
                this.pointOnMouseDown(p, e);
              }}
            ></div>
          ))}
          {/* <div className="multiple">
            <i className="icon-ic_zoomrate"></i>
            <span>{zoomRate} %</span>
          </div> */}
        </div>
      </div>
    );
  }
}
