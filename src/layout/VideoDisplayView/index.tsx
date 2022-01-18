import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { MenuNameEnum } from "../../helpers/enum/menu-name.enum";
import { makeStyles } from "@material-ui/styles";
import { konnectUIEvent, KonnectUIEvents } from "../../helpers/util/uiEvent";
import NoCameraPage from "../../components/NoCameraPage";
import { waterfall } from "async";
import _, { Dictionary } from "lodash";
import { IWidthHeight } from "../../global";
import Crop from "./Crop";
import PreviewDisplay from "./PreviewDisplay";
import { cropEvent, CropEvents } from "../../helpers/util/crop";

const { obsHandler } = window;

interface IVideoDisplayViewProp {
  currentMenu: MenuNameEnum;
}

const useStyled = makeStyles({
  root: {
    background: "white",
    flexGrow: 1,
  },
  container: {
    background: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  padding: {
    padding: "4em 1em",
  },
  video: {
    position: "absolute",
  },
  disable: {
    display: "none",
  },
});

const VideoDisplayView = (props: IVideoDisplayViewProp) => {
  const classes = useStyled();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStream = useRef<MediaStream>();

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  // 菜单是否收回，如果收回不展示padding
  const [menuFold, setMenuFold] = useState(false);
  const outputResolution = useRef({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const [videoSize, setVideoSize] = useState({
    width: 0,
    height: 0,
  } as IWidthHeight);

  const [hasCamera, setHasCamera] = useState(true);
  const showPadding = (value: boolean) => {
    setMenuFold(!value);
  }

  const updateVideoSize = () => {
    if (_.isNil(containerRef.current)) {
      setContainerSize({
        width: 0,
        height: 0,
      } as IWidthHeight);
      setVideoSize({
        width: 0,
        height: 0,
      } as IWidthHeight);
      return;
    }

    let newContainerSize = {
      width: containerRef.current.getBoundingClientRect().width,
      height: containerRef.current.getBoundingClientRect().height,
    } as IWidthHeight;

    if (
      newContainerSize.height !== containerSize.height ||
      newContainerSize.width !== containerSize.width
    ) {
      setContainerSize(newContainerSize);
    }

    let newVideoSize = innerFit(newContainerSize, outputResolution.current);

    if (
      newVideoSize.box.height !== videoSize.height ||
      newVideoSize.box.width !== videoSize.width
    ) {
      setVideoSize(newVideoSize.box);
    }
  }

  const startStream = () => {
    if (!_.isNil(videoRef.current) && !_.isNil(videoStream.current)) {
      videoRef.current.srcObject = videoStream.current;
      videoRef.current.play();
      setShowVideo(true);
    } else {
      setShowVideo(false);
    }
  };

  const initVideo = () => {
    waterfall(
      [
        (callback: Function) => {
          navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
              let device = _.find(devices, {
                kind: "videoinput",
                label: obsHandler.virtualCam.virtualCamName,
              });
              if (_.isNil(device)) {
                callback(
                  `Cannot find virtualCam: ${obsHandler.virtualCam.virtualCamName}`
                );
              } else {
                callback(null, device);
              }
            })
            .catch((err) => {
              callback(err);
            });
        },
        (device: MediaDeviceInfo, callback: Function) => {
          navigator.mediaDevices
            .getUserMedia({
              video: {
                deviceId: { exact: device.deviceId },
              },
            })
            .then((stream) => {
              videoStream.current = stream;
              callback(null);
            })
            .catch((err) => {
              callback(err);
            });
        },
        (callback: Function) => {
          obsHandler.backend
            .getOBSOutputResolution()
            .then((newOutputResolution) => {
              outputResolution.current = newOutputResolution;
              callback(null);
            });
        },
      ],
      (err) => {
        setIsVideoLoaded(true);
        if (!_.isNil(err)) {
          console.warn("Cannot start video stream:", err);
          setShowVideo(false);
        } else {
          updateVideoSize();
          startStream();
        }
      }
    );
  };

  const innerFit = (
    outBox: IWidthHeight,
    inBox: IWidthHeight
  ): { useMaxHeight: boolean; box: IWidthHeight } => {
    if (
      outBox.height <= 0 ||
      outBox.width <= 0 ||
      inBox.height <= 0 ||
      inBox.width <= 0
    ) {
      return {
        useMaxHeight: false,
        box: {
          width: 0,
          height: 0,
        } as IWidthHeight,
      };
    }

    let useMaxHeight = false;

    if (inBox.height >= inBox.width) {
      // 直式
      // 判斷inBox高度和outBox相同時，寬度是否會超過outBox寬度
      useMaxHeight = inBox.width / inBox.height <= outBox.width / outBox.height;
    } else {
      // 橫式
      // 判斷inBox寬度和outBox相同時，高度是否會超過outBox高度
      let useMaxWidth =
        inBox.height / inBox.width <= outBox.height / outBox.width;
      useMaxHeight = !useMaxWidth;
    }

    let box = {
      width: outBox.width,
      height: outBox.height,
    };

    if (useMaxHeight) {
      box.width = (outBox.height / inBox.height) * inBox.width;
    } else {
      box.height = (outBox.width / inBox.width) * inBox.height;
    }

    return {
      useMaxHeight: useMaxHeight,
      box: box,
    };
  };

  const getVideoStyle = () => {
    if (!isVideoLoaded || !showVideo) {
      return { display: "none" } as CSSProperties;
    } else if (props.currentMenu === MenuNameEnum.ratio && isCropping) {
      return { display: "none" } as CSSProperties;
    } else if (videoSize.width * videoSize.height <= 0) {
      return { display: "none" } as CSSProperties;
    }

    let style = {
      //position: "absolute",
      aspectRatio: `${videoSize.width / videoSize.height}`,
      objectFit: "fill",
      width: `${videoSize.width}px`,
      height: `${videoSize.height}px`,
    } as CSSProperties;

    return style;
  };

  const getDisplayStyle = () => {
    if (!isVideoLoaded || !showVideo) {
      return { display: "none" } as CSSProperties;
    } else if (videoSize.width * videoSize.height <= 0) {
      return { display: "none" } as CSSProperties;
    }

    let style = {
      position: "absolute",
      aspectRatio: `${videoSize.width / videoSize.height}`,
      width: `${videoSize.width}px`,
      height: `${videoSize.height}px`,
    } as CSSProperties;

    return style;
  };

  const getCropStyle = () => {
    if (!isVideoLoaded || !showVideo) {
      return { display: "none" } as CSSProperties;
    } else if (videoSize.width * videoSize.height <= 0) {
      return { display: "none" } as CSSProperties;
    }

    let style = {
      position: "absolute",
      aspectRatio: `${videoSize.width / videoSize.height}`,
      width: `${videoSize.width}px`,
      height: `${videoSize.height}px`,
    } as CSSProperties;

    return style;
  };

  const updateOutputResolution = (newOutputResolution: IWidthHeight) => {
    if (
      newOutputResolution.height !== outputResolution.current.height ||
      newOutputResolution.width !== outputResolution.current.width
    ) {
      console.log("output size changed", newOutputResolution);
      outputResolution.current = newOutputResolution;
    }
    updateVideoSize();
  };

  const getCurrentOutputResolution = () => {
    obsHandler.backend.getOBSOutputResolution().then(updateOutputResolution);
  };

  const beginCrop = () => {
    console.log("VideoDisplay2", "beginCrop");
    setIsCropping(true);
  };

  const endCrop = () => {
    console.log("VideoDisplay2", "endCrop");
    obsHandler.display.hideDisplay(0);
    
    setIsCropping(false);
  };

  const applyCrop = () => {
    console.log("VideoDisplay2", "applyCrop");
    obsHandler.display.hideDisplay(0);
    setIsCropping(false);
  };

  const test = (value: MenuNameEnum) => {
    console.log(KonnectUIEvents.Switch2Menu, value);
    if (value !== MenuNameEnum.ratio) {
      obsHandler.display.endDisplay(0);
    }
  };

  useEffect(() => {
    //console.log("props.currentMenu", props.currentMenu);
    
    let rmResolutionListenerFunc =
      obsHandler.notification.updateOBSOutputResolution(updateOutputResolution);
    let rmUIResizeListenerFunc = obsHandler.ui.m2rUIResize(updateVideoSize);
    // 监听output resolution改变事件获取当前的output resolution
    konnectUIEvent.on(
      KonnectUIEvents.ChangeResolution,
      getCurrentOutputResolution
    );
    konnectUIEvent.on(KonnectUIEvents.UIChanged, updateVideoSize);
    // 控制菜单展开和收回时是否显示padding
    konnectUIEvent.on(KonnectUIEvents.ShowPadding, showPadding);
    konnectUIEvent.on(KonnectUIEvents.Switch2Menu, test);
    konnectUIEvent.on(KonnectUIEvents.SetHasCams, setHasCamera);
    //cropEvent.on(CropEvents.BeginCrop, beginCrop);
    cropEvent.on(CropEvents.EndCrop, endCrop);
    cropEvent.on(CropEvents.ApplyCrop, applyCrop);
    
    if (props.currentMenu !== MenuNameEnum.ratio) {
      setIsCropping(false);
      obsHandler.display.endDisplay(0);
    } else if (!menuFold) {
      setIsCropping(true);
    }

    if (!isVideoLoaded) {
      obsHandler.virtualCam.startVirtualCam();
      initVideo();
    }

    return () => {
      if (_.isFunction(rmResolutionListenerFunc)) {
        rmResolutionListenerFunc();
      }

      if (_.isFunction(rmUIResizeListenerFunc)) {
        rmUIResizeListenerFunc();
      }

      konnectUIEvent.removeListener(
        KonnectUIEvents.ChangeResolution,
        getCurrentOutputResolution
      );
      konnectUIEvent.removeListener(KonnectUIEvents.UIChanged, updateVideoSize);
      konnectUIEvent.removeListener(KonnectUIEvents.ShowPadding, showPadding);
      konnectUIEvent.removeListener(KonnectUIEvents.Switch2Menu, test);
      //cropEvent.removeListener(CropEvents.BeginCrop, beginCrop);
      cropEvent.removeListener(CropEvents.EndCrop, endCrop);
      cropEvent.removeListener(CropEvents.ApplyCrop, applyCrop);
      konnectUIEvent.removeListener(KonnectUIEvents.SetHasCams, setHasCamera);
    };
  }, [
    props.currentMenu,
    menuFold,
    showVideo,
    isVideoLoaded,
    videoSize,
    /* initVideo,
    getCurrentOutputResolution,
    showPadding,
    updateOutputResolution,
    updateVideoSize,
    beginCrop,
    endCrop,
    applyCrop,
    test */
  ]);

  return (
    <div
      className={`${classes.root} ${
        props.currentMenu === MenuNameEnum.ratio &&
        !menuFold &&
        hasCamera
          ? classes.padding
          : ""
      }`}
    >
      {window.globalDisabled && <NoCameraPage />}
      <div
        className={window.globalDisabled ? classes.disable : classes.container}
        ref={containerRef}
      >
        <video style={getVideoStyle()} ref={videoRef}></video>
        {isCropping && (
          <div style={getDisplayStyle()}>
            <PreviewDisplay containerSize={containerSize} />
          </div>
        )}
        <div style={getCropStyle()}>
          <Crop outputResolution={outputResolution.current} />
        </div>
      </div>
    </div>
  );
};

export default VideoDisplayView;
