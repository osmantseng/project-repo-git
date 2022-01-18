import { MenuItem } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { useEffect, useState } from "react";
import Icon from "../SliderIcon";
import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";
import { MenuNameEnum } from "../../../helpers/enum/menu-name.enum";
interface IconData {
  iconName: string;
  menuName: string;
  value: string;
}
interface IProps {
  list: IconData[];
  handleChange: (event: any, newValue: any) => void;
  value: string;
  selected: boolean;
}
const useStyles = makeStyles({
  root: {
    flexWrap: "wrap",
  },
});
const SliderMenuItem = (props: IProps) => {
  const classes = useStyles();
  const { list, handleChange, value, selected } = props;
  const [hasCamera, setHasCamera] = useState(!window.globalDisabled);
  useEffect(() => {
    konnectUIEvent.on(KonnectUIEvents.SetHasCams, setHasCamera);
    return () => {
      konnectUIEvent.removeListener(KonnectUIEvents.SetHasCams, setHasCamera);
    }
  }, []);
  return (
    <>
      {list.map((item) => (
        <MenuItem
          className={classes.root}
          key={item.value}
          disabled={item.value !== MenuNameEnum.settings && !hasCamera}
          onClick={(e) => handleChange(e, item.value)}
          disableTouchRipple
        >
          <Icon
            iconName={item.iconName}
            menuName={item.menuName}
            selected={selected && value === item.value}
          ></Icon>
        </MenuItem>
      ))}
    </>
  );
};

export default SliderMenuItem;
