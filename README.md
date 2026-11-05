# CasaValor Asesor IA

Chat de tasación hecho con Next.js (App Router). Un modelo de regresión lineal
(California Housing, exportado en `model.json`) estima el precio y un modelo de
Hugging Face (`Qwen/Qwen2.5-7B-Instruct`) redacta la recomendación en español.

## Estructura
- `app/page.js`: chat con el diseño de Stitch.
- `app/api/predict/route.js`: calcula el precio con `model.json`.
- `app/api/recommend/route.js`: llama a Hugging Face; si falla, devuelve un mensaje de respaldo.
- `lib/predict.js`: fórmula `precio = intercepto + Σ coef_i · (x_i − media_i) / desv_i`, multiplicada por 100000.

## Uso local
1. `npm install`
2. Copia `.env.example` a `.env.local` y pon tu token: `HF_TOKEN=hf_...`
   (créalo en https://huggingface.co/settings/tokens con permiso de Inference Providers).
3. `npm run dev` y abre http://localhost:3000

## Despliegue en Vercel
1. Sube el proyecto a GitHub.
2. En Vercel: **Add New → Project** e importa el repositorio.
3. En **Settings → Environment Variables** agrega `HF_TOKEN`.
4. Haz clic en **Deploy**.

## Probar la API
curl -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"valores":{"MedInc":4.85,"HouseAge":12,"AveRooms":5.5,"AveBedrms":1.1,"Population":1400,"AveOccup":2.8,"Latitude":34.05,"Longitude":-118.24}}'

## Notas
- El modelo solo es válido para California; fuera de ese rango extrapola y no es confiable.
- `MedInc` está en decenas de miles de USD: el chat convierte el ingreso anual dividiendo entre 10000.
- Sin `HF_TOKEN`, o si Hugging Face falla o tarda más de 20 s, la app muestra el mensaje de respaldo.
- Es una estimación estadística educativa, no una tasación profesional.