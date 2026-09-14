import { elemento, mostrarPantalla } from "./interfaz.js";
import { reproducirSonido } from "./sonidos.js";
// AUDIO DE PORTADA · PRIMERA CAPA
// El clic de la pantalla de suspense permite iniciar el sonido sin usar
// reproducción automática. Esta pista solo acompaña a la portada de NEXO.
export const audioInicio = new Audio("./assets/audio/inicio/ambos-nexo.mp3?v=audio-inicio-v24-38");
audioInicio.loop = true;
// La portada no usa los volúmenes internos de la paleta de efectos. Aplicamos
// un refuerzo propio y limitado para que el antiguo 28% también sea audible.
const REFUERZO_AUDIO_INICIO = 2.0;
let temporizadorAudioInicio = null;
/** Convierte el porcentaje del control en un volumen válido entre 0 y 1. */
export function actualizarVolumenAudioInicio(porcentaje) {
    audioInicio.volume = Math.max(0, Math.min(1, (porcentaje / 100) * REFUERZO_AUDIO_INICIO));
}
/** Inicia la música de la portada con el volumen elegido por el jugador. */
export function reproducirAudioInicio(porcentaje) {
    if (temporizadorAudioInicio !== null) {
        window.clearInterval(temporizadorAudioInicio);
        temporizadorAudioInicio = null;
    }
    actualizarVolumenAudioInicio(porcentaje);
    audioInicio.muted = false;
    audioInicio.currentTime = 0;
    audioInicio.play().catch(function (error) {
        console.warn("NEXO: el navegador no ha podido reproducir el audio de portada.", error.message);
    });
}
/** Detiene inmediatamente la pista cuando el jugador desactiva el sonido. */
export function pausarAudioInicio() {
    if (temporizadorAudioInicio !== null) {
        window.clearInterval(temporizadorAudioInicio);
        temporizadorAudioInicio = null;
    }
    audioInicio.pause();
}
/**
 * Reduce el volumen poco a poco antes de abandonar la portada.
 * Utiliza setInterval y operaciones sencillas, sin Web Audio API.
 */
export function apagarAudioInicioSuavemente() {
    if (temporizadorAudioInicio !== null) {
        window.clearInterval(temporizadorAudioInicio);
    }
    if (audioInicio.paused)
        return;
    const volumenInicial = audioInicio.volume;
    const numeroPasos = 14;
    let pasoActual = 0;
    temporizadorAudioInicio = window.setInterval(function () {
        pasoActual++;
        audioInicio.volume = Math.max(0, volumenInicial * (1 - pasoActual / numeroPasos));
        if (pasoActual >= numeroPasos) {
            if (temporizadorAudioInicio !== null) {
                window.clearInterval(temporizadorAudioInicio);
                temporizadorAudioInicio = null;
            }
            audioInicio.pause();
            audioInicio.currentTime = 0;
        }
    }, 50);
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
    reproducirSonido("confirmar");
    cancelAnimationFrame(animacionId);
    const sonidoActivo = localStorage.getItem("nexo-sonido") !== "off";
    const volumen = Number(localStorage.getItem("nexo-volumen") || "28");
    if (sonidoActivo) {
        reproducirAudioInicio(volumen);
    }
    pantallaSuspense.classList.add("fade-out");
    window.setTimeout(function () {
        mostrarPantalla("pantalla-inicio");
    }, 700);
}
window.addEventListener("resize", ajustarTamano);
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
    activarJuego();
});
pantallaSuspense.addEventListener("touchcancel", function () {
    cercania = 0;
    encima = false;
});
pantallaSuspense.addEventListener("click", activarJuego);
ajustarTamano();
animacionId = requestAnimationFrame(frame);
