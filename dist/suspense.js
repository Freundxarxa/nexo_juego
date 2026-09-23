import { ajustarFaseAnimacionPortada, elemento, mostrarPantalla } from "./interfaz.js";
/**
 * Safari puede pintar antes la X ligera que la base completa del logotipo.
 * Preparamos los tres recursos visibles de la portada mientras el jugador
 * permanece en la pantalla de suspense y no iniciamos el fundido hasta que
 * el navegador los tenga disponibles en memoria.
 */
function prepararImagenPortada(ruta) {
    return new Promise(function (resolver) {
        const imagen = new Image();
        imagen.addEventListener("load", function () { resolver(); }, { once: true });
        imagen.addEventListener("error", function () { resolver(); }, { once: true });
        imagen.src = ruta;
        if (imagen.complete)
            resolver();
    });
}
const preparacionVisualPortada = Promise.all([
    prepararImagenPortada("./assets/images/portada/fondos/fondo-inicio-nexo.webp"),
    prepararImagenPortada("./assets/images/portada/logo/nexo_logo_base_tipografia_original_hd.webp"),
    prepararImagenPortada("./assets/images/portada/logo/nexo_x_estatica_centrada_sin_limite.webp"),
    prepararImagenPortada("./assets/images/portada/botones/boton-jugar-prismatico-transparente.webp")
]).then(function () { return undefined; });
// AUDIO DE PORTADA · PRIMERA CAPA
// El clic de la pantalla de suspense permite iniciar el sonido sin usar
// reproducción automática. Esta pista solo acompaña a la portada de NEXO.
export const audioInicio = new Audio("./assets/audio/inicio/ambos-nexo.mp3?v=audio-inicio-v24-38");
audioInicio.loop = true;
// La portada no usa los volúmenes internos de la paleta de efectos. Aplicamos
// un refuerzo propio y limitado para que el antiguo 28% también sea audible.
const REFUERZO_AUDIO_INICIO = 2.0;
const DURACION_CICLO_AUDIO_INICIO = 11.101995;
let temporizadorAudioInicio = null;
let vigilanteBucleAudioInicio = 0;
let reintentoAudioInicioPendiente = false;
let vigilanteSincronizacionPortada = 0;
/**
 * Safari puede resolver play() antes de que currentTime empiece a avanzar.
 * La X ya está animada mientras tanto; en el primer avance real corregimos
 * únicamente su fase, sin detenerla ni reiniciar la animación.
 */
