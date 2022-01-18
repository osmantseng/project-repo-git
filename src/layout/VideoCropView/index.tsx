import React from "react";
import Crop from "./Crop";
import _, { Dictionary, find } from "lodash";
import { IDeviceOptionUI, IWidthHeight } from "../../global";
import { makeStyles } from "@material-ui/styles";
import { konnectUIEvent, KonnectUIEvents } from "../../helpers/util/uiEvent";
import NoCameraPage from "../../components/NoCameraPage";
import { MenuNameEnum } from "../../helpers/enum/menu-name.enum";

const { obsHandler } = window;

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
  video: {
    position: "absolute",
  },
  padding: {
    padding: "4em 1em",
  },
});

const VideoCropView = (props: any) => {
  const classes = useStyled();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const [videoState, setShowVideo] = React.useState({
    isLoaded: false,
    showVideo: false,
  });

  // 是否无Camera数据, true时无Camera数据不展示video
  const [noCamera, setNoCamera] = React.useState(false);
  // 菜单是否收回，如果收回不展示padding
  const [menuFlod, setMenuFold] = React.useState(false);
  const outputResolution = React.useRef({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const outputAspectRatio = React.useRef(0);
  const containerSize = React.useRef({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const useVideoMaxHeight = React.useRef(false);
  const [videoSize, setVideoSize] = React.useState({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const [outputResolutionCurrent, setOutputResolutionCurrent] = React.useState(outputResolution.current);
  const initVideo = () => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      let device = find(devices, {
        kind: "videoinput",
        label: obsHandler.virtualCam.virtualCamName,
      });

      if (device) {
        navigator.mediaDevices
          .getUserMedia({
            video: {
              deviceId: { exact: device.deviceId },
            },
          })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
              setShowVideo({
                isLoaded: true,
                showVideo: true,
              });
            } else {
              setShowVideo({
                isLoaded: true,
                showVideo: false,
              });
            }
          })
          .catch((e) => {
            console.warn(e);
            setShowVideo({
              isLoaded: true,
              showVideo: false,
            });
          });
      }
    });
  };

  const updateOutputResolution = (newOutputResolution: IWidthHeight) => {
    if (
      newOutputResolution.height !== outputResolution.current.height ||
      newOutputResolution.width !== outputResolution.current.width
    ) {
      console.log("output size changed", newOutputResolution);
      outputResolution.current = newOutputResolution;
      if(!videoState.isLoaded) {
        setOutputResolutionCurrent(newOutputResolution);
      }
      updateVideoSize();
    }
  };

  const updateVideoSize = () => {
    let containerCurrent = containerRef.current;
    if (_.isNil(containerCurrent)) {
      setVideoSize({
        width: 0,
        height: 0,
      } as IWidthHeight);
      return;
    }

    let _outputResolution = outputResolution.current;
    let _containerSize = {
      width: containerCurrent.getBoundingClientRect().width,
      height: containerCurrent.getBoundingClientRect().height,
    } as IWidthHeight;
    let _useVideoMaxHeight = checkVideoMaxHeight(
      _containerSize,
      _outputResolution
    );

    containerSize.current = _containerSize;
    useVideoMaxHeight.current = _useVideoMaxHeight;

    if (_outputResolution.width <= 0 || _outputResolution.height <= 0) {
      outputAspectRatio.current = 0;
      setVideoSize({
        width: 0,
        height: 0,
      } as IWidthHeight);
      return;
    }

    let newVideoSize = {
      width: 0,
      height: 0,
    } as IWidthHeight;
    let _outputAspectRatio = _outputResolution.width / _outputResolution.height;
    outputAspectRatio.current = _outputAspectRatio;

    if (_useVideoMaxHeight) {
      newVideoSize.width = _containerSize.height * _outputAspectRatio;
      newVideoSize.height = _containerSize.height;
    } else {
      newVideoSize.width = _containerSize.width;
      newVideoSize.height = _containerSize.width / _outputAspectRatio;
    }

    if (
      newVideoSize.height !== videoSize.height ||
      newVideoSize.width !== videoSize.width
    ) {
      console.log("video size changed", newVideoSize);
      setVideoSize(newVideoSize);
    }
  };

  const checkVideoMaxHeight = (
    _containerSize: IWidthHeight,
    _outputResolution: IWidthHeight
  ) => {
    // maxHeight=true時，把video高度設為和container相同，否則將video寬度設為和container相同
    let _useVideoMaxHeight = false;
    if (_outputResolution.height >= _outputResolution.width) {
      // 直式
      // 判斷video高度和container相同時，寬度是否會超過container寬度
      _useVideoMaxHeight =
        _outputResolution.width / _outputResolution.height <=
        _containerSize.width / _containerSize.height;
    } else {
      // 橫式
      // 判斷video寬度和container相同時，高度是否會超過container高度
      _useVideoMaxHeight =
        _outputResolution.height / _outputResolution.width >=
        _containerSize.height / _containerSize.width;
    }

    useVideoMaxHeight.current = _useVideoMaxHeight;
    return _useVideoMaxHeight;
  };

  const getVideoStyle = () => {
    if (!(videoState.isLoaded && videoState.showVideo)) {
      return { display: "none" };
    } else if (outputAspectRatio.current <= 0) {
      return { display: "none" };
    } else if (videoSize.width <= 0 || videoSize.height <= 0) {
      return { display: "none" };
    }

    let videoStyle: Dictionary<any> = {
      aspectRatio: outputAspectRatio.current.toString(),
      objectFit: "fill",
      width: `${videoSize.width}px`,
      height: `${videoSize.height}px`,
    };

    return videoStyle;
  };

  const getCropStyle = () => {
    if (!(videoState.isLoaded && videoState.showVideo)) {
      return { display: "none" };
    } else if (outputAspectRatio.current <= 0) {
      return { display: "none" };
    } else if (videoSize.width <= 0 || videoSize.height <= 0) {
      return { display: "none" };
    }

    let cropStyle: Dictionary<any> = {
      aspectRatio: outputAspectRatio.current.toString(),
      width: `${videoSize.width}px`,
      height: `${videoSize.height}px`,
    };

    return cropStyle;
  };

  const uiResize = () => {
    console.log("VideoCropView uiResize");
    updateVideoSize();
  };

  const showPadding = (value: boolean) => {
    setMenuFold(!value);
  }

  const getCurrentOutputResolution = () => {
    obsHandler.backend.getOBSOutputResolution().then(resolution => {
      if(resolution !== outputResolutionCurrent) {
        setOutputResolutionCurrent(resolution);
      }
    });
  }
  React.useEffect(() => {
    let rmResolutionListenerFunc =
      obsHandler.notification.updateOBSOutputResolution(updateOutputResolution);
      let rmUIResizeListenerFunc = obsHandler.ui.m2rUIResize(uiResize);
    // 监听output resolution改变事件获取当前的output resolution
    konnectUIEvent.on(KonnectUIEvents.ChangeResolution, getCurrentOutputResolution);
    konnectUIEvent.on(KonnectUIEvents.UIChanged, uiResize);
    // 控制菜单展开和收回时是否显示padding
    konnectUIEvent.on(KonnectUIEvents.ShowPadding, showPadding);

    if (!videoState.isLoaded) {
      obsHandler.virtualCam.startVirtualCam();
      initVideo();
      //obsHandler.virtualCam.r2mUpdateOutputResolution();
      obsHandler.backend.getOBSOutputResolution().then(updateOutputResolution);
    }

    return () => {
      if (_.isFunction(rmResolutionListenerFunc)) {
        rmResolutionListenerFunc();
      }

      if (_.isFunction(rmUIResizeListenerFunc)) {
        rmUIResizeListenerFunc();
      }

      konnectUIEvent.removeListener(KonnectUIEvents.ChangeResolution, getCurrentOutputResolution);
      konnectUIEvent.removeListener(KonnectUIEvents.UIChanged, uiResize);
      konnectUIEvent.removeListener(KonnectUIEvents.ShowPadding, showPadding);
    };
  }, [videoState, videoSize]);

  // 设置当没有Camera时，展示无Camera的提示信息内容区
  const setNoCameraPage = (data: IDeviceOptionUI[]) => {
    setNoCamera(data.length === 0);
  };
  return (
    // 在有摄像头且menu为control时才会显示padding
    <div
      className={`${classes.root} ${props.currentMenu === MenuNameEnum.ratio && !menuFlod && !window.globalDisabled ? classes.padding : ""
        }`}
    >
      {window.globalDisabled ? (
        <NoCameraPage />
      ) : (
        <div className={classes.container} ref={containerRef}>
          <video
            className={classes.video}
            style={getVideoStyle()}
            ref={videoRef}
          ></video>
          <div className={classes.video} style={getCropStyle()}>
            <Crop outputResolution={outputResolutionCurrent} />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCropView;
