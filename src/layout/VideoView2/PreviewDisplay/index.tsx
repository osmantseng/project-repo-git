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

  const isInitialized = useRef(false);
  const isDisplayInitialized = useRef(false);

  const prevPreviewBounds = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  } as IBounds);

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
    (unhide: boolean = false, force: boolean = false) => {
      console.log("updateDisplay", unhide);
      let previewBounds = getPreviewBounds();
      if (!_.isNil(previewBounds)) {
        if (force || !_.isEqual(prevPreviewBounds.current, previewBounds)) {
          prevPreviewBounds.current = previewBounds;
          obsHandler.display.updateDisplay(0, previewBounds, unhide);
        }
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
    let _newContainerRect = {
      x: newContainerRect.x,
      y: newContainerRect.y,
      width: newContainerRect.width,
      height: newContainerRect.height,
    } as IBounds;

    if (!_.isEqual(_newContainerRect, containerRect)) {
      setContainerRect(_newContainerRect);
    }

    let newPreviewSize = innerFit(
      _newContainerRect as IWidthHeight,
      inputResolution.current
    );

    if (!_.isEqual(newPreviewSize.box, previewSize)) {
      console.log(
        "PreviewDisplay",
        "newPreviewSize",
        newPreviewSize.box,
        previewSize
      );
      setPreviewSize(newPreviewSize.box);
    }
  }, [previewSize, containerRect, innerFit]);

  const updateInputResolution = useCallback(() => {
    obsHandler.camera.getCamInputResolution(0).then((resolution) => {
      isInitialized.current = true;
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
      if (!isDisplayInitialized.current && !_.isEqual(prevPreviewBounds.current, previewBounds)) {
        prevPreviewBounds.current = previewBounds;
        obsHandler.display.startDisplay(0, previewBounds).then(() => {
          isDisplayInitialized.current = true;
        });
      }
    }
  }, [getPreviewBounds]);

  const unhideDisplay = useCallback(() => {
    updateDisplay(true, true);
  }, [updateDisplay]);

  useEffect(() => {
    console.log("preview useEffect", previewSize);

    if (
      !isInitialized.current &&
      !_.isNil(previewContainerRef.current?.parentElement)
    ) {
      updateInputResolution();
    } else if (!isDisplayInitialized.current) {
      setTimeout(() => {
        startDisplay();
      }, 0);
    } else if (isDisplayInitialized.current) {
      setTimeout(() => {
        updateDisplay();
      }, 0);
    }

    let rmUIResizeListenerFunc = obsHandler.ui.m2rUIResize(updatePreviewSize);
    konnectUIEvent.on(KonnectUIEvents.PresetDialogClose, unhideDisplay);

    return () => {
      rmUIResizeListenerFunc();
      konnectUIEvent.removeListener(
        KonnectUIEvents.PresetDialogClose,
        unhideDisplay
      );
    };
  }, [
    props.containerSize,
    containerRect,
    previewSize,
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
