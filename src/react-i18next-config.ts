import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from './locales/US_GB - United Kingdom - English.json'
import es from './locales/ES - Spain - Spanish.json'
import fr from './locales/FR - France - French.json'
import de from './locales/DE - Germany - German.json'
import nl from './locales/NL - Nederlands - Dutch.json'
import it from './locales/IT - Italy - Italian.json'
import pt from './locales/PT - Portugal - Portuguese.json'
import dk from './locales/DK - Denmark - Danish.json'
import no from './locales/NO - Norway - Norwegian.json'
import se from './locales/SE - Sweden - Swedish.json'
import fi from './locales/FI - Finland - Finnish.json'
import ee from './locales/EE - Estonia - Estonian.json'
import lv from './locales/LV - Latvia - Latvian.json'
import lt from './locales/LT - Lithuania - Lithuanian.json'
import pl from './locales/PL - Poland - Polish.json'
import cz from './locales/CZ - Czech Republic - Czech.json'
import sz from './locales/SZ - Slovakia - Slovak.json'
import hu from './locales/HU - Hungary - Hungarian.json'
import ro from './locales/RO - Romania - Romanian.json'
import ru from './locales/RU - Russia - Russian.json'
import ua from './locales/UA - Ukraine - Ukrainian.json'
import kz from './locales/KZ - Kazakhstan - Kazakh.json'
import tr from './locales/TR - Turkey - Turkish.json'
import gr from './locales/GR - Greece - Greek.json'
import ad from './locales/Arabic-Dubai.json'
import tw from './locales/TW - Taiwan - Chinese (Traditional).json'
import cn from './locales/ZH - China - Chinese (Simplified).json'
import kr from './locales/KR - Korea - Korean.json'
import jp from './locales/JA-JP.json'
const resources = {
  "en-US": {
    translation: en
  },
  "en-ES": {
    translation: es 
  },
  "en-FR": {
    translation: fr
  },
  "en-DE": {
    translation: de 
  },
  "en-NL": {
    translation: nl 
  },
  "en-IT": {
    translation: it 
  },
  "en-PT": {
    translation: pt 
  },
  "en-DK": {
    translation: dk
  },
  "en-NO": {
    translation: no
  },
  "en-SE": {
    translation: se 
  },
  "en-FI": {
    translation: fi 
  },
  "en-EE": {
    translation: ee 
  },
  "en-LV": {
    translation: lv 
  },
  "en-LT": {
    translation: lt 
  },
  "en-PL": {
    translation: pl 
  },
  "en-CZ": {
    translation: cz 
  },
  "en-SZ": {
    translation: sz 
  },
  "en-HU": {
    translation: hu 
  },
  "en-RO": {
    translation: ro 
  },
  "en-RU": {
    translation: ru 
  },
  "en-UA": {
    translation: ua 
  },
  "en-KZ": {
    translation: kz 
  },
  "en-TR": {
    translation: tr 
  },
  "en-GR": {
    translation: gr 
  },
  "en-AD": {
    translation: ad 
  },
  "zh-TW": {
    translation: tw 
  },
  "zh-CN": {
    translation: cn 
  },
  "en-KR": {
    translation: kr 
  },
  "en-JP": {
    translation: jp 
  }
};

i18n.use(Backend)
  .use(LanguageDetector) //嗅探当前浏览器语言 
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en-US",
    react: {
      useSuspense: false,
    },
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      caches: ['localStorage', 'sessionStorage', 'cookie'],
    }
  })

export default i18n