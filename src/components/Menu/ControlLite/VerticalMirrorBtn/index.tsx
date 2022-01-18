import { Button } from "@material-ui/core";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
const { obsHandler } = window;

const VerticalMirrorBtn = () => {
  const isInitialized = useRef(false);
  const isChanged = useRef(false);
  const [isChecked, setIsChecked] = useState(false);

  const compareData = (value: boolean) => {
    if (value !== isChecked) {
      setIsChecked(value);
    }
  };

  const onClick = () => {
    isChanged.current = true;
    setIsChecked(!isChecked);
  };

  const fetchData = () => {
    obsHandler.camera.getCamVerticalFlip(0).then((value) => {
      if (_.isBoolean(value)) {
        setIsChecked(value);
      }
    });
  }

  useEffect(() => {
    let removePresetListenerFunc = obsHandler.notification.updatePreset(fetchData);

    if (!isInitialized.current) {
      isInitialized.current = true;
      isChanged.current = false;
      fetchData();
    } else if (isChanged.current) {
      isChanged.current = false;
      obsHandler.backend.save();
      obsHandler.camera.setCamVerticalFlip(0, isChecked).then((value) => {
        if (_.isBoolean(value)) {
          compareData(value);
        }
      });
    }

    return () => {
      if (_.isFunction(removePresetListenerFunc)) {
        removePresetListenerFunc();
      }
    }
  }, [isChecked]);

  return (
    <Button
      variant="outlined"
      onClick={onClick}
      disabled={window.globalDisabled}
      sx={{
        '& i': {
          fontSize: '20px'
        }
      }}
    >
      {/* {t('ratio.vertical')} */}
      <i className="icon-ic_vertical"></i>
    </Button>
  );
};

export default VerticalMirrorBtn;
