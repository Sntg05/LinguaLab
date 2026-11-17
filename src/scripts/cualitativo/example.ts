/* ============================================================
   LinguaLab — análisis cualitativo: el ejemplo

   Un fragmento INVENTADO de entrevista sociolingüística, en el idioma de la
   página, con un libro de códigos de cuatro códigos. Sirve para ver la
   herramienta funcionando antes de usar material propio; no es un dato de
   nadie.
   ============================================================ */

import type { QualitativeCode } from "@lingualab/core";

export interface QualitativeExample {
  readonly codebook: readonly QualitativeCode[];
  readonly material: string;
}

const ES: QualitativeExample = {
  codebook: [
    {
      name: "Identidad",
      definition: "La persona se presenta como hablante de una lengua o miembro de una comunidad.",
      include: "«soy hablante», «mi lengua», «nosotros los…»",
      exclude: "Lo que dice de otras personas.",
      example: "Yo me siento wayuu porque hablo wayuunaiki.",
    },
    {
      name: "Transmisión familiar",
      definition: "Cómo se aprendió o se enseña la lengua en la familia.",
      include: "Abuelos, padres, hijos, la casa.",
      exclude: "La escuela o los cursos.",
      example: "Mi abuela me hablaba en la lengua.",
    },
    {
      name: "Escuela",
      definition: "La lengua en la escuela: clases, docentes, prohibiciones o programas.",
      include: "Aula, maestros, colegio, universidad.",
      exclude: "Aprendizaje en casa.",
      example: "En el colegio solo se hablaba español.",
    },
    {
      name: "Actitud",
      definition: "Una valoración, positiva o negativa, sobre la lengua o sus hablantes.",
      include: "Orgullo, vergüenza, utilidad, belleza.",
      exclude: "Descripciones sin valoración.",
      example: "Me daba pena hablarla en la calle.",
    },
  ],
  material: [
    "E: ¿Dónde aprendiste la lengua?",
    "P: En la casa, con mi abuela. Ella no hablaba casi español.",
    "E: ¿Y en la escuela?",
    "P: En la escuela no nos dejaban hablarla, la profesora nos regañaba.",
    "P: Por eso a veces me daba vergüenza hablarla delante de otros.",
    "P: Ahora no, ahora me siento orgullosa de ser hablante.",
    "E: ¿Tus hijos la hablan?",
    "P: Les hablo en la lengua en la casa, para que no se pierda.",
    "P: En el colegio de ellos ya hay un profesor bilingüe, eso es bueno.",
    "P: Yo digo que la lengua es lo que somos.",
  ].join("\n"),
};

const EN: QualitativeExample = {
  codebook: [
    {
      name: "Identity",
      definition: "The person presents themselves as a speaker of a language or a member of a community.",
      include: "“I am a speaker”, “my language”, “we the…”",
      exclude: "What they say about other people.",
      example: "I feel Welsh because I speak Welsh.",
    },
    {
      name: "Family transmission",
      definition: "How the language was learned or is taught in the family.",
      include: "Grandparents, parents, children, home.",
      exclude: "School or courses.",
      example: "My grandmother spoke to me in the language.",
    },
    {
      name: "School",
      definition: "The language at school: classes, teachers, bans or programmes.",
      include: "Classroom, teachers, school, university.",
      exclude: "Learning at home.",
      example: "At school only English was spoken.",
    },
    {
      name: "Attitude",
      definition: "An evaluation, positive or negative, of the language or its speakers.",
      include: "Pride, shame, usefulness, beauty.",
      exclude: "Descriptions without evaluation.",
      example: "I was embarrassed to speak it in the street.",
    },
  ],
  material: [
    "I: Where did you learn the language?",
    "P: At home, with my grandmother. She hardly spoke any English.",
    "I: And at school?",
    "P: At school they didn't let us speak it, the teacher told us off.",
    "P: That's why I was sometimes ashamed to speak it in front of others.",
    "P: Not anymore, now I'm proud to be a speaker.",
    "I: Do your children speak it?",
    "P: I speak to them in the language at home, so that it isn't lost.",
    "P: At their school there's a bilingual teacher now, that's good.",
    "P: I say the language is who we are.",
  ].join("\n"),
};

export const exampleFor = (locale: string): QualitativeExample => (locale === "en" ? EN : ES);
