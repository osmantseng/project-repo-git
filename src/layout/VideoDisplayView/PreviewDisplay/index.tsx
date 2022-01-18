import _, { Dictionary } from "lodash";
import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { IBounds, IWidthHeight } from "../../../global";
import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";

const { obsHandler } = window;

const PreviewDisplay = (props: { containerSize: IWidthHeight }) => {
  const isInitialized = useRef(false);
  const [previewSize, setPreviewSize] = useState({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const inputResolution = useRef({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const containerSize = useRef({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const isDisplayInitialized = useRef(false);

  const updateInputResolution = (newInputResolution: IWidthHeight) => {
    isInitialized.current = true;
    inputResolution.current = newInputResolution;
    updatePreviewSize();
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

  const updatePreviewSize = () => {
    let { useMaxHeight, box } = innerFit(
      containerSize.current,
      inputResolution.current
    );

    if (box.height !== previewSize.height || box.width !== previewSize.width) {
      setPreviewSize(box);
    }
  };

  const getPreviewStyle = () => {
    if (previewSize.height <= 0 || previewSize.width <= 0) {
      return { display: "none" } as CSSProperties;
    }

    return {
      width: `${previewSize.width}px`,
      height: `${previewSize.height}px`,
      background: "transparent",
    } as CSSProperties;
  };

  const getPreviewBounds = () => {
    let previewCurrent = previewRef.current;
    if (!_.isNil(previewCurrent)) {
      let rect = previewCurrent.getBoundingClientRect();
      let bounds = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      } as IBounds;
      if (bounds.width * bounds.height > 0) {
        //console.log("getPreviewBounds", bounds);
        return bounds;
      }
    }
  };

  const uiResize = () => {
    if (isInitialized.current && isDisplayInitialized.current) {
      let previewBounds = getPreviewBounds();
      if (!_.isNil(previewBounds)) {
        obsHandler.display.updateDisplay(0, previewBounds)//.then((res) => {});
      }
    }
  };

  const hideDisplay = () => {
    console.log("previewDisplay", "hide");
    obsHandler.display.hideDisplay(0);
  };

  const showDisplay = () => {
    console.log("previewDisplay", "show");
    let previewBounds = getPreviewBounds();
    if (!_.isNil(previewBounds)) {
      obsHandler.display
        .updateDisplay(0, previewBounds, true)
        //.then((res) => {});
    }
  };

  useEffect(() => {
    let rmUIResizeListenerFunc = obsHandler.ui.m2rUIResize(uiResize);
    konnectUIEvent.on(KonnectUIEvents.MenuFold, hideDisplay);
    //konnectUIEvent.on(KonnectUIEvents.MenuUnfold, hideDisplay);
    konnectUIEvent.on(KonnectUIEvents.PresetDialogOpen, hideDisplay);
    //konnectUIEvent.on(KonnectUIEvents.MenuFolded, showDisplay);
    konnectUIEvent.on(KonnectUIEvents.MenuUnfolded, showDisplay);
    konnectUIEvent.on(KonnectUIEvents.PresetDialogClose, showDisplay);

    if (!isInitialized.current) {
      obsHandler.camera.getCamInputResolution(0).then(updateInputResolution);
    } else if (!isDisplayInitialized.current) {
      setTimeout(() => {
        let previewBounds = getPreviewBounds();
        if (!_.isNil(previewBounds)) {
          obsHandler.display.startDisplay(0, previewBounds).then((res) => {
            isDisplayInitialized.current = true;
          });
        }
      }, 50);
    } else {
      let previewBounds = getPreviewBounds();
      if (!_.isNil(previewBounds)) {
        //obsHandler.display.updateDisplay(0, previewBounds).then((res) => {});
      }
    }

    if (
      containerSize.current.height !== props.containerSize.height ||
      containerSize.current.width !== props.containerSize.width
    ) {
      console.log("containerSize changed");
      containerSize.current = props.containerSize;
      updatePreviewSize();
    }

    return () => {
      if (_.isFunction(rmUIResizeListenerFunc)) {
        rmUIResizeListenerFunc();
      }
      konnectUIEvent.removeListener(KonnectUIEvents.MenuFold, hideDisplay);
      konnectUIEvent.removeListener(KonnectUIEvents.MenuUnfold, hideDisplay);
      konnectUIEvent.removeListener(
        KonnectUIEvents.PresetDialogOpen,
        hideDisplay
      );
      konnectUIEvent.removeListener(KonnectUIEvents.MenuFolded, showDisplay);
      konnectUIEvent.removeListener(KonnectUIEvents.MenuUnfolded, showDisplay);
      konnectUIEvent.removeListener(
        KonnectUIEvents.PresetDialogClose,
        showDisplay
      );
    };
  }, [previewSize, props.containerSize]);

  return <div ref={previewRef} style={getPreviewStyle()}></div>;
};

export default PreviewDisplay;
