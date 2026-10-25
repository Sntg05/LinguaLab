# Fase 2 — reconocimiento de fonos con Allosaurus

Propuesta de un servicio **opcional** que convierte audio en una secuencia de fonos AFI. **No está
desplegado, no está integrado en la interfaz y no se probó con lenguas colombianas.** Este documento
existe para que el día que alguien decida construirlo no tenga que rediseñar el contrato, y para que la
decisión se tome sabiendo qué cuesta.

El contrato del lado del cliente ya vive en el núcleo: `PhoneRecognitionPort`
(`packages/core/src/ports/phone-recognition.ts`), con su fake `InMemoryPhoneRecognition`.

---

## 1. Por qué esto necesita un servidor y las otras herramientas no

Todo lo demás del sitio corre en el navegador: no hay `fetch`, ni `FormData`, ni un destino remoto. El
reconocimiento de fonos rompe esa propiedad, y no por comodidad: Allosaurus es PyTorch, pesa cientos de
megas y una inferencia tarda más de lo que un curso tolera en una pestaña.

Consecuencias que hay que aceptar **antes** de escribir una línea de servidor:

- El audio de una persona **sale de su equipo**. Hoy la página de privacidad dice que no sale, y tendría
  que dejar de decirlo en `/visualizador` o en la herramienta nueva, con el mismo tono que usa
  `/seguridad`.
- La CSP actual (`default-src 'self'`) bloquea cualquier petición a otro origen. Hay que abrir
  `connect-src` al dominio del servicio, y eso es una decisión de despliegue, no un detalle.
- La promesa de «abre este sitio sin conexión» deja de valer para esa función. Sigue valiendo para el
  resto.

## 2. Lo que el resultado es, y lo que no es

**Es un borrador.** Allosaurus está entrenado con *AlloVoca*, un conjunto de unas 2 000 lenguas, y su
salida es una aproximación acústica al inventario AFI más probable. No conoce la fonología de la lengua
que está escuchando, no distingue pares mínimos y no marca límites de sílaba.

**No es una transcripción.** Presentarlo como tal repetiría el defecto que este proyecto ya corrigió en
el catálogo: una herramienta que exagera lo que hace es peor que una que no existe. La interfaz tendría
que decir, con esas palabras, que la salida **requiere corrección manual**.

**No se probó con lenguas colombianas.** Ni wayuunaiki, ni arhuaco, ni inga, ni nasa yuwe, ni las demás.
La calidad en una lengua que no estuvo en el entrenamiento es una incógnita, y el número que la resuelve
—error de fonema sobre un corpus anotado por hablantes— no existe todavía para ninguna de ellas.

## 3. Contrato HTTP (OpenAPI 3.1, resumido)

```yaml
openapi: 3.1.0
info:
  title: LinguaLab phone recognition (optional)
  version: 0.1.0
  description: >
    Servicio opcional de fase 2. Devuelve una secuencia de fonos AFI con tiempos y
    probabilidades. La salida es un borrador que requiere corrección manual.
servers:
  - url: https://phonemes.example.org
paths:
  /health:
    get:
      summary: Estado del servicio
      responses:
        "200":
          description: Servicio listo
          content:
            application/json:
              schema:
                type: object
                required: [status]
                properties:
                  status: { type: string, enum: [ok] }
                  model: { type: string, example: allosaurus-0.9 }
  /recognize:
    post:
      summary: Reconoce fonos en un audio corto
      requestBody:
        required: true
        content:
          audio/wav:
            schema:
              type: string
              format: binary
      parameters:
        - name: languageId
          in: query
          required: false
          description: Código ISO 639-3. Si falta, el modelo elige por acústica.
          schema: { type: string, pattern: "^[a-z]{3}$" }
      responses:
        "200":
          description: Fonos reconocidos, en orden temporal
          content:
            application/json:
              schema:
                type: object
                required: [phones, model]
                properties:
                  model: { type: string }
                  phones:
                    type: array
                    items:
                      type: object
                      required: [phone, startSeconds, endSeconds]
                      properties:
                        phone: { type: string, example: "a" }
                        startSeconds: { type: number, minimum: 0 }
                        endSeconds: { type: number, minimum: 0 }
                        probability: { type: number, minimum: 0, maximum: 1 }
        "413":
          description: El audio supera el límite de tamaño o de duración
        "415":
          description: Formato no soportado. Se aceptan WAV PCM 16 bits, mono o estéreo
        "422":
          description: El servicio no pudo procesar el audio (silencio, demasiado ruido)
        "503":
          description: Modelo no cargado o sobrecargado
```

