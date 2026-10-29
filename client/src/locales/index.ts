import { enTranslations } from "./en";
import { viTranslations } from "./vi";
import { esTranslations } from "./es";
import { frTranslations } from "./fr";
import { deTranslations } from "./de";
import { pt_BRTranslations } from "./pt-BR";
import { idTranslations } from "./id";

export type SupportedLanguage = "en" | "vi" | "es" | "fr" | "de" | "pt-BR" | "id";

export const translationsMap: Record<SupportedLanguage, Record<string, string>> = {
  en: enTranslations,
  vi: viTranslations,
  es: esTranslations,
  fr: frTranslations,
  de: deTranslations,
  "pt-BR": pt_BRTranslations,
  id: idTranslations,
};

export {
  enTranslations,
  viTranslations,
  esTranslations,
  frTranslations,
  deTranslations,
  pt_BRTranslations,
  idTranslations,
};
