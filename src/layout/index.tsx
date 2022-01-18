import React, { useState, useEffect } from "react";
import Header from "./Header";
import SliderBar from "./SliderBar";
//import VideoCropView from "./VideoCropView";
import { Grid, Box } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import CropOperate from "./CropOperate";
//import VideoDisplayView from "./VideoDisplayView";
// import { MenuNameEnum } from "../helpers/enum/menu-name.enum";
//import VideoView from "./VideoView";
import VideoView2 from "./VideoView2";
import { konnectUIEvent, KonnectUIEvents } from '../helpers/util/uiEvent';
import _ from "lodash";
const { obsHandler } = window;
const useStyled = makeStyles({
  root: {
    gridTemplateRows: "46px 1fr",
  },
  topBox: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: 46,
    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)",
    zIndex: 100,
  },
  box: {
    gridTemplateColumns: "auto 1fr",
    height: "calc(100vh - 46px)",
  },
  center: {
    width: "100%",
    position: "relative",
    display: "flex",
    gridTemplateRows: "46px 1fr",
    flexDirection: "column",
  },
  crop: {
    width: "100%",
    // 减去Header和Crop Operate区域的高度
    height: "calc(100vh - 93px)",
    position: "absolute",
    top: 47,
    left: 0,
  },
});
const Layout = () => {
  const classes = useStyled();
  // 获取当前点击的Menu value
  const [currentMenu, setCurrentMenu] = useState("");
  useEffect(() => {
    if(_.isNil(window.globalDisabled)) {
        obsHandler.camera.getCamDeviceOptions(0).then((newData) => {
            konnectUIEvent.emit(
                KonnectUIEvents.SetHasCams,
                newData.length > 0
              );
              window.globalDisabled = newData.length === 0;
        });
    }
    return () => {};
  }, []);

  const menuChange = (value: string) => {
    setCurrentMenu(value);
  };

    return (
        <Grid className={classes.root}>
            <Box className={`${classes.topBox} top-bar`}>
                <Header />
            </Box>
            <Grid container direction="row" flexWrap="nowrap" className={classes.box}>
                <SliderBar menuChange={menuChange}/>
                <div className={classes.center}>
                    <VideoView2 />
                    {/* <CropOperate2/> */}
                    {/* <VideoDisplayView currentMenu={currentMenu as MenuNameEnum}/> */}
                    {/* <VideoCropView currentMenu={currentMenu}/> */}
                    <CropOperate/>
                </div>
            </Grid>
        </Grid>
    )
}
export default Layout
