import i18next from 'i18next';
import HttpApi, { HttpBackendOptions } from 'i18next-http-backend';
import de from 'locale/de.json';
import en from 'locale/en.json';
import es from 'locale/es.json';
import esMX from 'locale/esMX.json';
import fr from 'locale/fr.json';
import it from 'locale/it.json';
import ja from 'locale/ja.json';
import ko from 'locale/ko.json';
import pl from 'locale/pl.json';
import ptBR from 'locale/ptBR.json';
import ru from 'locale/ru.json';
import zhCHS from 'locale/zhCHS.json';
import zhCHT from 'locale/zhCHT.json';
import enSrc from '../../config/i18n.json';
import { humanBytes } from './storage/human-bytes';
import { infoLog } from './utils/log';

export const DIM_LANG_INFOS = {
  de: { pluralOverride: false, latinBased: true },
  en: { pluralOverride: false, latinBased: true },
  es: { pluralOverride: false, latinBased: true },
  'es-mx': { pluralOverride: false, latinBased: true },
  fr: { pluralOverride: false, latinBased: true },
  it: { pluralOverride: false, latinBased: true },
  ja: { pluralOverride: true, latinBased: false },
  ko: { pluralOverride: true, latinBased: false },
  pl: { pluralOverride: true, latinBased: true },
  'pt-br': { pluralOverride: false, latinBased: true },
  ru: { pluralOverride: true, latinBased: false },
  'zh-chs': { pluralOverride: true, latinBased: false },
  'zh-cht': { pluralOverride: true, latinBased: false },
};

export type DimLanguage = keyof typeof DIM_LANG_INFOS;

export const DIM_LANGS = Object.keys(DIM_LANG_INFOS) as DimLanguage[];

// Hot-reload translations in dev. You'll still need to get things to re-render when
// translations change (unless we someday switch to react-i18next)
if (module.hot) {
  module.hot.accept('../../config/i18n.json', () => {
    i18next.reloadResources('en', undefined, () => {
      infoLog('i18n', 'Reloaded translations');
    });
  });
}

// Try to pick a nice default language
export function defaultLanguage(): DimLanguage {
  const storedLanguage = localStorage.getItem('dimLanguage') as DimLanguage;
  if (storedLanguage && DIM_LANGS.includes(storedLanguage)) {
    return storedLanguage;
  }
  const browserLang = (window.navigator.language || 'en').toLowerCase();
  return DIM_LANGS.find((lang) => browserLang.startsWith(lang)) || 'en';
}

export function initi18n(): Promise<unknown> {
  const lang = defaultLanguage();
  return new Promise((resolve, reject) => {
    // See https://github.com/i18next/i18next
    i18next.use(HttpApi).init<HttpBackendOptions>(
      {
        initImmediate: true,
        compatibilityJSON: 'v3',
        debug: $DIM_FLAVOR === 'dev',
        lng: lang,
        fallbackLng: 'en',
        lowerCaseLng: true,
        supportedLngs: DIM_LANGS,
        load: 'currentOnly',
        interpolation: {
          escapeValue: false,
          format(val: string, format) {
            switch (format) {
              case 'pct':
                return `${Math.min(100, Math.floor(100 * parseFloat(val)))}%`;
              case 'humanBytes':
                return humanBytes(parseInt(val, 10));
              case 'number':
                return parseInt(val, 10).toLocaleString();
              default:
                return val;
            }
          },
        },
        backend: {
          loadPath([lng]: string[]) {
            const path = {
              de,
              // In development, directly use the source English translations.
              // In production we use a version that's gone through i18n-scanner
              // to remove unused keys.
              en: $DIM_FLAVOR === 'dev' ? enSrc : en,
              es,
              'es-mx': esMX,
              fr,
              it,
              ja,
              ko,
              pl,
              'pt-br': ptBR,
              ru,
              'zh-chs': zhCHS,
              'zh-cht': zhCHT,
            }[lng] as unknown as string;
            if (!path) {
              throw new Error(`unsupported language ${lng}`);
            }
            return path;
          },
        },
        returnObjects: true,
      },
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(undefined);
        }
      }
    );
    for (const otherLang of DIM_LANGS) {
      if (DIM_LANG_INFOS[otherLang]?.pluralOverride) {
        // eslint-disable-next-line
        i18next.services.pluralResolver.addRule(
          otherLang,
          // eslint-disable-next-line
          i18next.services.pluralResolver.getRule('en')
        );
      }
    }
  });
}