function sincronizarAnimacionPortadaCuandoAvance() {
    if (vigilanteSincronizacionPortada !== 0) {
        window.cancelAnimationFrame(vigilanteSincronizacionPortada);
    }
    const tiempoInicial = audioInicio.currentTime;
    function comprobarAvance() {
        const portadaActiva = elemento("pantalla-inicio").classList.contains("activa");
        if (!portadaActiva) {
            vigilanteSincronizacionPortada = 0;
            return;
        }
        if (!audioInicio.paused && audioInicio.currentTime > tiempoInicial + 0.012) {
            ajustarFaseAnimacionPortada(audioInicio.currentTime);
            vigilanteSincronizacionPortada = 0;
            return;
        }
        vigilanteSincronizacionPortada = window.requestAnimationFrame(comprobarAvance);
    }
    vigilanteSincronizacionPortada = window.requestAnimationFrame(comprobarAvance);
}
/** Convierte el porcentaje del control en un volumen válido entre 0 y 1. */
export function actualizarVolumenAudioInicio(porcentaje) {
    audioInicio.volume = Math.max(0, Math.min(1, (porcentaje / 100) * REFUERZO_AUDIO_INICIO));
}
function vigilarBucleAudioInicio() {
    if (audioInicio.paused) {
        vigilanteBucleAudioInicio = 0;
        return;
    }
    if (audioInicio.currentTime >= DURACION_CICLO_AUDIO_INICIO) {
        audioInicio.currentTime = 0;
    }
    vigilanteBucleAudioInicio = window.requestAnimationFrame(vigilarBucleAudioInicio);
    sincronizarAnimacionPortadaCuandoAvance();
}
function quitarReintentoAudioInicio() {
    if (!reintentoAudioInicioPendiente)
        return;
    reintentoAudioInicioPendiente = false;
    document.removeEventListener("pointerdown", reintentarAudioInicioDesdeGesto, true);
    document.removeEventListener("touchend", reintentarAudioInicioDesdeGesto, true);
}
function reintentarAudioInicioDesdeGesto() {
    quitarReintentoAudioInicio();
    if (localStorage.getItem("nexo-sonido") === "off")
        return;
    audioInicio.muted = false;
    const intento = audioInicio.play();
    if (intento !== undefined) {
        intento.then(quitarReintentoAudioInicio).catch(armarReintentoAudioInicio);
    }
}
function armarReintentoAudioInicio() {
    if (reintentoAudioInicioPendiente)
        return;
    reintentoAudioInicioPendiente = true;
    document.addEventListener("pointerdown", reintentarAudioInicioDesdeGesto, true);
    document.addEventListener("touchend", reintentarAudioInicioDesdeGesto, true);
}
/** Inicia la música dentro del gesto real para que Safari no la bloquee. */
export function reproducirAudioInicio(porcentaje) {
    if (temporizadorAudioInicio !== null) {
        window.clearInterval(temporizadorAudioInicio);
        temporizadorAudioInicio = null;
    }
    if (vigilanteBucleAudioInicio !== 0)
        window.cancelAnimationFrame(vigilanteBucleAudioInicio);
    actualizarVolumenAudioInicio(porcentaje);
    audioInicio.currentTime = 0;
    audioInicio.muted = false;
    if (audioInicio.paused) {
        const intento = audioInicio.play();
        if (intento !== undefined) {
            intento.then(quitarReintentoAudioInicio).catch(function (error) {
                armarReintentoAudioInicio();
                if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
                    console.warn("NEXO: el navegador no ha podido reproducir el audio de portada.", error.message);
                }
            });
        }
    }
    vigilanteBucleAudioInicio = window.requestAnimationFrame(vigilarBucleAudioInicio);
}
/** Detiene inmediatamente la pista cuando el jugador desactiva el sonido. */
export function pausarAudioInicio() {
    if (temporizadorAudioInicio !== null) {
        window.clearInterval(temporizadorAudioInicio);
        temporizadorAudioInicio = null;
    }
    if (vigilanteBucleAudioInicio !== 0)
        window.cancelAnimationFrame(vigilanteBucleAudioInicio);
    if (vigilanteSincronizacionPortada !== 0)
        window.cancelAnimationFrame(vigilanteSincronizacionPortada);
    vigilanteBucleAudioInicio = 0;
    vigilanteSincronizacionPortada = 0;
    quitarReintentoAudioInicio();
    audioInicio.pause();
    audioInicio.muted = false;
}
const pantallaSuspense = elemento("pantalla-suspense");
const svg = elemento("svg-suspense");
const lineaHumano1 = elemento("linea-humano-1");
const lineaHumano2 = elemento("linea-humano-2");
const lineaIa1 = elemento("linea-ia-1");
const lineaIa2 = elemento("linea-ia-2");
const circulo = elemento("masaCirculo");
const nucleo = elemento("nucleoCirculo");
const texto = elemento("texto-suspense");
const DURACION_MS = 3200;
const OP_MIN = 0.55;
const OP_MAX = 0.85;
const ESC_MIN = 1;
const ESC_MAX = 1.04;
let ancho = 0;
let alto = 0;
let centroX = 0;
let centroY = 0;
let escalaLienzo = 1;
let inicio = null;
let ultimoT = 0;
let tiempoCongelado = 0;
let cercania = 0;
let encima = false;
let activado = false;
let animacionId = 0;
function radioMinimo() {
    return 92 * escalaLienzo;
}
function radioMaximo() {
    return 112 * escalaLienzo;
}
function radioInfluencia() {
    return 260 * escalaLienzo;
}
function radioCongelado() {
    return 55 * escalaLienzo;
}
/** Ajusta el SVG al tamaño real que ocupa la pantalla del proyecto. */
function ajustarTamano() {
    const rectangulo = pantallaSuspense.getBoundingClientRect();
    ancho = Math.max(1, rectangulo.width);
    alto = Math.max(1, rectangulo.height);
    centroX = ancho / 2;
    centroY = alto / 2;
    escalaLienzo = Math.max(0.7, Math.min(1, Math.min(ancho / 1920, alto / 1080)));
    svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    lineaHumano1.setAttribute("x1", "0");
    lineaHumano1.setAttribute("y1", "0");
    lineaHumano1.setAttribute("x2", String(centroX));
    lineaHumano1.setAttribute("y2", String(centroY));
    lineaHumano2.setAttribute("x1", "0");
    lineaHumano2.setAttribute("y1", String(alto));
    lineaHumano2.setAttribute("x2", String(centroX));
    lineaHumano2.setAttribute("y2", String(centroY));
    lineaIa1.setAttribute("x1", String(ancho));
    lineaIa1.setAttribute("y1", "0");
    lineaIa1.setAttribute("x2", String(centroX));
    lineaIa1.setAttribute("y2", String(centroY));
    lineaIa2.setAttribute("x1", String(ancho));
    lineaIa2.setAttribute("y1", String(alto));
    lineaIa2.setAttribute("x2", String(centroX));
    lineaIa2.setAttribute("y2", String(centroY));
    circulo.setAttribute("cx", String(centroX));
    circulo.setAttribute("cy", String(centroY));
    nucleo.setAttribute("cx", String(centroX));
    nucleo.setAttribute("cy", String(centroY));
}
function actualizarPosicion(clientX, clientY) {
    const rectangulo = pantallaSuspense.getBoundingClientRect();
    const x = clientX - rectangulo.left;
    const y = clientY - rectangulo.top;
    const distancia = Math.hypot(x - centroX, y - centroY);
    encima = distancia < radioCongelado();
    const aproximacion = Math.max(0, 1 - distancia / radioInfluencia());
    cercania = Math.pow(aproximacion, 1.6);
}
function frame(t) {
    if (activado)
        return;
    if (inicio === null)
        inicio = t;
    if (ultimoT === 0)
        ultimoT = t;
    if (encima) {
        tiempoCongelado += t - ultimoT;
        circulo.setAttribute("r", String(radioMaximo() + 128 * escalaLienzo));
        texto.style.opacity = "1";
        texto.style.transform = `scale(${ESC_MAX + 0.3})`;
        texto.textContent = "pulsar";
    }
    else {
        const fase = ((t - inicio - tiempoCongelado) % DURACION_MS) / DURACION_MS;
        const brillo = (Math.sin(fase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
        const extra = cercania * 128 * escalaLienzo;
        circulo.setAttribute("r", String(radioMinimo() + brillo * (radioMaximo() - radioMinimo()) + extra));
        texto.style.opacity = String(Math.min(1, OP_MIN + brillo * (OP_MAX - OP_MIN) + cercania * 0.4));
        texto.style.transform = `scale(${ESC_MIN + brillo * (ESC_MAX - ESC_MIN) + cercania * 0.3})`;
        texto.textContent = brillo > 0.5 ? "pulsar" : "pulso";
    }
    ultimoT = t;
    animacionId = requestAnimationFrame(frame);
}
function activarJuego() {
    if (activado)
        return;
    activado = true;
    cancelAnimationFrame(animacionId);
    const sonidoActivo = localStorage.getItem("nexo-sonido") !== "off";
    const volumen = Number(localStorage.getItem("nexo-volumen") || "28");
    if (sonidoActivo) {
        // Tiene que ejecutarse directamente dentro de touchend/click: si esperamos
        // a la transición visual, Safari de iPhone pierde el permiso del gesto.
        reproducirAudioInicio(volumen);
    }
    void preparacionVisualPortada.then(function () {
        pantallaSuspense.classList.add("fade-out");
        window.setTimeout(function () {
            // La pista comenzó dentro del gesto unos instantes antes. Pasamos su
            // posición real para que el primer latido visible coincida con el audio.
            mostrarPantalla("pantalla-inicio", audioInicio.currentTime);
            sincronizarAnimacionPortadaCuandoAvance();
        }, 700);
    });
}
window.addEventListener("resize", ajustarTamano);
window.visualViewport?.addEventListener("resize", ajustarTamano);
// Safari en iPad puede resolver 100svh después del primer resize. Observar el
// propio lienzo evita conservar una geometría calculada con la barra visible.
const observadorTamanoSuspense = new ResizeObserver(function () {
    ajustarTamano();
});
observadorTamanoSuspense.observe(pantallaSuspense);
pantallaSuspense.addEventListener("mousemove", function (evento) {
    actualizarPosicion(evento.clientX, evento.clientY);
});
pantallaSuspense.addEventListener("mouseleave", function () {
    cercania = 0;
    encima = false;
});
pantallaSuspense.addEventListener("touchstart", function (evento) {
    const toque = evento.touches[0];
    if (toque !== undefined)
        actualizarPosicion(toque.clientX, toque.clientY);
}, { passive: true });
pantallaSuspense.addEventListener("touchmove", function (evento) {
    const toque = evento.touches[0];
    if (toque !== undefined)
        actualizarPosicion(toque.clientX, toque.clientY);
}, { passive: true });
pantallaSuspense.addEventListener("touchend", function () {
    cercania = 0;
    encima = false;
});
pantallaSuspense.addEventListener("touchcancel", function () {
    cercania = 0;
    encima = false;
});
pantallaSuspense.addEventListener("click", activarJuego);
ajustarTamano();
animacionId = requestAnimationFrame(frame);
