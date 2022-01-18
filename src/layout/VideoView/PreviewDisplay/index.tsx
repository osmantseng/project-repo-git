import _ from "lodash";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { IBounds, IWidthHeight } from "../../../global";
import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";
import { Crop2 } from "../Crop";

const { obsHandler } = window;

interface IPreviewDisplayProp {
  containerSize: IWidthHeight;
}

const PreviewDisplay = (props: IPreviewDisplayProp) => {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const isInitializing = useRef(false);
  const isInitialized = useRef(false);
  const isDisplayInitializing = useRef(false);
  const isDisplayInitialized = useRef(false);

  const inputResolution = useRef({
    width: 0,
    height: 0,
  } as IWidthHeight);
  const [containerRect, setContainerRect] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  } as IBounds);
  const [previewSize, setPreviewSize] = useState({
    width: 0,
    height: 0,
  } as IWidthHeight);

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

  const getPreviewBounds = useCallback(() => {
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
        return bounds;
      }
    }
  }, []);

  const updateDisplay = useCallback(
    (unhide: boolean = false) => {
      let previewBounds = getPreviewBounds();
      if (!_.isNil(previewBounds)) {
        //console.log("preview", previewBounds);
        obsHandler.display.updateDisplay(0, previewBounds, unhide);
      }
    },
    [getPreviewBounds]
  );

  const updatePreviewSize = useCallback(() => {
    if (!isInitialized.current) {
      return;
    }

    if (
      _.isNil(previewContainerRef.current) ||
      _.isNil(previewContainerRef.current.parentElement)
    ) {
      if (
        !_.isEqual(containerRect, {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        } as IBounds)
      ) {
        setContainerRect({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        } as IBounds);
      }

      if (
        !_.isEqual(previewSize, {
          width: 0,
          height: 0,
        } as IWidthHeight)
      ) {
        setPreviewSize({
          width: 0,
          height: 0,
        } as IWidthHeight);
      }

      return;
    }

    let newContainerRect =
      previewContainerRef.current.parentElement.getBoundingClientRect();
    let newContainerSize = {
      x: newContainerRect.x,
      y: newContainerRect.y,
      width: newContainerRect.width,
      height: newContainerRect.height,
    } as IBounds;

    if (!_.isEqual(newContainerSize, newContainerRect)) {
      setContainerRect(newContainerSize);
    }

    let newPreviewSize = innerFit(newContainerSize, inputResolution.current);

    if (!_.isEqual(newPreviewSize.box, previewSize)) {
      console.log(
        "PreviewDisplay",
        "newPreviewSize",
        newPreviewSize.box,
        previewSize
      );
      setPreviewSize(newPreviewSize.box);
    }
  }, [previewSize, updateDisplay]);

  const updateInputResolution = useCallback(() => {
    obsHandler.camera.getCamInputResolution(0).then((resolution) => {
      isInitialized.current = true;
      isInitializing.current = false;
      inputResolution.current = resolution;
      updatePreviewSize();
    });
  }, [updatePreviewSize]);

  const getPreviewStyle = () => {
    if (previewSize.width * previewSize.height <= 0) {
      return { display: "none" } as CSSProperties;
    }

    let style = {
      background: "transparent",
      position: "absolute",
      aspectRatio: `${previewSize.width / previewSize.height}`,
      width: `${previewSize.width}px`,
      height: `${previewSize.height}px`,
      //border: "10px solid white",
    } as CSSProperties;

    return style;
  };

  const startDisplay = useCallback(() => {
    let previewBounds = getPreviewBounds();
    if (!_.isNil(previewBounds)) {
      console.log("preview", previewBounds);
      obsHandler.display.startDisplay(0, previewBounds).then(() => {
        isDisplayInitialized.current = true;
        isDisplayInitializing.current = false;
      });
    }
  }, [getPreviewBounds]);

  const unhideDisplay = useCallback(() => {
    updateDisplay(true);
  }, [updateDisplay]);

  useEffect(() => {
    if (!isInitializing.current) {
      if (
        !isInitialized.current &&
        !_.isNil(previewContainerRef.current?.parentElement)
      ) {
        isInitializing.current = true;
        updateInputResolution();
      } else if (
        !isDisplayInitialized.current &&
        !isDisplayInitializing.current
      ) {
        isDisplayInitializing.current = true;
        setTimeout(() => {
          startDisplay();
        }, 0);
      } else if (
        isDisplayInitialized.current &&
        !isDisplayInitializing.current
      ) {
        setTimeout(() => {
          updateDisplay();
        }, 0);
      }
    }

    let rmUIResizeListenerFunc = obsHandler.ui.m2rUIResize(updatePreviewSize);
    konnectUIEvent.on(KonnectUIEvents.PresetDialogClose, unhideDisplay);
    //window.addEventListener("mousemove", mouseMove);

    return () => {
      rmUIResizeListenerFunc();
      konnectUIEvent.removeListener(
        KonnectUIEvents.PresetDialogClose,
        unhideDisplay
      );
      //window.removeEventListener("mousemove", mouseMove);
    };
  }, [
    props.containerSize,
    containerRect,
    updateInputResolution,
    updatePreviewSize,
    startDisplay,
    unhideDisplay,
    updateDisplay,
  ]);

  return (
    <div
      ref={previewContainerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        background: "transparent",
      }}
    >
      <div id="PreviewArea" style={getPreviewStyle()} ref={previewRef}></div>
      {inputResolution.current.width * inputResolution.current.height > 0 &&
        previewSize.width * previewSize.height > 0 && (
          <Crop2
            inputResolution={inputResolution.current}
            previewSize={previewSize}
          />
        )}
    </div>
  );
};

export default PreviewDisplay;
