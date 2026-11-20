# pos 2026.11.20

Etiquetadores UPOS (perceptrón promediado, Collins 2002) de la estación de texto de LinguaLab. Los
genera `scripts/train-pos.mts`; no se editan a mano. Licencias y procedencia en `LICENSE`.

| Lengua | Treebank | Precisión en `test` | Palabras desconocidas |
|---|---|---|---|
| es | UD_Spanish-AnCora | 97.83 % de 53622 | 92.74 % |
| en | UD_English-EWT | 94.03 % de 25094 | 78.26 % |

La precisión se mide con la tokenización del treebank. Sobre otro tipo de texto, o con otra
tokenización, será menor.
