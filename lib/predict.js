import model from "../model.json";

export const VARIABLES = model.variables;

// precio = intercepto + suma(coef_i * (x_i - media_i) / desv_i), x 100000
export function predecir(valores) {
  const x = model.variables.map((nombre) => Number(valores?.[nombre]));
  if (x.some((v) => !Number.isFinite(v))) {
    throw new Error(`Faltan variables numéricas: ${model.variables.join(", ")}`);
  }
  let z = model.intercepto;
  x.forEach((v, i) => {
    z += (model.coeficientes[i] * (v - model.medias[i])) / model.desviaciones[i];
  });
  return Math.max(0, Math.round(z * 100000)); // nunca negativo
}