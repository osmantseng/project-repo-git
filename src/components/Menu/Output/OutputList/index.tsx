import { List, ListItem, ListItemButton, ListItemText, Radio } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles";
import { INumberOptionUI } from "../../../../global";
import { ColorData } from "../../../../helpers/const/color.const";
const useStyles = makeStyles({
    root: {
        height: 45
    }
})
type IProp = {
    data: INumberOptionUI[],
    handleChange: (tragetItem: INumberOptionUI) => void,
    isFrame: boolean
}
const OutputList = (props: IProp) => {
    const classes = useStyles();
    const {data, handleChange} = props;
    const handleDataChange = (itemValue: INumberOptionUI) => {
       handleChange(itemValue)
    }
    return (
        <>
            <List disablePadding>
                {
                    data.map(item => (
                        <ListItem className={classes.root} divider key={item.id}>
                            <ListItemButton role={undefined} onClick={() => handleDataChange(item)} disableGutters disableTouchRipple>
                                <ListItemText id={`${item.id}`} primary={item.name} sx={{ color: `${item.isChecked ? ColorData.mainColor : ''}` }} />
                                <Radio
                                    edge="start"
                                    disableRipple
                                    checked={item.isChecked}
                                    color="primary"
                                    inputProps={{ 'aria-labelledby': `${item.id}` }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))
                }
            </List>
        </>
    )
}
export default OutputList