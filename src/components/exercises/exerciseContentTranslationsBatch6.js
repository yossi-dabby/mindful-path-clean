import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_1 } from "./exerciseContentTranslationsBatch1.js";
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_2 } from "./exerciseContentTranslationsBatch2.js";
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A } from "./exerciseContentTranslationsBatch3A.js";
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B } from "./exerciseContentTranslationsBatch3B.js";
import { EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A } from "./exerciseContentTranslationsBatch5A.js";

const LOCALES = ["en", "he", "es", "fr", "de", "it", "pt"];

const retitle = (source, titles) => Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    {
      ...source[locale],
      title: titles[locale]
    }
  ])
);

export const EXERCISE_CONTENT_BATCH_6_IDS = [
  "69505184bc1ccb9021bc3962",
  "69505184bc1ccb9021bc3961",
  "69505184bc1ccb9021bc395e",
  "69505868395719979d90c8bd",
  "69505868395719979d90c8c0",
  "69505868395719979d90c8be",
  "69519590cc9f81fd9daed0b1",
  "69519590cc9f81fd9daed0ae",
  "69519590cc9f81fd9daed0b3",
  "69519590cc9f81fd9daed0b9",
  "69b11c0f9b78b21b9c2351ee"
];

export const EXERCISE_CONTENT_TRANSLATIONS_BATCH_6 = {
  "69505184bc1ccb9021bc3962": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_1["local-grounding-body-scan"],
    {
      en: "Body Scan Meditation",
      he: "מדיטציית סריקת גוף",
      es: "Meditación de exploración corporal",
      fr: "Méditation par balayage corporel",
      de: "Body-Scan-Meditation",
      it: "Meditazione di scansione corporea",
      pt: "Meditação de escaneamento corporal"
    }
  ),
  "69505184bc1ccb9021bc3961": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A["local-behavioral-activity-scheduling"],
    {
      en: "Behavioral Activation",
      he: "הפעלה התנהגותית",
      es: "Activación conductual",
      fr: "Activation comportementale",
      de: "Verhaltensaktivierung",
      it: "Attivazione comportamentale",
      pt: "Ativação comportamental"
    }
  ),
  "69505184bc1ccb9021bc395e": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_1["local-grounding-54321"],
    {
      en: "5-4-3-2-1 Grounding",
      he: "קרקוע 5‑4‑3‑2‑1",
      es: "Anclaje 5‑4‑3‑2‑1",
      fr: "Ancrage 5‑4‑3‑2‑1",
      de: "5‑4‑3‑2‑1-Erdungsübung",
      it: "Radicamento 5‑4‑3‑2‑1",
      pt: "Ancoragem 5‑4‑3‑2‑1"
    }
  ),
  "69505868395719979d90c8bd": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_1["local-grounding-54321"],
    {
      en: "5-4-3-2-1 Grounding Technique",
      he: "טכניקת קרקוע 5‑4‑3‑2‑1",
      es: "Técnica de anclaje 5‑4‑3‑2‑1",
      fr: "Technique d’ancrage 5‑4‑3‑2‑1",
      de: "5‑4‑3‑2‑1-Erdungstechnik",
      it: "Tecnica di radicamento 5‑4‑3‑2‑1",
      pt: "Técnica de ancoragem 5‑4‑3‑2‑1"
    }
  ),
  "69505868395719979d90c8c0": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_5A["local-stress-worry-postponement"],
    {
      en: "Scheduled Worry Time",
      he: "זמן דאגה מתוכנן",
      es: "Tiempo programado para preocuparse",
      fr: "Temps d’inquiétude planifié",
      de: "Geplante Sorgenzeit",
      it: "Tempo programmato per le preoccupazioni",
      pt: "Horário programado para preocupações"
    }
  ),
  "69505868395719979d90c8be": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_2["local-cognitive-thought-record"],
    {
      en: "Cognitive Reframing Worksheet",
      he: "דף עבודה למסגור קוגניטיבי מחדש",
      es: "Hoja de reencuadre cognitivo",
      fr: "Fiche de recadrage cognitif",
      de: "Arbeitsblatt zur kognitiven Neubewertung",
      it: "Scheda di riformulazione cognitiva",
      pt: "Folha de reenquadramento cognitivo"
    }
  ),
  "69519590cc9f81fd9daed0b1": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_1["local-grounding-54321"],
    {
      en: "Five Senses Grounding",
      he: "קרקוע באמצעות חמשת החושים",
      es: "Anclaje mediante los cinco sentidos",
      fr: "Ancrage par les cinq sens",
      de: "Erdung mit den fünf Sinnen",
      it: "Radicamento con i cinque sensi",
      pt: "Ancoragem pelos cinco sentidos"
    }
  ),
  "69519590cc9f81fd9daed0ae": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_1["local-grounding-body-scan"],
    {
      en: "Full Body Scan Meditation",
      he: "מדיטציית סריקת גוף מלאה",
      es: "Meditación de exploración corporal completa",
      fr: "Méditation complète par balayage corporel",
      de: "Vollständige Body-Scan-Meditation",
      it: "Meditazione completa di scansione corporea",
      pt: "Meditação de escaneamento corporal completo"
    }
  ),
  "69519590cc9f81fd9daed0b3": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_2["local-cognitive-thought-record"],
    {
      en: "Thought Record Challenge",
      he: "אתגר רישום מחשבות",
      es: "Desafío de registro de pensamientos",
      fr: "Défi du journal des pensées",
      de: "Gedankenprotokoll-Herausforderung",
      it: "Sfida del diario dei pensieri",
      pt: "Desafio do registro de pensamentos"
    }
  ),
  "69519590cc9f81fd9daed0b9": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_3A["local-behavioral-pleasure-mastery"],
    {
      en: "Pleasure-Mastery Balance",
      he: "איזון בין הנאה למסוגלות",
      es: "Equilibrio entre placer y dominio",
      fr: "Équilibre entre plaisir et maîtrise",
      de: "Balance zwischen Freude und Kompetenz",
      it: "Equilibrio tra piacere e padronanza",
      pt: "Equilíbrio entre prazer e domínio"
    }
  ),
  "69b11c0f9b78b21b9c2351ee": retitle(
    EXERCISE_CONTENT_TRANSLATIONS_BATCH_3B["local-mindfulness-urge-surfing"],
    {
      en: "Urge Surfing Basics",
      he: "יסודות גלישת דחפים",
      es: "Fundamentos del surf de impulsos",
      fr: "Bases du surf des impulsions",
      de: "Grundlagen des Urge-Surfings",
      it: "Basi del surf degli impulsi",
      pt: "Fundamentos do surfe de impulsos"
    }
  )
};
