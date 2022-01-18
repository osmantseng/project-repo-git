import React, {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Box, LinearProgress, Typography } from "@material-ui/core";
import { ColorData } from "../../helpers/const/color.const";
import _, { Dictionary } from "lodash";
import { konnectUIEvent, KonnectUIEvents } from "../../helpers/util/uiEvent";
import { useTranslation } from "react-i18next";
const { obsHandler } = window;
interface IOBSLoadingScreenProps {
  loadingScreen?: React.ReactNode;
  children?: React.ReactNode;
}
interface IOBSLoadingScreenState {
  isOBSInitialized: boolean;
}

const DefaultLoadingScreen = () => {
  const {t} = useTranslation();
  return (
    <>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <LinearProgress
          sx={{
            width: 220,
            height: 10,
            borderRadius: 10,
            backgroundColor: ColorData.initLineBar,
          }}
          color="primary"
        />
        <br />
        <Typography
          sx={{
            color: ColorData.sliderTextColor,
            fontSize: "20px",
            fontWeight: "700",
          }}
        >
          {t('initial')}...
        </Typography>
      </Box>
    </>
  );
};
export default class OBSLoadingScreen extends Component<
  IOBSLoadingScreenProps,
  IOBSLoadingScreenState
> {
  static DefaultLoadingScreen = () => {
    return (
      <>
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <LinearProgress
            sx={{
              width: 220,
              height: 10,
              borderRadius: 10,
              backgroundColor: ColorData.initLineBar,
            }}
            color="primary"
          />
          <br />
          <Typography
            sx={{
              color: ColorData.sliderTextColor,
              fontSize: "20px",
              fontWeight: "700",
            }}
          >
          Initializing...
          </Typography>
        </Box>
      </>
    );
  };

  static DefaultLoadedScreen = () => {
    return (
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            color: ColorData.sliderTextColor,
            fontSize: "20px",
            fontWeight: "700",
          }}
        >
          OBS initialized successfully.
        </Typography>
      </Box>
    );
  };

  static defaultProps = {
    loadingScreen: <DefaultLoadingScreen />,
  };

  constructor(props: IOBSLoadingScreenProps) {
    super(props);
    this.state = {
      isOBSInitialized: false,
    };
  }

  componentDidMount() {
    obsHandler.ui.m2rUIReady(() => {
      obsHandler.backend.m2rInitOBS((result) => {
        if (!result) {
          console.error("OBS initialization failed!");
        }
        this.setState({ isOBSInitialized: true });
      });
      obsHandler.backend.r2mInitOBS();
    });
    obsHandler.ui.r2mUIReady();
  }

  render() {
    const { isOBSInitialized } = this.state;
    if (isOBSInitialized) {
      const { children } = this.props;
      if (_.isNil(children)) {
        return <OBSLoadingScreen.DefaultLoadedScreen />;
      } else {
        return children;
      }
    } else {
      const { loadingScreen } = this.props;
      return loadingScreen;
    }
  }
}



const DefaultLoadedScreen = () => {
  return (
    <Box
      sx={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
      }}
    >
      <Typography
        sx={{
          color: ColorData.sliderTextColor,
          fontSize: "20px",
          fontWeight: "700",
        }}
      >
        OBS initialized successfully.
      </Typography>
    </Box>
  );
};

interface IOBSLoadingScreen2Props {
  loadingScreen?: React.ReactElement;
  children?: React.ReactNode | never[];
}

const OBSLoadingScreen2 = (props: IOBSLoadingScreen2Props) => {
  const isInitialized = useRef(false);
  const [isOBSInitialized, setIsOBSInitialized] = useState(false);

  const updateCamDeviceOptions = useCallback(() => {
    console.log("OBSLoadingScreen2", "updateCamDeviceOptions");
    setTimeout(() => {
      obsHandler.camera.getCamDeviceOptions(0).then((newData) => {
        window.globalDisabled = newData.length === 0;
        konnectUIEvent.emit(KonnectUIEvents.SetHasCams, newData.length > 0);
      });
    }, 2 * 1000);
  }, []);

  const notifyUIResized = useCallback(() => {
    //console.log("OBSLoadingScreen2", "notifyUIResized");
  }, []);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      obsHandler.ui.m2rUIReady(() => {
        obsHandler.backend.m2rInitOBS((result) => {
          if (!result) {
            console.error("OBS initialization failed!");
          } else {
            setIsOBSInitialized(true);
          }
        });
        obsHandler.backend.r2mInitOBS();
      });
      obsHandler.ui.r2mUIReady();
    }/*  else if (isOBSInitialized) {
      obsHandler.camera.getCamDeviceOptions(0).then((newData) => {
        window.globalDisabled = newData.length === 0;
        konnectUIEvent.emit(KonnectUIEvents.SetHasCams, newData.length > 0);
      });
    } */

    let rmListenerFuncs: Dictionary<Function> = {
      notifyHasCams: obsHandler.notification.updateCamDeviceOptions(
        updateCamDeviceOptions
      ),
      notifyUIResized: obsHandler.ui.m2rUIResize(notifyUIResized),
    };

    return () => {
      _.forEach(rmListenerFuncs, (rmListenerFunc) => {
        rmListenerFunc();
      });
    };
  }, [isOBSInitialized, notifyUIResized, updateCamDeviceOptions]);

  const renderChildren = () => {
    return _.isNil(props.children) ? (
      <DefaultLoadedScreen />
    ) : (
      (props.children as React.ReactElement)
    );
  };

  const renderLoadingScreen = () => {
    return _.isNil(props.loadingScreen) ? (
      <DefaultLoadingScreen />
    ) : (
      props.loadingScreen
    );
  };

  return isOBSInitialized ? renderChildren() : renderLoadingScreen();
};

export { OBSLoadingScreen2 };
