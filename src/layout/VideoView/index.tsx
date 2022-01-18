import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import _, { Dictionary } from "lodash";
import { IDeviceOptionUI, IWidthHeight } from "../../global";
import { makeStyles } from "@material-ui/styles";
import { auto } from "async";
import {
  IMenuAreaEvent,
  konnectUIEvent,
  KonnectUIEvents,
} from "../../helpers/util/uiEvent";
import { MenuNameEnum } from "../../helpers/enum/menu-name.enum";
import NoCameraPage from "../../components/NoCameraPage";
import PreviewDisplay from "./PreviewDisplay";
import { dialog } from "electron";

const { obsHandler } = window;

const useStyles = makeStyles({
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
  absolute: {
    position: "absolute",
  },
  padding: {
    padding: "4em 1em",
  },
  hide: {
    display: "none",
  },
});

const VideoView = () => {
  const classes = useStyles();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isInitializing = useRef(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [hasCams, setHasCams] = useState(false);
  const useMaxHeight = useRef(false);

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

  const [menuAreaState, setMenuAreaState] = useState({
    menu: MenuNameEnum.device,
    isSwitched: false,
    isFold: false,
    isTransitioning: false,
  } as IMenuAreaEvent);
  const [showPadding, setShowPadding] = useState(false);

  const innerFit = useCallback(
    (
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
        useMaxHeight =
          inBox.width / inBox.height <= outBox.width / outBox.height;
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
    },
    []
  );

  const updateVideoSize = useCallback(() => {
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

    let containerRect = containerRef.current.getBoundingClientRect();
    let newContainerSize = {
      width: containerRect.width,
      height: containerRect.height,
    } as IWidthHeight;

    /* console.log(
      "VideoView",
      "newContainerSize",
      newContainerSize,
      containerSize
    ); */
    if (!_.isEqual(newContainerSize, containerSize)) {
      setContainerSize(newContainerSize);
    }

    let newVideoSize = innerFit(newContainerSize, outputResolution.current);
    useMaxHeight.current = newVideoSize.useMaxHeight;

    if (!_.isEqual(newVideoSize.box, videoSize)) {
      //console.log("VideoView", "newVideoSize", newVideoSize.box, videoSize);
      setVideoSize(newVideoSize.box);
    }
  }, [containerSize, videoSize, innerFit]);

  const initVideo = useCallback(() => {
    if (isVideoLoaded || isInitializing.current) {
      return;
    }
    isInitializing.current = true;
    auto<
      {
        virtualCamDevice?: MediaDeviceInfo;
        videoStream?: MediaStream;
        camData: IDeviceOptionUI[];
        outputResolution: IWidthHeight;
      },
      Error
    >(
      {
        virtualCamDevice: (callback: Function) => {
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
        videoStream: [
          "virtualCamDevice",
          (results, callback: Function) => {
            if (_.isNil(results.virtualCamDevice)) {
              callback(null, false);
            } else {
              navigator.mediaDevices
                .getUserMedia({
                  video: {
                    deviceId: { exact: results.virtualCamDevice.deviceId },
                  },
                })
                .then((stream) => {
                  callback(null, stream);
                })
                .catch((err) => {
                  callback(err);
                });
            }
          },
        ],
        camData: (callback: Function) => {
          obsHandler.camera.getCamDeviceOptions(0).then((newData) => {
            callback(null, newData);
          });
        },
        outputResolution: (callback: Function) => {
          obsHandler.backend.getOBSOutputResolution().then((resolution) => {
            callback(null, resolution);
          });
        },
      },
      (err, result) => {
        setIsVideoLoaded(true);
        isInitializing.current = false;
        if (!_.isNil(err) || _.isNil(result)) {
          console.warn("Cannot start video stream:", err, result);
          //window.alert(`Cannot start video stream: ${err}`);
          setShowVideo(false);
        } else {
          setHasCams(result.camData.length > 0);

          outputResolution.current = result.outputResolution;
          updateVideoSize();

          if (!_.isNil(videoRef.current) && !_.isNil(result.videoStream)) {
            videoRef.current.srcObject = result.videoStream;
            videoRef.current.play();
            //setShowVideo(true);
          } else {
            //setShowVideo(false);
          }
          setShowVideo(true);
          //window.alert(`setIsVideoLoaded(true) ${result.camData.length > 0}`);
        }
        
      }
    );
  }, [updateVideoSize]);

  const menuAreaChanged = useCallback(
    (menuAreaEvent: IMenuAreaEvent) => {
      console.log("menuAreaChanged", menuAreaEvent);
      if (!_.isEqual(menuAreaEvent, menuAreaState)) {
        setMenuAreaState(menuAreaEvent);
        let newShowPadding =
          menuAreaEvent.menu === MenuNameEnum.ratio && !menuAreaEvent.isFold;

        if (menuAreaState.menu === MenuNameEnum.ratio) {
          if (menuAreaEvent.menu !== MenuNameEnum.ratio) {
            obsHandler.display.endDisplay(0);
          } else if (menuAreaEvent.isFold && menuAreaEvent.isTransitioning) {
            obsHandler.display.hideDisplay(0, true);
          }
        }

        setShowPadding(newShowPadding);
        if (menuAreaEvent.isTransitioning) {
        } else {
          updateVideoSize();
        }
      }
    },
    [menuAreaState, updateVideoSize]
  );

  const updateOutputResolution = useCallback(
    (newOutputResolution: IWidthHeight) => {
      if (
        newOutputResolution.height !== outputResolution.current.height ||
        newOutputResolution.width !== outputResolution.current.width
      ) {
        console.log("output size changed", newOutputResolution);
        outputResolution.current = newOutputResolution;
      }
      updateVideoSize();
    },
    [updateVideoSize]
  );

  const disable = useCallback(() => {
    obsHandler.display.endDisplay(0);
    setHasCams(false);
    setShowVideo(false);
    outputResolution.current = {
      width: 0,
      height: 0,
    } as IWidthHeight;
    setVideoSize({
      width: 0,
      height: 0,
    } as IWidthHeight);
  }, []);

  const updateHasCams = useCallback(
    (newHasCams: boolean) => {
      if (newHasCams === hasCams) {
        return;
      }

      if (!isVideoLoaded) {
        initVideo();
        return;
      }

      if (newHasCams) {
        obsHandler.backend.getOBSOutputResolution().then((resolution) => {
          setHasCams(true);
          updateOutputResolution(resolution);
        });
      } else {
        disable();
      }
    },
    [hasCams, isVideoLoaded, initVideo, disable, updateOutputResolution]
  );

  const getVideoStyle = () => {
    //let isPreviewing = showPadding && !menuAreaState.isTransitioning;

    if (!isVideoLoaded /* || !showVideo */) {
      return { display: "none" } as CSSProperties;
    } /* else if (isPreviewing) {
      return { display: "none" } as CSSProperties;
    } */ else if (videoSize.width * videoSize.height <= 0) {
      return { display: "none" } as CSSProperties;
    }

    let style = {
      aspectRatio: `${videoSize.width / videoSize.height}`,
      objectFit: "fill",
      opacity: 1,
      transition: "unset",
      //outline: "5px solid red",
    } as CSSProperties;

    if (menuAreaState.isTransitioning) {
      if (menuAreaState.isFold) {
        if (menuAreaState.menu === MenuNameEnum.ratio) {
          style.opacity = 1;
        }
        style.width = `${videoSize.width}px`;
        style.height = `${videoSize.height}px`;
      } else {
        if (menuAreaState.menu === MenuNameEnum.ratio) {
          style.opacity = 0;
          style.transition = "opacity 0.3s ease 0s";
        }
        style.width = "100%";
        style.maxWidth = `${videoSize.width}px`;
        style.maxHeight = `${videoSize.height}px`;
      }
    } else {
      if (menuAreaState.menu === MenuNameEnum.ratio) {
        if (menuAreaState.isFold) {
          style.opacity = 1;
          style.transition = "opacity 0.3s ease 0s";
        } else {
          style.opacity = 1;
          //style.transition = "opacity 0.3s ease 0s";
        }
      }
      style.width = `${videoSize.width}px`;
      style.height = `${videoSize.height}px`;
      style.maxWidth = "100%";
      style.maxHeight = "100%";
    }

    return style;
  };

  const hideDisplay = useCallback(() => {
    if (
      !menuAreaState.isFold &&
      menuAreaState.menu === MenuNameEnum.ratio &&
      !menuAreaState.isTransitioning
    ) {
      obsHandler.display.hideDisplay(0);
    }
  }, [menuAreaState]);

  useEffect(() => {
    let uiListeners: Dictionary<(...args: any[]) => void> = {
      [KonnectUIEvents.MenuAreaChanged]: menuAreaChanged,
      [KonnectUIEvents.SetHasCams]: updateHasCams,
      [KonnectUIEvents.PresetDialogOpen]: hideDisplay,
      //[KonnectUIEvents.PresetDialogClose]: showDisplay
    };

    _.forEach(uiListeners, (func, event) => {
      konnectUIEvent.on(event, func);
    });

    let rmUIResizeListenerFunc = obsHandler.ui.m2rUIResize(updateVideoSize);
    let rmResolutionListenerFunc =
      obsHandler.notification.updateOBSOutputResolution(updateOutputResolution);

    if (!isInitializing.current) {
      if (!isVideoLoaded) {
        obsHandler.virtualCam.startVirtualCam();
        initVideo();
      } else {
        if (!menuAreaState.isTransitioning && !_.isNil(containerRef.current)) {
          setTimeout(() => {
            updateVideoSize();
          }, 0);
        }
      }
    }

    return () => {
      _.forEach(uiListeners, (func, event) => {
        konnectUIEvent.removeListener(event, func);
      });
      rmUIResizeListenerFunc();
      rmResolutionListenerFunc();
    };
  }, [
    hasCams,
    isVideoLoaded,
    showVideo,
    containerSize,
    videoSize,
    menuAreaState,
    showPadding,
    initVideo,
    updateHasCams,
    menuAreaChanged,
    updateVideoSize,
  ]);

  return (
    <div
      className={`${classes.root} ${
        showPadding && hasCams ? classes.padding : ""
      }`}
    >
      {isVideoLoaded && !hasCams && <NoCameraPage />}
      <div className={classes.container} ref={containerRef}>
        <video
          className={classes.absolute}
          style={getVideoStyle()}
          ref={videoRef}
        ></video>
        {showPadding && hasCams && !menuAreaState.isTransitioning && (
          <PreviewDisplay containerSize={containerSize} />
        )}
      </div>
    </div>
  );
};

export default VideoView;
