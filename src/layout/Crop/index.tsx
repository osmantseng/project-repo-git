import React, { Component } from 'react'
import '../../styles/crop.css'
import {cropEvent, CropEvents} from '../../helpers/util/crop'
import _ from 'lodash';
import { IRatioOptionUI } from "../../global";
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
// 当前裁剪区域大小
interface CropInfo {
    w: number | undefined;
    h: number | undefined;
}
export default class Crop extends Component {
    // 获取当前裁剪区域元素
    cropArea: React.RefObject<HTMLDivElement> = React.createRef();
    state = {
        // 是否显示裁剪框
        isShowCrop: false,
        // 是否移动裁剪框
        clipOnMove: false,
        // 当前裁剪框左上角坐标
        curClipPos: { x: 0, y: 0 },
        // 当前鼠标坐标
        curMousePos: { x: 0, y: 0 },
        // 裁剪框需要移动的x,y
        clipMoved: { x: 0, y: 0 },
        // 当前裁剪框大小
        clipRect: { w: 640, h: 360 },
        direction: "",
        // 当前等比例调整的宽高比
        ratioValue: {w: 16, h: 9},
        // 最小裁剪框的大小
        minRect: { w: 320, h: 180 }
    }

    cropInfo: CropInfo = {
        w: 0,
        h: 0
    }
    controlPoints = ["t", "d", "l", "r", "lt", "rt", "ld", "rd"]

    cropEvent = (selectedRatio: IRatioOptionUI) => {
        let rect: {w: number, h: number};
        // ICropOptionUI有name可供識別
        switch (selectedRatio.widthRatio) {
            case 16:
                rect = { w: 640, h: 360 }
                break;
            case 9:
                rect = { w: 360, h: 640 }
                break;
            case 4: 
                rect = { w: 400, h: 300 }
                break;
            case 3: 
                rect = { w: 300, h: 400 }
                break;
            default:
                rect = { w: 400, h: 400 }
                break;
        }
        let minRect = {w: rect.w / 2, h: rect.h / 2};
        this.setState({
            isShowCrop: true,
            ratioValue: {w: selectedRatio.widthRatio, h: selectedRatio.heightRatio},
            clipRect: rect,
            minRect: minRect
        });
    }

    /* notControlMenuEvent = (currentMenu: any) => {
        this.setState({
            isShowCrop: currentMenu
        });
    } */

    componentDidMount = () => {
        cropEvent.on(CropEvents.Crop, this.cropEvent);
        //cropEvent.on(CropEvents.NotControlMenu, this.notControlMenuEvent);
    }
    componentDidUpdate = () => {
        // 获取当前整个裁剪区域的宽高
        if (this.cropInfo.w !== this.cropArea.current?.offsetWidth || this.cropInfo.h !== this.cropArea.current?.offsetHeight) {
            this.cropInfo = {
                w: this.cropArea.current?.offsetWidth,
                h: this.cropArea.current?.offsetHeight
            }
        }
    }
    componentWillUnmount = () => {
        // 不要直接用removeAllListeners，這會把cropEvent其他的listener也一起移除
        cropEvent.removeListener(CropEvents.Crop, this.cropEvent);
        //cropEvent.removeListener(CropEvents.NotControlMenu, this.notControlMenuEvent);
        //cropEvent.removeAllListeners();
        this.setState({
            isShowCrop: false
        })
    }
    pointOnMouseDown = (dir: string, e: any) => {
        e.stopPropagation();
        console.log("控制点", dir);
        this.setState({
            clipOnMove: true,
            direction: dir,
            curMousePos: {
                x: e.clientX,
                y: e.clientY
            }
        });
        console.log('dir', dir, e.clientX, e.clientY);

    }

