# Lee un TextGrid con el Praat oficial, imprime lo que Praat entiende de él y
# lo vuelve a escribir en los dos formatos de texto de Praat.
#
# Lo usa `scripts/textgrid-praat-roundtrip.mts`: Praat es el árbitro de si un
# TextGrid exportado por LinguaLab se abre igual en Praat. Si el archivo no se
# puede leer, `Read from file` detiene el script con error y el proceso sale
# con código distinto de cero.
#
# Salida, una línea por dato y campos separados por tabuladores:
#   range <xmin> <xmax>
#   tiers <n>
#   tier <i> <interval|point> <nombre> <cantidad>
#   interval <inicio> <fin> <etiqueta>
#   point <tiempo> <etiqueta>
# Las etiquetas van al final de la línea, así que pueden tener espacios; no
# pueden tener tabuladores ni saltos de línea (los casos de la prueba no los
# usan, y el núcleo ya prueba esos casos contra su propio lector).

form: "Ida y vuelta"
  sentence: "input", ""
  sentence: "outLong", ""
  sentence: "outShort", ""
endform

grid = Read from file: input$
xmin = Get start time
xmax = Get end time
tiers = Get number of tiers
writeInfoLine: "range", tab$, fixed$ (xmin, 15), tab$, fixed$ (xmax, 15)
appendInfoLine: "tiers", tab$, tiers
for tier from 1 to tiers
  name$ = Get tier name: tier
  isInterval = Is interval tier: tier
  if isInterval
    n = Get number of intervals: tier
    appendInfoLine: "tier", tab$, tier, tab$, "interval", tab$, name$, tab$, n
    for i from 1 to n
      start = Get start time of interval: tier, i
      end = Get end time of interval: tier, i
      label$ = Get label of interval: tier, i
      appendInfoLine: "interval", tab$, fixed$ (start, 15), tab$, fixed$ (end, 15), tab$, label$
    endfor
  else
    n = Get number of points: tier
    appendInfoLine: "tier", tab$, tier, tab$, "point", tab$, name$, tab$, n
    for i from 1 to n
      time = Get time of point: tier, i
      label$ = Get label of point: tier, i
      appendInfoLine: "point", tab$, fixed$ (time, 15), tab$, label$
    endfor
  endif
endfor

selectObject: grid
Save as text file: outLong$
Save as short text file: outShort$
