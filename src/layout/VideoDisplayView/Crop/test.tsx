/* import React, { Component, useEffect, useRef, useState } from "react";
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
  containerSize: IWidthHeight;
}

const Crop = (props: ICropProp) => {
  const clipCanvasRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const direction = useRef(Direction.move)

  const globalMouseMove = (ev: any) => {
    let {
      isMouseDown,
      curMousePos,
      curClipBound,
      direction,
      minSize,
      selectedRatio,
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
    });
  };

  const onMouseDown = (e: any) => {
    console.log("点击了clip");
    direction.current = Direction.move;
    setIsMouseDown(true);
  };

  const pointOnMouseDown = (_direction: Direction, e: any) => {
    e.stopPropagation();
    console.log("控制点", _direction);
    direction.current = _direction;
    setIsMouseDown(true);
  }

  useEffect(() => {}, [props.containerSize]);

  return (
    <div
      className="clip-canvas"
      ref={clipCanvasRef}
      onMouseDown={onMouseDown}
      style={{ display: this.state.isCropping ? "block" : "none" }}
    >
      <div
        className={`clip-bound ${
          this.state.isLowResolution ? "error" : "normal"
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
              pointOnMouseDown(p, e);
            }}
          ></div>
        ))}
        <div className="multiple">
          <i className="icon-ic_zoomrate"></i>
          <span>{zoomRate} %</span>
        </div>
      </div>
    </div>
  );
};

export default Crop;
 */

const Crop2 = () => {

}

export default Crop2;