    onMouseDown = (e: any) => {
        console.log("点击了clip");
        this.setState({
            curClipPos: {
                x: e.target.offsetLeft,
                y: e.target.offsetTop
            },
            curMousePos: {
                x: e.clientX,
                y: e.clientY
            },
            clipOnMove: true,
            direction: "move"
        });
        console.log('clip', e.target.offsetLeft, e.target.offsetTop);
        console.log('mouse', e.clientX, e.clientY);

    }
    onMouseUp = (e: any) => {
        console.log('释放clip');
        console.log('鼠标抬起时：' + e.clientX, e.clientY);
        this.setState({
            clipOnMove: false
        });
    }
    onMouseMove = (e: any) => {
        if (!this.state.clipOnMove) return;
        let offsetX, offsetY;
        // 判断当前是否为free cropping
        let hasRatio = _.isEmpty(this.state.ratioValue);
        switch (this.state.direction) {
            case Direction.move:
                offsetX = this.state.curMousePos.x - this.state.curClipPos.x;
                offsetY = this.state.curMousePos.y - this.state.curClipPos.y;
                // 如果超出框选画面范围，则不移动
                if ((this.cropInfo.h && (e.clientY - offsetY + this.state.clipRect.h) > this.cropInfo.h)
                    || (this.cropInfo.w && (e.clientX - offsetX + this.state.clipRect.w) > this.cropInfo.w)
                    || offsetY > e.clientY
                    || offsetX > e.clientX
                ) {
                    return;
                }
                this.setState({
                    clipMoved: {
                        x: e.clientX - offsetX,
                        y: e.clientY - offsetY
                    }
                });
                break;
            case Direction.t:
                offsetY = e.clientY - this.state.curMousePos.y;
                this.setState({
                    clipRect: {
                        w: hasRatio ? this.state.clipRect.w : (this.state.clipRect.h - offsetY) * (this.state.ratioValue.w / this.state.ratioValue.h),
                        h: this.state.clipRect.h - offsetY
                    },
                    clipMoved: {
                        x: this.state.clipMoved.x,
                        y: this.state.clipMoved.y + offsetY
                    },
                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                break;
            case Direction.d:
                offsetY = e.clientY - this.state.curMousePos.y;
                this.setState({
                    clipRect: {
                        w: hasRatio ? this.state.clipRect.w : (this.state.clipRect.h + offsetY) * (this.state.ratioValue.w / this.state.ratioValue.h),
                        h: this.state.clipRect.h + offsetY
                    },
                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });

                break;
            case Direction.l:
                offsetX = e.clientX - this.state.curMousePos.x;
                this.setState({
                    clipRect: {
                        w: this.state.clipRect.w - offsetX,
                        h: hasRatio ? this.state.clipRect.h : (this.state.clipRect.w - offsetX) * (this.state.ratioValue.h / this.state.ratioValue.w)
                    },
                    clipMoved: {
                        x: this.state.clipMoved.x + offsetX,
                        y: this.state.clipMoved.y
                    },
                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                break;
            case Direction.r:
                offsetX = e.clientX - this.state.curMousePos.x;
                this.setState({
                    clipRect: {
                        w: this.state.clipRect.w + offsetX,
                        h: hasRatio ? this.state.clipRect.h : (this.state.clipRect.w + offsetX) * (this.state.ratioValue.h / this.state.ratioValue.w)
                    },
                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                break;
            case Direction.lt:
                offsetX = e.clientX - this.state.curMousePos.x;
                offsetY = e.clientY - this.state.curMousePos.y;
                this.setState({
                    clipRect: {
                        w: hasRatio ? this.state.clipRect.w - offsetX : (this.state.clipRect.h - offsetY) * (this.state.ratioValue.w / this.state.ratioValue.h),
                        h: this.state.clipRect.h - offsetY},
                    clipMoved: {
                        x: hasRatio ? this.state.clipMoved.x + offsetX : (this.state.clipMoved.x + (offsetY * (this.state.ratioValue.w / this.state.ratioValue.h))),
                        y: this.state.clipMoved.y + offsetY
                    },
                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                break;
            case Direction.rt:
                offsetX = e.clientX - this.state.curMousePos.x;
                offsetY = e.clientY - this.state.curMousePos.y;
                this.setState({
                    clipRect: {
                        w: hasRatio ? this.state.clipRect.w + offsetX : (this.state.clipRect.h - offsetY) * (this.state.ratioValue.w / this.state.ratioValue.h),
                        h: this.state.clipRect.h - offsetY
                    },
                    clipMoved: {
                        x: this.state.clipMoved.x,
                        y: this.state.clipMoved.y + offsetY
                    },
                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                break;
            case Direction.ld:
                offsetX = e.clientX - this.state.curMousePos.x;
                offsetY = e.clientY - this.state.curMousePos.y;
                this.setState({
                    clipRect: {
                        w: hasRatio ? this.state.clipRect.w - offsetX : (this.state.clipRect.h + offsetY) * (this.state.ratioValue.w / this.state.ratioValue.h),
                        h: this.state.clipRect.h + offsetY
                     },
                    clipMoved: {
                        x: hasRatio ? this.state.clipMoved.x + offsetX : (this.state.clipMoved.x - (offsetY * (this.state.ratioValue.w / this.state.ratioValue.h))),
                        y: this.state.clipMoved.y
                    },
                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                break;
            case Direction.rd:
                offsetX = e.clientX - this.state.curMousePos.x;
                offsetY = e.clientY - this.state.curMousePos.y;
                this.setState({
                    clipRect: {
                        w: hasRatio ? this.state.clipRect.w + offsetX : (this.state.clipRect.h + offsetY) * (this.state.ratioValue.w / this.state.ratioValue.h),
                        h: this.state.clipRect.h + offsetY
                    },

                    curMousePos: {
                        x: e.clientX,
                        y: e.clientY
                    }
                });
                break;

            default:
                break;
        }
    }
    onMouseLeave = (e: any) => {
        if (e.clientX > e.target.offsetWidth || e.clientY > e.target.offsetHeight) {
            console.log("离开当前裁剪框");
            this.setState({
                clipOnMove: false
            })
        }
    }
    render() {
        return (
            this.state.isShowCrop &&
            <div className="clip-canvas" ref={this.cropArea}
                onMouseMove={(e) => {
                    this.onMouseMove(e);
                }}
                onMouseLeave={
                    (e) => {
                        this.onMouseLeave(e)
                    }
                }
                onMouseUp={
                    () => {
                        this.setState({
                            clipOnMove: false
                        })
                    }
                }
            >
                <div className="clip-bound" style={{
                    left: this.state.clipMoved.x,
                    top: this.state.clipMoved.y,
                    width: `${this.state.clipRect.w}px`,
                    height: `${this.state.clipRect.h}px`,
                    minHeight: `${this.state.minRect.h}px`,
                    minWidth: `${this.state.minRect.w}px`,
                }}
                    onMouseUp={(e) => {
                        this.onMouseUp(e);
                    }}
                    onMouseDown={(e) => {
                        this.onMouseDown(e);
                    }}>
                    {
                        this.controlPoints.map(p => (
                            <div key={p + 1}
                                className={`control-point control-point-${p}`}
                                onMouseDown={(e) => {
                                    this.pointOnMouseDown(p, e);
                                }}
                                onMouseUp={(e) => {
                                    this.onMouseUp(e);
                                }}
                            ></div>
                        ))
                    }
                </div>
            </div>
        )
    }
}
