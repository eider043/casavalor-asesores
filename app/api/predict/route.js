import { predecir } from "../../../lib/predict";

export async function POST(req) {
  try {
    const { valores } = await req.json();
    return Response.json({ precio: predecir(valores) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}