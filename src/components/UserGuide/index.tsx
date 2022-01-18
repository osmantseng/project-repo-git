import React, { useState, useEffect } from "react";
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react/swiper-react.js';
// import Swiper core and required modules
import SwiperCore, { Pagination, Navigation } from "swiper";
import { PaginationOptions } from "swiper/types/modules/pagination";
import { Dialog, DialogContent, DialogContentText, DialogTitle, Button, Box } from "@material-ui/core";
// Import Swiper styles
import "swiper/swiper.min.css";
import "swiper/swiper-bundle.css";
import "../../styles/swiper.css";
import { makeStyles } from "@material-ui/styles";
import { useTranslation } from "react-i18next";
import { GUIDE } from '../../helpers/const/storage.const';
import {userGuideData} from '../../helpers/const/user-guide-data.const';
import { konnectUIEvent, KonnectUIEvents } from "../../helpers/util/uiEvent";
// install Swiper modules
SwiperCore.use([Pagination, Navigation]);

/**
 * 用戶引導頁面
 */
// 樣式定義
const useStyles = makeStyles({
  root: {
    zIndex: 1,
    width: 'auto',
    height: 'calc(100vh - 46px)',
    margin: '46px auto 0',
    '& .MuiDialog-paper': {
      // height: '75vh',
      maxWidth: '70%',
      margin: 0
    },
    '& .MuiDialogTitle-root': {
      fontSize: "1.4rem",
      color: '#1D2C41'
    },
    '& .MuiBackdrop-root': {
      backgroundImage: 'linear-gradient(to bottom right, #8AC5DF, #0078AE)',
      top: 46,
    }
  },
  skip: {
    cursor: 'pointer',
    color: '#0C77AD',
    fontWeight: 700,
    borderBottom: '1px solid #0C77AD',
    fontSize: '15px',
    position: 'absolute',
    right: '23px',
    zIndex: 2
  },
  slide: {
    '& button': {
      textTransform: 'none',
      fontWeight: 600,
      marginTop: '19px'
    }
  },
  content: {
    color: '#605E5C',
    fontSize: '1rem',
    fontWeight: 600,
    wordBreak: 'break-word'
  }
})

// 组件定義
const UserGuide = () => {
  // 國際化
  const { t } = useTranslation();
  // 樣式引用
  const classes = useStyles();
  const [zoom, setZoom] = useState(1);
  // 初始化分頁
  const initPagination = {
    clickable: true,
    renderBullet: (index: any, className: any) => {
      return '<div class="' + className + '">' + "</div>";
    }
  };
  const [pagination, setPagination] = useState<PaginationOptions | boolean>(initPagination);
  const [open, setOpen] = useState(true);
  // 點擊關閉事件
  const handleClose = () => {
    localStorage.setItem(GUIDE, 'true');
    setOpen(false);
    konnectUIEvent.emit(KonnectUIEvents.GuideShowPreset, true);
  }

  // slider改變事件
  const handleSliderChange = (e: any) => {
    if (e.activeIndex === 4) {
      setPagination(false);
    } else {
      setPagination(true);
    }
  }

  return (
    <>
      <Dialog open={open} className={classes.root} 
        sx={{'& .MuiDialog-paper': {
          height: `${window.devicePixelRatio * 75}vh`,
       }}}>
        <DialogContent sx={{ width: 'auto', m: 0, p: '20px 23px'}}>
          {pagination && <DialogContentText className={classes.skip} onClick={handleClose}>{t('useGuide.skip')}</DialogContentText>}
          <Swiper pagination={pagination} mousewheel={false} navigation onSlideChange={handleSliderChange}>
            {
              userGuideData.map(item => (
                <SwiperSlide key={item.id}>
                  <Box sx={{ width: '55vw'}}>
                    <img src={item.imgPath} alt=""/>
                  </Box>
                  <Box sx={{ p: '0 27px', wordBreak: 'break-word' }}>
                    <DialogTitle sx={{ p: 0 }}>{t(`useGuide.pageTitle${item.id}`)}</DialogTitle>
                    <DialogContentText className={classes.content}>
                      {t(`useGuide.pageContent${item.id}`)}
                    </DialogContentText>
                  </Box>
                </SwiperSlide>
              ))
            }
            <Box className={`swiper-pagination ${classes.slide}`} sx={{ width: '100%', bottom: 0}}>
              {!pagination && <Button variant="contained" onClick={handleClose}>{t('useGuide.start')}</Button>}
            </Box>
          </Swiper>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default UserGuide