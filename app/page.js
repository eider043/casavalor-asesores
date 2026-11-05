"use client";
import { useEffect, useRef, useState } from "react";

// Cada paso = una variable del modelo. "aModelo" convierte lo que escribe el usuario al valor que espera el modelo.
const PASOS = [
  { clave: "MedInc", icono: "payments", min: 5000, max: 150000, placeholder: "Ej: 48500",
    pregunta: "¿Cuál es el ingreso medio anual estimado del hogar en este sector (USD)?",
    aModelo: (n) => n / 10000, mostrar: (n) => `$${n.toLocaleString("en-US")} USD / año` },
  { clave: "HouseAge", icono: "event", min: 1, max: 52, placeholder: "Ej: 12",
    pregunta: "Registrado. ¿Cuántos años de antigüedad aproximados tiene la edificación (1 a 52)?",
    aModelo: (n) => n, mostrar: (n) => `${n} años` },
  { clave: "AveRooms", icono: "meeting_room", min: 1, max: 15, placeholder: "Ej: 5.5",
    pregunta: "Perfecto. ¿Cuál es el promedio de habitaciones por vivienda en el sector?",
    aModelo: (n) => n, mostrar: (n) => `${n} habitaciones en promedio` },
  { clave: "AveBedrms", icono: "bed", min: 0.5, max: 5, placeholder: "Ej: 1.1",
    pregunta: "¿Y el promedio de dormitorios por vivienda?",
    aModelo: (n) => n, mostrar: (n) => `${n} dormitorios en promedio` },
  { clave: "Population", icono: "groups", min: 3, max: 35000, placeholder: "Ej: 1400",
    pregunta: "Comprendido. ¿Cuántos habitantes tiene el sector (manzana censal)?",
    aModelo: (n) => n, mostrar: (n) => `${n.toLocaleString("en-US")} habitantes` },
  { clave: "AveOccup", icono: "home", min: 1, max: 10, placeholder: "Ej: 2.8",
    pregunta: "¿Cuántos ocupantes promedio hay por vivienda?",
    aModelo: (n) => n, mostrar: (n) => `${n} personas por hogar` },
  { clave: "Latitude", icono: "pin_drop", min: 32.5, max: 42, placeholder: "Ej: 34.05",
    pregunta: "Parámetro geográfico: ingresa la latitud en California (entre 32.5 y 42).",
    aModelo: (n) => n, mostrar: (n) => `Latitud: ${n}° N` },
  { clave: "Longitude", icono: "explore", min: -124.5, max: -114, placeholder: "Ej: -118.24",
    pregunta: "Último dato: ingresa la longitud en California (entre -124.5 y -114).",
    aModelo: (n) => n, mostrar: (n) => `Longitud: ${n}° E` },
];

const SALUDO = "¡Hola, colega! Iniciemos la tasación del inmueble. Trabajo con datos de California.";

