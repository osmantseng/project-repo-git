import {
  Grid,
  FormControlLabel,
  Slider,
  Checkbox,
  List,
  ListItem,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import { ColorData } from "../../../../helpers/const/color.const";
import { FontSize, FontWeight } from "../../../../helpers/const/font.const";
import { AdjustTypeEnum } from "../../../../helpers/enum/adjust-type.enum";
import { IAdjustIconUI, IAdjustUI } from "../../../../global";
import AdjustName from "../AdjustName";
/**
 * Adjust参数区域
 */
// 父組件傳遞參數類型
type IProp = {
  data: IAdjustIconUI[];
  handleAuto: (e: any, targetKey: string) => void;
  handleSliderChange: (e: any, targetKey: string) => void;
};
// 樣式定義
const useStyles = makeStyles({
  root: {
    flexWrap: "wrap",
    padding: "10px 20px 10px 16px",
    width: "220px",
  },
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "5px",
  },
  value: {
    display: "flex",
    justifyContent: "end",
    width: "calc(100% - 2px)",
    fontSize: FontSize.adjustValue,
    color: ColorData.mainColor,
    fontWeight: FontWeight.titleWeight,
  },
  disabled: {
    color: ColorData.sliderDisabled,
  },
  checkBox: {
    "& .MuiFormControlLabel-label": {
      fontSize: FontSize.adjustValue,
      color: ColorData.textColor,
      paddingLeft: "2px",
    },
  },
  defaultDiv: {
    width: "100%",
    position: "relative",
  },
  // 默認值樣式
  default: {
    width: 1.5,
    height: 5,
    borderRadius: "50%",
    position: "absolute",
    background: ColorData.sliderDisabled,
    transform: "translate(-50%, -50%)",
  },
});

// 組件定義
const SliderOption = (props: IProp) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const { data, handleAuto, handleSliderChange } = props;
  // 計算默認值的位置
  const getStyles = (currentData: IAdjustUI) => {
    const { max, min } = currentData.range;
    return {
      left: `${
        Math.abs((currentData.range.default - min) / (max - min)) * 100
      }%`,
    };
  };
  return (
    <>
      <List disablePadding>
        {data.map((item: IAdjustIconUI) => (
          <ListItem
            className={classes.root}
            sx={{
              display:
                !item.isAutoSupported && !item.isSupported ? "none" : "block",
            }}
            key={item.key}
            divider={item.name !== AdjustTypeEnum.gamma}
            disabled={window.globalDisabled}
            disablePadding
          >
            <Grid container className={classes.container}>
              <AdjustName iconName={item.iconName} name={item.name} />
              {item.isAutoSupported && (
                <FormControlLabel
                  sx={{ margin: 0, paddingLeft: "2px" }}
                  className={classes.checkBox}
                  value={item.isAuto}
                  control={
                    <Checkbox
                      size="small"
                      disableRipple
                      sx={{ padding: 0, height: "4px" }}
                      checked={item.isAuto}
                      onChange={(e) => handleAuto(e, item.key)}
                    />
                  }
                  label={t("adjust.auto")}
                  labelPlacement="end"
                  disabled={
                    !item.isAutoSupported /*  || _.get(item, "range.flags") !== 3 */
                  }
                />
              )}
            </Grid>
            {item.name !== AdjustTypeEnum.lowLight && (
              <>
                {![
                  AdjustTypeEnum.exposure,
                  AdjustTypeEnum.whiteBalance,
                ].includes(item.name as AdjustTypeEnum) && (
                  <div className={classes.defaultDiv}>
                    <span
                      className={classes.default}
                      style={getStyles(item)}
                    ></span>
                  </div>
                )}
                <Slider
                  max={_.get(item, "range.max", 100)}
                  min={_.get(item, "range.min", 0)}
                  step={_.get(item, "range.step", 1)}
                  size="small"
                  color="primary"
                  disabled={
                    !item.isSupported || item.isAuto || window.globalDisabled
                  }
                  value={
                    item.isSupported && _.isNumber(item.value) ? item.value : 0
                  }
                  name={item.name}
                  onChange={(e) => handleSliderChange(e, item.key)}
                  marks={item.name === AdjustTypeEnum.backlight}
                />
                <div
                  className={`${classes.value} ${
                    (item.isAuto || window.globalDisabled) && classes.disabled
                  }`}
                >
                  {item.isSupported && _.isNumber(item.value) ? item.value : ""}
                </div>
              </>
            )}
          </ListItem>
        ))}
      </List>
    </>
  );
};
export default SliderOption;