**Campos y semántica, con las decisiones que importan:**

- Los tiempos son **segundos desde el inicio del archivo**, no muestras: el cliente ya trabaja en
  segundos y convertir dos veces invita a equivocarse.
- `probability` es opcional. Si el modelo no la da, no se inventa.
- El orden del arreglo **es** el orden temporal, y se declara así en la respuesta para no obligar a
  ordenar en el cliente.

## 4. Límites, y por qué esos

| Límite | Valor propuesto | Motivo |
|---|---|---|
| Tamaño del cuerpo | **10 MB** | Un WAV de 60 s a 16 kHz, 16 bits y mono pesa 1,9 MB; 10 MB da margen para estéreo y 44,1 kHz sin permitir una tesis entera |
| Duración del audio | **60 s** | La inferencia de Allosaurus crece con la duración y la memoria del contenedor no; 60 s es un tramo de campo, no un corpus |
| Tiempo de respuesta | **30 s** | Pasado ese tiempo el cliente muestra el error y deja reintentar; un `202` con sondeo agregaría estado que la fase 2 no necesita |
| Concurrencia por IP | **2** | Un aula entera probando a la vez no debe tumbar el servicio ni la factura |

Los topes se comprueban **antes** de decodificar, igual que en el visor de audio: un archivo que no
puede ser un tramo de 60 s no llega al modelo.

## 5. CORS

El sitio es estático y de un solo origen cambiante (Vercel, GitHub Pages, `localhost:4321`). La política
propuesta:

```
Access-Control-Allow-Origin: https://lingualab-beta.vercel.app
Access-Control-Allow-Origin: http://localhost:4321      # solo en desarrollo
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 600
```

**No** `*`. El servicio procesa audio de personas: un comodín lo deja abierto a cualquier página del
mundo que quiera usarlo como motor gratuito, y convierte el límite por IP en el único control.

Sin credenciales, sin cookies, sin `Access-Control-Allow-Credentials`: el servicio no sabe quién eres y
no debe poder saberlo.

## 6. Dockerfile de ejemplo

```dockerfile
# Fase 2, ejemplo mínimo. No probado contra el sitio: ver la advertencia del encabezado.
FROM python:3.12-slim

# Allosaurus trae PyTorch; se instala la rueda de CPU para no arrastrar CUDA.
RUN pip install --no-cache-dir \
      --extra-index-url https://download.pytorch.org/whl/cpu \
      torch==2.4.1+cpu \
      allosaurus==0.9.1 \
      fastapi==0.115.0 \
      uvicorn[standard]==0.30.6

# El modelo se descarga en la construcción, no en la primera petición: un
# contenedor que tarda 40 s en responder la primera vez es un contenedor roto.
RUN python -c "import allosaurus.app as a; a.Model()"

COPY app.py /app/app.py
WORKDIR /app

# Sin privilegios: el proceso no necesita escribir nada.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000
# Un worker: el modelo ocupa ~1,2 GB de RAM y dos copias no caben en el plan
# más barato. La concurrencia se resuelve con una cola corta, no con procesos.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

`app.py` no se incluye a propósito: escribirlo es parte del trabajo de la fase 2, y su contrato está en
la sección 3.

## 7. Qué haría falta para integrarlo

1. **Medir primero.** Un corpus corto anotado por hablantes de al menos una lengua colombiana, con su
   tasa de error por fonema. Sin ese número, la etiqueta correcta es «no disponible», no «experimental».
2. **Adaptador** `packages/adapters/src/phone-recognition/http-phone-recognition.ts` que implemente
   `PhoneRecognitionPort` con este contrato, con `isAvailable()` resolviendo `/health` una sola vez y
   `too-long` comprobando la duración **antes** de subir nada.
3. **Aviso en la interfaz** con la misma redacción que la sección 2 de este documento, y un enlace a
   este archivo.
4. **Cambiar la promesa de privacidad** en `/seguridad` y en la página que lo use, en los dos idiomas.
5. **Abrir la CSP** (`connect-src`) al dominio del servicio, y aceptar que ese día el sitio deja de ser
   «un solo origen» en esa función.

Mientras 1 no exista, este documento es una propuesta y no un plan: la honestidad del catálogo depende de
que la ficha diga `planned`, que es lo que dice hoy.
