/* ============================================================
   LinguaLab — ArborLab: ejemplos por tipo de árbol
   Cada entrada: entrada de texto precargada + opciones.
   ============================================================ */
window.TREE_EXAMPLES = {

  /* ===== LINGÜÍSTICOS ===== */
  dependency: [
    { name_es:"Gato saltando (proyectivo)", name_en:"Jumping cat (projective)",
      text:"1 El 2 det DET\n2 gato 3 nsubj NN\n3 saltó 0 root VBD\n4 la 5 det DT\n5 cerca 3 obl NN" },
    { name_es:"Arcos cruzados", name_en:"Crossing arcs",
      text:"1 Una 2 det DT\n2 audiencia 4 nsubj NN\n3 hoy 4 advmod RB\n4 está 0 root VBD\n5 programada 4 acl VBN\n6 sobre 7 case IN\n7 el 8 det DT\n8 tema 5 obl NN" },
    { name_es:"Frase en inglés (UD)", name_en:"English sentence (UD)",
      text:"1 The 2 det DT\n2 fox 3 nsubj NN\n3 jumps 0 root VBZ\n4 over 5 case IN\n5 the 6 det DT\n6 dog 3 obl NN" },
    { name_es:"CoNLL-U completo", name_en:"Full CoNLL-U",
      text:"1\tEl\tel\tDET\t_\t_\t2\tdet\t_\t_\n2\tgato\tgato\tNOUN\t_\t_\t3\tnsubj\t_\t_\n3\tsaltó\tsaltar\tVERB\t_\t_\t0\troot\t_\t_\n4\tla\tla\tDET\t_\t_\t5\tdet\t_\t_\n5\tcerca\tcerca\tNOUN\t_\t_\t3\tobj\t_\t_" }
  ],

  constituency: [
    { name_es:"Frase simple (ES)", name_en:"Simple sentence (ES)",
      text:"[S [SN [Det el] [Adj viejo] [N hombre]] [SV [V vio] [SN [Det la] [N casa]]]]" },
    { name_es:"Ambigüedad: PP en SV", name_en:"Ambiguity: PP in VP",
      text:"[S [NP [DT I]] [VP [V saw] [NP [DT the] [NN man]] [PP [IN with] [NP [DT the] [NN telescope]]]]]" },
    { name_es:"Ambigüedad: PP en SN", name_en:"Ambiguity: PP in NP",
      text:"[S [NP [DT I]] [VP [V saw] [NP [NP [DT the] [NN man]] [PP [IN with] [NP [DT the] [NN telescope]]]]]]" },
    { name_es:"Penn Treebank (paréntesis)", name_en:"Penn Treebank (round)",
      text:"(S (NP (DT The) (JJ quick) (NN fox)) (VP (VBD jumped)) (PP (IN over) (NP (DT the) (NN dog))))" },
    { name_es:"Subordinación", name_en:"Subordination",
      text:"[Oración [SN [Det La] [N chica]] [SV [V dice] [Que [S [SN [Det que] [N llueve]]]]]]" }
  ],

  xbar: [
    { name_es:"X-bar binario", name_en:"Binary X-bar",
      text:"[TP [Spec [DP the] [D student]] [T' [T Ø] [VP [V read] [CP [C Ø] [IP [DP a] [N book]]]]]]" },
    { name_es:"Complemento vs adjunto", name_en:"Complement vs adjunct",
      text:"[NP [Spec [Det the]] [N' [N student] [N' [PP of physics] [PP with long hair]]]]" },
    { name_es:"Espéculo y núcleo", name_en:"Specifier and head",
      text:"[VP [Spec [DP María]] [V' [V' [V lee] [DP un libro]] [AdvP often]]]" }
  ],

  movement: [
    { name_es:"Movimiento wh", name_en:"Wh-movement",
      text:"[CP [Spec which_road#wh] [C' [C Ø] [TP [Spec [DP t_i]] [T' [T is] [AdjP [Adj easy] [IP [VP [V to] [V' [V cross] [DP t_i#tr]]]]]]]]]\nmove: tr -> wh \"wh-movement\"" },
    { name_es:"Elevación (raising)", name_en:"Raising",
      text:"[TP [Spec [DP John]] [T' [T seems] [IP [VP [V t_seem] [AP [DP John] [A' [A to] [VP [V sleep]]]]]]]]\nmove: lower -> upper \"A-movement\"" },
    { name_es:"Pasoiva", name_en:"Passive",
      text:"[TP [Spec [DP The book]] [T' [T was] [VP [V read] [CP [by [DP Mary]]]]]]" }
  ],

  minimalist: [
    { name_es:"Shell vP", name_en:"vP shell",
      text:"[vP [Spec [DP Juan]] [v' [v' [vV read] [DP a book]] [TP...]]]" },
    { name_es:"Copia inferior (tachada)", name_en:"Lower copy (struck)",
      text:"[CP [Spec <what>] [C' [C Ø] [TP [Spec you] [T' [T will] [vP [Spec <what>] [v' buy <what>]]]]]]" },
    { name_es:"Fases CP y vP", name_en:"CP and vP phases",
      text:"[CP [Spec what] [C' [C Ø] [TP [Spec you] [T' [T will] [vP [Spec t] [v' buy [DP what#low]]]]]]]\nmove: low -> what \"internal Merge\"" }
  ],

  cartography: [
    { name_es:"Periferia izquierda (Rizzi)", name_en:"Left periphery (Rizzi)",
      text:"[ForceP [Force Ø] [TopP [Top [DP that#top]] [FocP [Foc Ø] [FinP [Fin [TP ...]]]]]]" },
    { name_es:"Orden de adverbios (Cinque)", name_en:"Adverb order (Cinque)",
      text:"[AspP [Adv frankly] [AspP [Adv fortunately] [AspP [Adv probably] [VP ...]]]]" }
  ],

  morphology: [
    { name_es:"unlockable — lectura 1", name_en:"unlockable — reading 1",
      text:"[Palabra [Pref un-] [Base [Base lock] [Suf -able]]]" },
    { name_es:"unlockable — lectura 2", name_en:"unlockable — reading 2",
      text:"[Palabra [Base [Pref un-] [Base lock]] [Suf -able]]" },
    { name_es:"Compuesto español", name_en:"Spanish compound",
      text:"[Palabra [Base [N saca] [N mochas]] [Suf -s]]" }
  ],

  semantic: [
    { name_es:"Tipos e,t", name_en:"Types e,t",
      text:"[S [NP every [type ⟨⟨e,t⟩,t⟩]] [VP sleeps [type ⟨e,t⟩]]]" },
    { name_es:"Elevación de cuantificador", name_en:"Quantifier raising",
      text:"[TP [S [VP λx.sleep(x) [type ⟨e,t⟩]] [every student [type ⟨⟨e,t⟩,t⟩]_i]] [T' [T Ø] [t_i]]]" }
  ],

  tag: [
    { name_es:"Árbol inicial (α)", name_en:"Initial tree (α)",
      text:"[α [S [NP↓] [VP [V sleep]]]]" },
    { name_es:"Árbol auxiliar (β) con pie", name_en:"Auxiliary tree (β) with foot",
      text:"[β [S* [AdjP often] [S*]]]" }
  ],

  lfg: [
    { name_es:"c-estructura", name_en:"c-structure",
      text:"[IP [NP María] [I' [I Ø] [VP [V lee] [NP un libro]]]]\nnote: (↑SUBJ)=↓ en el NP sujeto" },
    { name_es:"f-estructura compartida", name_en:"Shared f-structure",
      text:"[IP [NP Sara] [I' [I wants] [CP [IP [NP PRO] [I' [I to] [VP leave]]]]]]" }
  ],

  hpsg: [
    { name_es:"Entrada léxica", name_en:"Lexical entry",
      text:"[Sign [PHON read] [HEAD verb] [SUBJ ⟨[SPEC ⟨DP⟩]]⟩ [COMPS ⟨[NP obj]⟩]]" },
    { name_es:"Principio de rasgos de cabeza", name_en:"Head Feature Principle",
      text:"[S [HEAD [1]] [ daughters [HEAD [1]] ]]" }
  ],

  ccg: [
    { name_es:"Verbo transitivo", name_en:"Transitive verb",
      text:"[S\\NP]/NP" },
    { name_es:"Derivación con coordinación", name_en:"Coordination derivation",
      text:"[conj [S/NP cooked Ali] [conj [S/NP ate Sara]]]" }
  ],

  reedkellogg: [
    { name_es:"Sujeto y predicado", name_en:"Subject and predicate",
      text:"[Línea [Suj gato] [Pred [V saltó] [O cerca]]]" },
    { name_es:"Sujeto compuesto", name_en:"Compound subject",
      text:"[Línea [Suj [y gato perro]] [Pred [V corrió]]]" }
  ],

  relational: [
    { name_es:"Pasiva por estratos", name_en:"Passive by strata",
      text:"[Cláusula [1,2 libro] [2,1 leído] [P leyó]]" },
    { name_es:"Dativo (dative shift)", name_en:"Dative shift",
      text:"[Cláusula [3,2 hermano] [2,1 libro] [P dio]]" }
  ],

  general: [
    { name_es:"Jerarquía (sangría)", name_en:"Hierarchy (indent)",
      text:"Libro\n  Parte I\n    Capítulo 1\n      Sección 1.1\n    Capítulo 2\n  Parte II\n    Capítulo 3" },
    { name_es:"Familia (descendientes)", name_en:"Family (descendants)",
      text:"Abuelo\n  Padre\n    Hijo\n    Hija\n  Tía\n    Primo" },
    { name_es:"Carpetas con nota ( | )", name_en:"Folders with note ( | )",
      text:"proyecto/  |  raíz\n  src/\n    main.py\n  docs/\n    guia.md" }
  ],

  /* ===== ESTRUCTURAS DE DATOS ===== */
  bst: [
    { name_es:"Inserción normal", name_en:"Normal insertion", numeric:true,
      text:"50 30 70 20 40 60 80" },
    { name_es:"Peor caso (ordenado)", name_en:"Worst case (sorted)", numeric:true,
      text:"1 2 3 4 5 6 7" },
    { name_es:"Búsqueda tras insertar", name_en:"Search after insert", numeric:true,
      text:"8 3 10 1 6 14 4 7 13\nbuscar: 6" }
  ],
  avl: [
    { name_es:"Rotación simple", name_en:"Single rotation", numeric:true,
      text:"30 20 10" },
    { name_es:"Rotación doble", name_en:"Double rotation", numeric:true,
      text:"30 10 20" },
    { name_es:"Serie equilibrada", name_en:"Balanced series", numeric:true,
      text:"9 5 15 3 7 13 20" }
  ],
  redblack: [
    { name_es:"Reinserción (uncle rojo)", name_en:"Insertion (red uncle)", numeric:true,
      text:"10 20 30" },
    { name_es:"Rotación de abuelo", name_en:"Grandparent rotation", numeric:true,
      text:"10 30 20" }
  ],
  heap: [
    { name_es:"Min-heap", name_en:"Min-heap", numeric:true,
      text:"9 4 7 1 3 6 2" },
    { name_es:"Max-heap", name_en:"Max-heap", numeric:true, opts:{heapMode:"max"},
      text:"3 9 1 7 4 6 2" },
    { name_es:"Extraer raíz", name_en:"Extract root", numeric:true, opts:{extract:true},
      text:"2 8 5 1 9 3" }
  ],
  trie: [
    { name_es:"Palabras", name_en:"Words",
      text:"tea\nten\nto\nin\ninn\nidea" },
    { name_es:"Con compresión radix", name_en:"With radix compression", opts:{compress:true},
      text:"car\ncard\ncare\ncart\ncat\ncdog" }
  ],
  expr: [
    { name_es:"Precedencia", name_en:"Precedence",
      text:"3 + 4 * 2" },
    { name_es:"Potencias (asoc. derecha)", name_en:"Powers (right assoc)",
      text:"2 ^ 3 ^ 2" },
    { name_es:"Con funciones", name_en:"With functions",
      text:"(a + b) * sqrt(c) - min(d, e)" }
  ],
  huffman: [
    { name_es:"Texto corto", name_en:"Short text", text:"abracadabra" },
    { name_es:"Más frecuencias", name_en:"More frequencies", text:"the quick brown fox jumps over the lazy dog" }
  ],
  comparison: [{ name_es:"Tabla", name_en:"Table", text:"" }]
};