function Bot({ children }) {
  return (
    <div className="flex items-start gap-2.5 max-w-[88%]">
      <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
        <span className="material-symbols-outlined text-[16px]">psychology</span>
      </div>
      <div className="p-3 bg-surface-container-low rounded-2xl rounded-bl-sm text-primary shadow-[0_2px_8px_rgba(10,37,64,0.03)] font-body-sm text-[13px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Usuario({ icono, children }) {
  return (
    <div className="flex items-end justify-end">
      <div className="max-w-[82%] px-3.5 py-2.5 bg-secondary-container text-on-secondary rounded-2xl rounded-br-sm shadow-[0_4px_14px_rgba(2,102,255,0.22)] font-body-sm text-[13px] font-medium flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[15px] opacity-90">{icono}</span>
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [mensajes, setMensajes] = useState([
    { de: "bot", texto: SALUDO },
    { de: "bot", texto: PASOS[0].pregunta },
  ]);
  const [paso, setPaso] = useState(0);
  const [valores, setValores] = useState({});
  const [entrada, setEntrada] = useState("");
  const [estado, setEstado] = useState("preguntando"); // preguntando | calculando | listo
  const [resultado, setResultado] = useState(null);
  const fin = useRef(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, resultado, estado]);

  const reiniciar = () => {
    setMensajes([{ de: "bot", texto: SALUDO }, { de: "bot", texto: PASOS[0].pregunta }]);
    setPaso(0); setValores({}); setEntrada(""); setResultado(null); setEstado("preguntando");
  };

  async function enviar() {
    if (estado !== "preguntando") return;
    const p = PASOS[paso];
    const n = Number(entrada.replace(",", "."));
    if (!entrada.trim() || !Number.isFinite(n) || n < p.min || n > p.max) {
      setMensajes((m) => [...m, { de: "bot", texto: `Ingresa un número entre ${p.min} y ${p.max}.` }]);
      setEntrada("");
      return;
    }
    const nuevos = { ...valores, [p.clave]: p.aModelo(n) };
    setValores(nuevos);
    setEntrada("");
    const base = [...mensajes, { de: "user", texto: p.mostrar(n), icono: p.icono }];

    if (paso < PASOS.length - 1) {
      setMensajes([...base, { de: "bot", texto: PASOS[paso + 1].pregunta }]);
      setPaso(paso + 1);
      return;
    }

    setMensajes([...base, { de: "bot", texto: "¡Excelente! Procesando las 8 variables en el modelo…" }]);
    setEstado("calculando");
    try {
      const opciones = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valores: nuevos }) };
      const r1 = await fetch("/api/predict", opciones);
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error);
      const r2 = await fetch("/api/recommend", opciones);
      const d2 = await r2.json();
      setResultado({ precio: d1.precio, texto: d2.recomendacion, respaldo: d2.respaldo, valores: nuevos });
      setEstado("listo");
    } catch (e) {
      setMensajes((m) => [...m, { de: "bot", texto: `Ocurrió un error: ${e.message}. Intenta de nuevo.` }]);
      setEstado("listo");
    }
  }

  const completados = estado === "preguntando" ? paso : PASOS.length;
  const pct = (completados / PASOS.length) * 100;

  return (
    <>
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_4px_20px_-4px_rgba(10,37,64,0.06)]">
        <div className="h-16 px-gutter flex items-center gap-space-sm">
          <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">home_work</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-md text-headline-md text-primary tracking-tight truncate">CasaValor</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim shadow-[0_0_8px_rgba(39,223,188,0.8)] animate-pulse" />
              <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant font-medium">Asesor IA Activo</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col relative w-full pt-16 pb-24 bg-surface min-h-screen">
        <section className="sticky top-16 z-40 bg-surface-container-lowest/95 backdrop-blur-md px-gutter py-space-sm shadow-[0_4px_16px_-2px_rgba(10,37,64,0.05)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary-container text-on-secondary">
                <span className="material-symbols-outlined text-[14px]">done_all</span>
              </span>
              <span className="font-headline-md text-[13px] text-primary truncate tracking-tight">Tasación con regresión lineal</span>
            </div>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-secondary-container rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 font-label-sm text-[11px] font-medium text-secondary">
            {completados} de {PASOS.length} factores verificados
          </div>
        </section>

        <div className="px-gutter pt-space-md pb-space-lg flex flex-col gap-space-md">
          {mensajes.map((m, i) =>
            m.de === "bot" ? <Bot key={i}>{m.texto}</Bot> : <Usuario key={i} icono={m.icono}>{m.texto}</Usuario>
          )}

          {estado === "calculando" && <Bot>Consultando al asesor IA…</Bot>}

          {resultado && (
            <>
              <div className="w-full bg-surface-container-lowest rounded-2xl p-space-md shadow-[0_8px_30px_rgba(10,37,64,0.06)] relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-secondary-container via-tertiary-fixed-dim to-secondary-container" />
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">analytics</span>
                  <span className="font-label-md text-label-md text-on-surface-variant font-bold uppercase tracking-wider">Valor Estimado</span>
                </div>
                <div className="text-on-surface-variant font-body-sm text-[12px] mb-1">Valor mediano sugerido del sector (USD)</div>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="font-headline-xl-mobile text-headline-xl-mobile text-primary tracking-tight">
                    ${resultado.precio.toLocaleString("en-US")}
                  </h2>
                  <span className="font-headline-md text-[16px] text-secondary font-semibold">USD</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-container p-2.5 rounded-xl">
                    <div className="font-label-sm text-[10px] text-on-surface-variant">Ingreso del sector</div>
                    <div className="font-headline-md text-[14px] text-primary font-bold">
                      ${Math.round(resultado.valores.MedInc * 10000).toLocaleString("en-US")}
                    </div>
                  </div>
                  <div className="bg-surface-container p-2.5 rounded-xl">
                    <div className="font-label-sm text-[10px] text-on-surface-variant">Antigüedad</div>
                    <div className="font-headline-md text-[14px] text-primary font-bold">{resultado.valores.HouseAge} años</div>
                  </div>
                </div>
              </div>

              <div className="w-full bg-surface-container-lowest rounded-2xl p-space-md shadow-[0_8px_30px_rgba(10,37,64,0.06)]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant font-label-md text-label-md font-semibold">
                    <span className="material-symbols-outlined text-[16px]">star</span>
                    Recomendación del asesor
                  </span>
                  {resultado.respaldo && (
                    <span className="font-label-sm text-[11px] text-on-surface-variant">Mensaje de respaldo</span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4 whitespace-pre-line">
                  {resultado.texto}
                </p>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="w-full h-12 bg-secondary-container hover:bg-secondary active:scale-[0.98] transition-all rounded-xl text-on-secondary font-headline-md text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(2,102,255,0.28)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  Nueva Consulta
                </button>
              </div>
            </>
          )}
          <div ref={fin} />
        </div>

        <div className="sticky bottom-16 z-40 bg-surface-container-lowest/95 backdrop-blur-xl px-gutter py-2.5 shadow-[0_-8px_20px_rgba(10,37,64,0.06)]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={entrada}
              disabled={estado !== "preguntando"}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder={estado === "preguntando" ? PASOS[paso].placeholder : "Consulta finalizada"}
              className="flex-1 h-11 px-3.5 rounded-xl bg-surface-container-low text-primary placeholder:text-on-surface-variant/70 font-body-sm text-[13px] outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all disabled:opacity-60"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={estado !== "preguntando"}
              className="w-11 h-11 rounded-xl bg-secondary-container hover:bg-secondary active:scale-95 text-on-secondary flex items-center justify-center transition-all flex-shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-4px_24px_-4px_rgba(10,37,64,0.06)]">
        <div className="flex justify-around items-center h-16 px-space-xs">
          {[["smart_toy", "Asesor", true], ["analytics", "Tasación"], ["domain", "Mercado"], ["folder_special", "Dossier"], ["account_circle", "Perfil"]].map(
            ([icono, nombre, activo]) => (
              <a
                key={nombre}
                href="#"
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[44px] px-space-xs py-1 transition-colors ${
                  activo ? "text-secondary font-semibold" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{icono}</span>
                <span className="font-label-sm text-label-sm">{nombre}</span>
              </a>
            )
          )}
        </div>
      </nav>
    </>
  );
}