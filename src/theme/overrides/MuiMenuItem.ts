import { ColorData } from "../../helpers/const/color.const"
import { FontSize, FontWeight} from "../../helpers/const/font.const"
const MuiMenuItem =  {
    styleOverrides: {
        root: {
          padding: '6px 10px',
          color: ColorData.sliderTextColor,
          fontWeight: FontWeight.sliderTextWeight,
          fontSize: FontSize.sliderTextSize,
          justifyContent: 'center',
          '&:hover': {
            backgroundColor: 'transparent'
          }
        }
    }
}
export default MuiMenuItem