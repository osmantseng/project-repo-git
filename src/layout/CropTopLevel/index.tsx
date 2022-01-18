import { useEffect, useState, CSSProperties, useRef, useCallback } from 'react';
import { IBounds, ICropInfo, IRatioOptionUI, IWidthHeight } from '../../global';
import _ from 'lodash';
import async from 'async';
import { cropEvent, CropEvents } from '../../helpers/util/crop';
import CropUI from './CropUI';
import { parallel } from 'async';

const { obsHandler } = window;

const CropTopLevel = () => {
  const isInitialized = useRef(false);
  const [bounds, setBounds] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  } as IBounds);
  /* const [inputResolution, setInputResolution] = useState({
    width: 0,
    height: 0
  } as IWidthHeight); */
  const [currentRatio, setCurrentRatio] = useState<IRatioOptionUI>();

  const getStyle = () => {
    if (bounds.width * bounds.height <= 0) {
      return { display: 'none' } as CSSProperties;
    }

    return {
      position: 'absolute',
      //background: "rgba(0, 0, 0, 0.5)",
      background: 'transparent',
      top: bounds.y,
      left: bounds.x,
      width: bounds.width,
      height: bounds.height
    } as CSSProperties;
  };

  const initializeCrop = useCallback(() => {
    parallel<IBounds | IWidthHeight | IRatioOptionUI | undefined>(
      {
        initialBounds: (callback) => {
          let url = new URL(window.location.href);
          let params = new URLSearchParams(url.search);
          let initialBounds = _.mapValues(bounds, (value, key) => {
            let newValue: any = params.get(key);
            newValue = _.toNumber(newValue);
            return _.isNumber(newValue) ? newValue : 0;
          }) as IBounds;
          callback(null, initialBounds);
        },
        /* inputResolution: (callback) => {
          obsHandler.camera.getCamInputResolution(0).then((res) => {
            callback(null, res);
          });
        }, */
        currentRatio: (callback) => {
          obsHandler.camera.getCamRatioOptions(0).then((res) => {
            let currentRatio = _.find(res, (x) => x.isChecked);
            callback(null, currentRatio);
          });
        }
      },
      (err, results) => {
        let initialBounds = _.get(results, 'initialBounds');
        if (!_.isNil(initialBounds)) {
          setBounds(initialBounds as IBounds);
        }

        /* let _inputResolution = _.get(results, 'inputResolution');
        if (!_.isNil(_inputResolution)) {
          setInputResolution(_inputResolution as IWidthHeight);
        } */

        let _currentRatio = _.get(results, 'currentRatio');
        if (!_.isNil(_currentRatio)) {
          setCurrentRatio(_currentRatio as IRatioOptionUI);
        }

        isInitialized.current = true;
      }
    );
  }, [bounds]);

  const updateBounds = useCallback(
    (newBounds: IBounds) => {
      if (!_.isEqual(newBounds, bounds)) {
        setBounds(newBounds);
      }
    },
    [bounds]
  );

  useEffect(() => {
    let rmListenerFunc = obsHandler.notification.updateDisplay(updateBounds);

    if (!isInitialized.current) {
      initializeCrop();
    } else {
      //console.log(currentRatio);
      //cropEvent.emit(CropEvents.BeginCrop, currentRatio);
    }

    return () => {
      if (_.isFunction(rmListenerFunc)) {
        rmListenerFunc();
      }
    };
  }, [bounds, /* inputResolution, */ initializeCrop, updateBounds]);

  return (
    <div style={getStyle()}>
      {isInitialized.current && !_.isNil(currentRatio) && <CropUI selectedRatio={currentRatio} />}
    </div>
  );
};

export default CropTopLevel;
