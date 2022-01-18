import { makeStyles } from "@material-ui/styles";
import { ColorData } from "../../../../helpers/const/color.const";
import { FontSize } from "../../../../helpers/const/font.const";
const useStyles = makeStyles({
  // icon和比例名称样式，以及名称字体大小
  labelDiv: {
    display: 'flex',
    alignItems: 'center',
    fontSize: FontSize.menuText
  },
  // Control icon大小
  icon: {
    fontSize: FontSize.menuIcon,
    paddingRight: '3px'
  },
})
const LabelName = (props: any) => {
    const classes = useStyles();
    const { name, iconName, checked } = props;
    return (
      <div className={classes.labelDiv}>
        <span className={`${iconName} ${classes.icon}`}>
          <span className="path1"></span>
          <span className="path2"></span>
        </span>
        <span style={{ color: `${checked ? ColorData.mainColor : ColorData.textColor}` }}>{name}</span>
      </div>
    )
  }

  export default LabelName;