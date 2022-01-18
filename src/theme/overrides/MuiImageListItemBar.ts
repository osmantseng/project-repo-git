import { ColorData } from "../../helpers/const/color.const"
import { FontSize } from "../../helpers/const/font.const"
const MuiImageListItemBar =  {
    styleOverrides: {
        root: {
            background: ColorData.imgTextBackgroundColor
        },
        titleWrap: {
            padding: '0 10px',
            height: 22
        },
        title: {
            fontSize: FontSize.imgText
        }
    }
}
export default MuiImageListItemBar