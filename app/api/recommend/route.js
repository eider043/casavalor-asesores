import { predecir } from "../../../lib/predict";

export const maxDuration = 30;

const limitarPalabras = (texto, max = 120) => {
  const p = texto.trim().split(/\s+/);
  return p.length <= max ? texto.trim() : p.slice(0, max).join(" ") + "…";
};

function respaldo(v, precio) {
  const usd = precio.toLocaleString("en-US");
  return limitarPalabras(
    `La estimación del modelo para este sector es de $${usd} USD (valor mediano de la zona). ` +
      `Si el precio pedido está por debajo, puede ser una buena oportunidad; si está claramente por encima, conviene negociar. ` +
      `Considera el ingreso medio del sector ($${Math.round(v.MedInc * 10000).toLocaleString("en-US")} USD/año), ` +
      `la antigüedad (${v.HouseAge} años) y la ocupación (${v.AveOccup} personas por hogar). ` +
      `Este es un mensaje automático de respaldo: valida con una tasación profesional.`
  );
}

export async function POST(req) {
  let v, precio;
  try {
    ({ valores: v } = await req.json());
    precio = predecir(v);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  try {
    if (!process.env.HF_TOKEN) throw new Error("Falta HF_TOKEN");

    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-7B-Instruct",
        max_tokens: 250,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Eres un asesor inmobiliario experto. Responde SIEMPRE en español, en máximo 120 palabras, " +
              "con una recomendación clara de compra (comprar, negociar o esperar) y 2 o 3 razones basadas solo en los datos dados. " +
              "No inventes datos. Aclara brevemente que es una estimación estadística.",
          },
          {
            role: "user",
            content:
              `Precio estimado: $${precio.toLocaleString("en-US")} USD (valor mediano del sector).\n` +
              `Ingreso medio del sector: $${Math.round(v.MedInc * 10000)} USD/año\n` +
              `Antigüedad: ${v.HouseAge} años\n` +
              `Habitaciones promedio: ${v.AveRooms}\n` +
              `Dormitorios promedio: ${v.AveBedrms}\n` +
              `Población del sector: ${v.Population}\n` +
              `Ocupantes por hogar: ${v.AveOccup}\n` +
              `Ubicación (California): lat ${v.Latitude}, lon ${v.Longitude}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`HF respondió ${res.status}`);
    const data = await res.json();
    const texto = data?.choices?.[0]?.message?.content;
    if (!texto) throw new Error("Respuesta vacía");

    return Response.json({ recomendacion: limitarPalabras(texto), respaldo: false });
  } catch (e) {
    console.error("Hugging Face falló:", e.message);
    return Response.json({ recomendacion: respaldo(v, precio), respaldo: true });
  }
}