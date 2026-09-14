// V24.41 · La mezcla anterior aplicaba el 28% general sobre volúmenes ya
// reducidos y algunos efectos quedaban casi inaudibles. Este refuerzo conserva
// las proporciones de la paleta y Math.min impide superar el máximo de Audio.
const REFUERZO_MEZCLA_AUDIO = 2.2;
function calcularVolumenMezclado(volumenBase, porcentaje) {
    const volumenGeneral = Math.max(0, Math.min(100, porcentaje)) / 100;
    return Math.min(1, volumenBase * volumenGeneral * REFUERZO_MEZCLA_AUDIO);
}
/**
 * PALETA SONORA NEXO
 *
 * Es un objeto sencillo: cada función indica un único archivo, volumen y
 * canal. Así una misma acción siempre produce el mismo sonido y el jugador
 * aprende el lenguaje de la interfaz. No usamos Web Audio API ni clases nuevas.
 */
const SONIDOS = {
    interfaz: {
        ruta: "./assets/audio/sfx/ui/clic-01.mp3",
        volumen: 0.55,
        canal: "interfaz"
    },
    navegar: {
        ruta: "./assets/audio/sfx/ui/menu.mp3",
        volumen: 0.50,
        canal: "interfaz"
    },
    confirmar: {
        ruta: "./assets/audio/sfx/ui/confirmar.mp3",
        volumen: 0.42,
        canal: "interfaz"
    },
    panel: {
        ruta: "./assets/audio/sfx/ui/panel.mp3",
        volumen: 0.56,
        canal: "interfaz"
    },
    avatar: {
        ruta: "./assets/audio/sfx/cartas/seleccionar-02.mp3",
        volumen: 0.46,
        canal: "interfaz"
    },
    rondas: {
        ruta: "./assets/audio/sfx/ui/clic-03.mp3",
        volumen: 0.58,
        canal: "interfaz"
    },
    usuario: {
        ruta: "./assets/audio/sfx/ui/clic-03.mp3",
        volumen: 0.50,
        canal: "interfaz"
    },
    apuesta: {
        ruta: "./assets/audio/sfx/ui/clic-02.mp3",
        volumen: 0.58,
        canal: "interfaz"
    },
    carta: {
        ruta: "./assets/audio/sfx/cartas/seleccionar-01.mp3",
        volumen: 0.48,
        canal: "interfaz"
    },
    ajuste: {
        ruta: "./assets/audio/sfx/ui/clic-01.mp3",
        volumen: 0.62,
        canal: "interfaz"
    },
    fortaleza: {
        ruta: "./assets/audio/sfx/cartas/fortaleza.mp3",
        volumen: 0.26,
        canal: "especial"
    },
    cartaMixta: {
        ruta: "./assets/audio/sfx/eventos/carta-mixta.mp3",
        volumen: 0.30,
        canal: "evento"
    },
    eventoAlerta: {
        ruta: "./assets/audio/sfx/eventos/alerta.mp3",
        volumen: 0.16,
        canal: "evento"
    },
    eventoCritico: {
        ruta: "./assets/audio/sfx/eventos/critico.mp3",
        volumen: 0.11,
        canal: "evento"
    },
    convergencia: {
        ruta: "./assets/audio/sfx/resultados/convergencia.mp3",
        volumen: 0.22,
        canal: "resultado"
    },
    rivalidad: {
        ruta: "./assets/audio/sfx/resultados/rivalidad.mp3",
        volumen: 0.09,
        canal: "resultado"
    },
    fracaso: {
        ruta: "./assets/audio/sfx/resultados/fracaso.mp3",
        volumen: 0.16,
        canal: "resultado"
    },
    planetaMejora: {
        ruta: "./assets/audio/sfx/transiciones/planeta-mejora.mp3",
        volumen: 0.20,
        canal: "transicion"
    },
    evolucionMaxima: {
        ruta: "./assets/audio/sfx/transiciones/evolucion-maxima.mp3",
        volumen: 0.07,
        canal: "evolucion"
    },
    desenlace: {
        ruta: "./assets/audio/sfx/transiciones/desenlace.mp3",
        volumen: 0.18,
        canal: "desenlace"
    }
};
// INTRODUCCIÓN + CONFIGURACIÓN · V24.44
// Un único objeto Audio continúa sonando al pasar de una pantalla a la otra.
// Solo se detiene cuando el jugador inicia el protocolo.
const VOLUMEN_BASE_MUSICA_INTRO_CONFIG = 0.18;
const musicaIntroduccionConfiguracion = new Audio("./assets/audio/musica/introduccion-configuracion.mp3");
musicaIntroduccionConfiguracion.loop = true;
musicaIntroduccionConfiguracion.preload = "auto";
// La pista entregada tiene un comienzo muy tenue. Empezamos en el segundo 2
// y usamos un fundido sencillo para que entre de forma progresiva.
const INICIO_MUSICA_INTRO_CONFIG = 2;
const PASOS_FUNDIDO_MUSICA = 20;
const INTERVALO_FUNDIDO_MUSICA = 45;
let temporizadorMusicaIntroConfig = null;
let volumenObjetivoMusicaIntroConfig = 0;
// MÚSICA DE PARTIDA · FUNDIDO DE ENTRADA V24.44
// Es un Audio independiente de los efectos: por eso un clic o un evento
// puede sonar sin cortar la música de fondo. No se añade ninguna clase ni
// se utiliza Web Audio API.
const VOLUMEN_BASE_MUSICA_PARTIDA = 0.18;
const musicaPartida = new Audio("./assets/audio/musica/nexo-partida.mp3");
musicaPartida.loop = true;
musicaPartida.preload = "auto";
let temporizadorMusicaPartida = null;
let volumenObjetivoMusicaPartida = 0;
// PLANETA RESTAURADO · V24.46
// Acompaña la pantalla final cuando la Crisis queda entre el 1% y el 40%.
// Se repite hasta que el jugador vuelve a jugar, abandona la página o silencia
// el proyecto.
const VOLUMEN_BASE_PLANETA_RESTAURADO = 0.22;
const CRISIS_MINIMA_PLANETA_RESTAURADO = 1;
const CRISIS_MAXIMA_PLANETA_RESTAURADO = 40;
const musicaPlanetaRestaurado = new Audio("./assets/audio/final/planeta-restaurado.mp3");
musicaPlanetaRestaurado.loop = true;
musicaPlanetaRestaurado.preload = "auto";
// EQUILIBRIO RESTABLECIDO · V24.46
// Es la música exclusiva del mejor estado planetario: 0% de Crisis.
// Su nivel se mantiene alineado con la pista de recuperación parcial.
const VOLUMEN_BASE_EQUILIBRIO_RESTABLECIDO = 0.22;
const musicaEquilibrioRestablecido = new Audio("./assets/audio/final/equilibrio-restablecido.mp3");
musicaEquilibrioRestablecido.loop = true;
musicaEquilibrioRestablecido.preload = "auto";
// COLAPSO PLANETARIO · V24.41
// Esta tercera música larga solo se utiliza cuando la Crisis llega al 100%.
// Tiene su propio Audio para poder repetirse sin cortar los efectos breves.
const VOLUMEN_BASE_PLANETA_COLAPSO = 0.18;
const musicaPlanetaColapso = new Audio("./assets/audio/final/planeta-colapso.mp3");
musicaPlanetaColapso.loop = true;
musicaPlanetaColapso.preload = "auto";
// FINAL DE RIVALIDAD · V24.43
// Acompaña a una partida de duración fija que concluye con supremacía Humana
// o IA. Permanece en bucle hasta volver a jugar o silenciar el proyecto.
const VOLUMEN_BASE_RIVALIDAD_FINAL = 0.18;
const musicaRivalidadFinal = new Audio("./assets/audio/final/rivalidad-final.mp3");
musicaRivalidadFinal.loop = true;
musicaRivalidadFinal.preload = "auto";
const canalesActivos = {};
const audiosPreparados = {};
const temporizadoresSonido = [];
let interfazConectada = false;
function sonidoPermitido() {
    return localStorage.getItem("nexo-sonido") !== "off";
}
function volumenElegido() {
    const guardado = Number(localStorage.getItem("nexo-volumen") || "28");
    return Math.max(0, Math.min(100, guardado));
}
function obtenerAudio(nombre, configuracion) {
    let audio = audiosPreparados[nombre];
    if (audio === undefined) {
        audio = new Audio(configuracion.ruta);
        audio.preload = "auto";
        audio.load();
        audiosPreparados[nombre] = audio;
    }
    return audio;
}
/** Reproduce un efecto y detiene únicamente el anterior de su mismo canal. */
export function reproducirSonido(nombre) {
    const configuracion = SONIDOS[nombre];
    if (!sonidoPermitido() || configuracion === undefined)
        return;
    const anterior = canalesActivos[configuracion.canal];
    if (anterior !== undefined) {
        anterior.audio.pause();
        anterior.audio.currentTime = 0;
    }
    const audio = obtenerAudio(nombre, configuracion);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = calcularVolumenMezclado(configuracion.volumen, volumenElegido());
    canalesActivos[configuracion.canal] = {
        audio: audio,
        volumenBase: configuracion.volumen
    };
    audio.onended = function () {
        if (canalesActivos[configuracion.canal]?.audio === audio) {
            delete canalesActivos[configuracion.canal];
        }
    };
    audio.play().catch(function (error) {
        // Si llega otro clic muy rápido, rebobinar el mismo sonido cancela la
        // reproducción anterior de forma normal. Solo avisamos de errores reales.
        if (error.name !== "AbortError") {
            console.warn("NEXO: el navegador no ha podido reproducir un efecto de sonido.", error.message);
        }
    });
}
/** Cambia el volumen de los efectos que todavía estén sonando. */
export function actualizarVolumenEfectos(porcentaje) {
    const canales = Object.keys(canalesActivos);
    for (let i = 0; i < canales.length; i += 1) {
        const activo = canalesActivos[canales[i]];
        activo.audio.volume = calcularVolumenMezclado(activo.volumenBase, porcentaje);
    }
}
/** Inicia o reanuda la misma música en Introducción y Configuración. */
export function reproducirMusicaIntroduccionConfiguracion(porcentaje) {
    if (!sonidoPermitido())
        return;
    if (temporizadorMusicaIntroConfig !== null) {
        clearInterval(temporizadorMusicaIntroConfig);
        temporizadorMusicaIntroConfig = null;
    }
    volumenObjetivoMusicaIntroConfig = calcularVolumenMezclado(VOLUMEN_BASE_MUSICA_INTRO_CONFIG, porcentaje);
    if (musicaIntroduccionConfiguracion.currentTime < 0.1) {
        musicaIntroduccionConfiguracion.currentTime = INICIO_MUSICA_INTRO_CONFIG;
    }
    musicaIntroduccionConfiguracion.volume = 0;
    musicaIntroduccionConfiguracion.play().catch(function (error) {
        if (error.name !== "AbortError") {
            console.warn("NEXO: el navegador no ha podido reproducir la música de introducción.", error.message);
        }
    });
    let pasoActual = 0;
    temporizadorMusicaIntroConfig = setInterval(function () {
        pasoActual += 1;
        musicaIntroduccionConfiguracion.volume = volumenObjetivoMusicaIntroConfig * (pasoActual / PASOS_FUNDIDO_MUSICA);
        if (pasoActual >= PASOS_FUNDIDO_MUSICA) {
            if (temporizadorMusicaIntroConfig !== null)
                clearInterval(temporizadorMusicaIntroConfig);
            temporizadorMusicaIntroConfig = null;
            musicaIntroduccionConfiguracion.volume = volumenObjetivoMusicaIntroConfig;
        }
    }, INTERVALO_FUNDIDO_MUSICA);
}
/** Aplica el volumen general sin reiniciar la pista compartida. */
export function actualizarVolumenMusicaIntroduccionConfiguracion(porcentaje) {
    volumenObjetivoMusicaIntroConfig = calcularVolumenMezclado(VOLUMEN_BASE_MUSICA_INTRO_CONFIG, porcentaje);
    if (temporizadorMusicaIntroConfig === null) {
        musicaIntroduccionConfiguracion.volume = volumenObjetivoMusicaIntroConfig;
    }
}
/** Pausa la música de Introducción y Configuración. */
export function pausarMusicaIntroduccionConfiguracion(reiniciar = false) {
    if (temporizadorMusicaIntroConfig !== null) {
        clearInterval(temporizadorMusicaIntroConfig);
        temporizadorMusicaIntroConfig = null;
    }
    musicaIntroduccionConfiguracion.pause();
    if (reiniciar)
        musicaIntroduccionConfiguracion.currentTime = 0;
}
/** Reduce progresivamente la música compartida al comenzar la partida. */
export function apagarMusicaIntroduccionConfiguracionSuavemente() {
    if (temporizadorMusicaIntroConfig !== null) {
        clearInterval(temporizadorMusicaIntroConfig);
        temporizadorMusicaIntroConfig = null;
    }
    if (musicaIntroduccionConfiguracion.paused) {
        musicaIntroduccionConfiguracion.currentTime = 0;
        return;
    }
    const volumenInicial = musicaIntroduccionConfiguracion.volume;
    let pasoActual = 0;
    temporizadorMusicaIntroConfig = setInterval(function () {
        pasoActual += 1;
        musicaIntroduccionConfiguracion.volume = Math.max(0, volumenInicial * (1 - pasoActual / PASOS_FUNDIDO_MUSICA));
        if (pasoActual >= PASOS_FUNDIDO_MUSICA) {
            if (temporizadorMusicaIntroConfig !== null)
                clearInterval(temporizadorMusicaIntroConfig);
            temporizadorMusicaIntroConfig = null;
            musicaIntroduccionConfiguracion.pause();
            musicaIntroduccionConfiguracion.currentTime = 0;
        }
    }, INTERVALO_FUNDIDO_MUSICA);
}
/** Inicia o reanuda la música de fondo durante la pantalla de partida. */
export function reproducirMusicaPartida(porcentaje) {
    if (!sonidoPermitido())
        return;
    if (temporizadorMusicaPartida !== null) {
        clearInterval(temporizadorMusicaPartida);
        temporizadorMusicaPartida = null;
    }
    volumenObjetivoMusicaPartida = calcularVolumenMezclado(VOLUMEN_BASE_MUSICA_PARTIDA, porcentaje);
    const empiezaDesdeElPrincipio = musicaPartida.currentTime < 0.1;
    musicaPartida.volume = empiezaDesdeElPrincipio ? 0 : volumenObjetivoMusicaPartida;
    musicaPartida.play().catch(function (error) {
        if (error.name !== "AbortError") {
            console.warn("NEXO: el navegador no ha podido reproducir la música de partida.", error.message);
        }
    });
    if (empiezaDesdeElPrincipio) {
        let pasoActual = 0;
        temporizadorMusicaPartida = setInterval(function () {
            pasoActual += 1;
            musicaPartida.volume = volumenObjetivoMusicaPartida * (pasoActual / PASOS_FUNDIDO_MUSICA);
            if (pasoActual >= PASOS_FUNDIDO_MUSICA) {
                if (temporizadorMusicaPartida !== null)
                    clearInterval(temporizadorMusicaPartida);
                temporizadorMusicaPartida = null;
                musicaPartida.volume = volumenObjetivoMusicaPartida;
            }
        }, INTERVALO_FUNDIDO_MUSICA);
    }
}
/** Aplica a la música el mismo porcentaje elegido en Ajustes. */
export function actualizarVolumenMusicaPartida(porcentaje) {
    volumenObjetivoMusicaPartida = calcularVolumenMezclado(VOLUMEN_BASE_MUSICA_PARTIDA, porcentaje);
    if (temporizadorMusicaPartida === null) {
        musicaPartida.volume = volumenObjetivoMusicaPartida;
    }
}
/** Pausa la música; al salir de la partida también la devuelve al comienzo. */
export function pausarMusicaPartida(reiniciar = false) {
    if (temporizadorMusicaPartida !== null) {
        clearInterval(temporizadorMusicaPartida);
        temporizadorMusicaPartida = null;
    }
    musicaPartida.pause();
    if (reiniciar)
        musicaPartida.currentTime = 0;
}
/** Inicia o reanuda la música exclusiva del planeta recuperado. */
export function reproducirMusicaPlanetaRestaurado(porcentaje) {
    if (!sonidoPermitido())
        return;
    actualizarVolumenMusicaPlanetaRestaurado(porcentaje);
    musicaPlanetaRestaurado.play().catch(function (error) {
        if (error.name !== "AbortError") {
            console.warn("NEXO: el navegador no ha podido reproducir la música del planeta restaurado.", error.message);
        }
    });
}
/** Aplica a la música final el mismo porcentaje elegido en Ajustes. */
export function actualizarVolumenMusicaPlanetaRestaurado(porcentaje) {
    musicaPlanetaRestaurado.volume = calcularVolumenMezclado(VOLUMEN_BASE_PLANETA_RESTAURADO, porcentaje);
}
/** Pausa la música final y, al abandonar el desenlace, la rebobina. */
export function pausarMusicaPlanetaRestaurado(reiniciar = false) {
    musicaPlanetaRestaurado.pause();
    if (reiniciar)
        musicaPlanetaRestaurado.currentTime = 0;
}
/** Comprueba la franja de Crisis visible asignada a planeta-restaurado.mp3. */
export function correspondeMusicaPlanetaRestaurado(saludPlaneta) {
    const crisisPlaneta = 100 - saludPlaneta;
    return crisisPlaneta >= CRISIS_MINIMA_PLANETA_RESTAURADO
        && crisisPlaneta <= CRISIS_MAXIMA_PLANETA_RESTAURADO;
}
/** Inicia o reanuda la música del desenlace con equilibrio restablecido. */
export function reproducirMusicaEquilibrioRestablecido(porcentaje) {
    if (!sonidoPermitido())
        return;
    actualizarVolumenMusicaEquilibrioRestablecido(porcentaje);
    musicaEquilibrioRestablecido.play().catch(function (error) {
        if (error.name !== "AbortError") {
            console.warn("NEXO: el navegador no ha podido reproducir la música de equilibrio restablecido.", error.message);
        }
    });
}
/** Aplica a la música de equilibrio el porcentaje elegido en Ajustes. */
export function actualizarVolumenMusicaEquilibrioRestablecido(porcentaje) {
    musicaEquilibrioRestablecido.volume = calcularVolumenMezclado(VOLUMEN_BASE_EQUILIBRIO_RESTABLECIDO, porcentaje);
}
/** Pausa la música de equilibrio y, al abandonar el final, la rebobina. */
export function pausarMusicaEquilibrioRestablecido(reiniciar = false) {
    musicaEquilibrioRestablecido.pause();
    if (reiniciar)
        musicaEquilibrioRestablecido.currentTime = 0;
}
/** Inicia o reanuda la música exclusiva del colapso planetario. */
export function reproducirMusicaPlanetaColapso(porcentaje) {
    if (!sonidoPermitido())
        return;
    actualizarVolumenMusicaPlanetaColapso(porcentaje);
    musicaPlanetaColapso.play().catch(function (error) {
        if (error.name !== "AbortError") {
            console.warn("NEXO: el navegador no ha podido reproducir la música del colapso planetario.", error.message);
        }
    });
}
/** Aplica a la música de colapso el porcentaje elegido en Ajustes. */
export function actualizarVolumenMusicaPlanetaColapso(porcentaje) {
    musicaPlanetaColapso.volume = calcularVolumenMezclado(VOLUMEN_BASE_PLANETA_COLAPSO, porcentaje);
}
/** Pausa la música de colapso y, al abandonar el final, la rebobina. */
export function pausarMusicaPlanetaColapso(reiniciar = false) {
    musicaPlanetaColapso.pause();
    if (reiniciar)
        musicaPlanetaColapso.currentTime = 0;
}
/** Inicia o reanuda la música del final alcanzado por Rivalidad. */
export function reproducirMusicaRivalidadFinal(porcentaje) {
    if (!sonidoPermitido())
        return;
    actualizarVolumenMusicaRivalidadFinal(porcentaje);
    musicaRivalidadFinal.play().catch(function (error) {
        if (error.name !== "AbortError") {
            console.warn("NEXO: el navegador no ha podido reproducir la música final de Rivalidad.", error.message);
        }
    });
}
/** Aplica a la música final de Rivalidad el porcentaje de Ajustes. */
export function actualizarVolumenMusicaRivalidadFinal(porcentaje) {
    musicaRivalidadFinal.volume = calcularVolumenMezclado(VOLUMEN_BASE_RIVALIDAD_FINAL, porcentaje);
}
/** Pausa la música de Rivalidad y puede devolverla al comienzo. */
export function pausarMusicaRivalidadFinal(reiniciar = false) {
    musicaRivalidadFinal.pause();
    if (reiniciar)
        musicaRivalidadFinal.currentTime = 0;
}
/** Detiene todos los efectos breves al silenciar el juego. */
export function detenerEfectos() {
    cancelarEfectosProgramados();
    const canales = Object.keys(canalesActivos);
    for (let i = 0; i < canales.length; i += 1) {
        const activo = canalesActivos[canales[i]];
        activo.audio.pause();
        activo.audio.currentTime = 0;
        delete canalesActivos[canales[i]];
    }
}
/** Evita que un efecto retrasado de la ronda anterior suene en la siguiente. */
export function cancelarEfectosProgramados() {
    for (let i = 0; i < temporizadoresSonido.length; i += 1) {
        window.clearTimeout(temporizadoresSonido[i]);
    }
    temporizadoresSonido.length = 0;
}
function programarSonido(nombre, retraso) {
    const temporizador = window.setTimeout(function () {
        const posicion = temporizadoresSonido.indexOf(temporizador);
        if (posicion !== -1)
            temporizadoresSonido.splice(posicion, 1);
        reproducirSonido(nombre);
    }, retraso);
    temporizadoresSonido.push(temporizador);
}
/** Pide al navegador que prepare los archivos sin reproducirlos. */
export function precargarEfectos() {
    const nombres = Object.keys(SONIDOS);
    for (let i = 0; i < nombres.length; i += 1) {
        obtenerAudio(nombres[i], SONIDOS[nombres[i]]);
    }
    musicaPartida.load();
    musicaIntroduccionConfiguracion.load();
    musicaPlanetaRestaurado.load();
    musicaPlanetaColapso.load();
    musicaRivalidadFinal.load();
}
function esBotonPrincipal(id) {
    const principales = [
        "btn-jugar",
        "btn-ir-configuracion",
        "btn-iniciar-partida",
        "btn-confirmar-jugada",
        "btn-siguiente",
        "btn-volver-jugar",
        "btn-cerrar-evento"
    ];
    return principales.indexOf(id) !== -1;
}
function esBotonPanel(id) {
    const paneles = [
        "btn-ajustes",
        "btn-ajustes-global",
        "btn-ayuda-juego",
        "btn-como-jugar-intro",
        "btn-manual-desde-ajustes",
        "btn-cerrar-ajustes",
        "btn-cerrar-manual"
    ];
    return paneles.indexOf(id) !== -1;
}
function esBotonNavegacion(id) {
    const navegacion = [
        "btn-intro-atras",
        "btn-ir-configuracion",
        "btn-saltar-intro",
        "btn-abandonar"
    ];
    return navegacion.indexOf(id) !== -1;
}
function esBotonFortaleza(id) {
    const fortalezas = [
        "btn-precision-mantener",
        "btn-precision-corregir",
        "btn-velocidad-aplicar"
    ];
    return fortalezas.indexOf(id) !== -1;
}
/**
 * Un único listener atiende los botones actuales y los que crea pintarMano().
 * Así no repetimos el mismo addEventListener en cada botón del proyecto.
 */
export function conectarSonidosInterfaz() {
    if (interfazConectada)
        return;
    interfazConectada = true;
    document.addEventListener("click", function (evento) {
        const objetivo = evento.target;
        const boton = objetivo?.closest("button");
        if (boton !== undefined && boton !== null) {
            if (boton.classList.contains("carta-mano")) {
                reproducirSonido("carta");
            }
            else if (boton.classList.contains("boton-opcion")) {
                reproducirSonido("rondas");
            }
            else if (boton.id === "btn-apuesta-par" || boton.id === "btn-apuesta-impar") {
                reproducirSonido("apuesta");
            }
            else if (esBotonFortaleza(boton.id)) {
                reproducirSonido("fortaleza");
            }
            else if (esBotonPrincipal(boton.id)) {
                reproducirSonido("confirmar");
            }
            else if (esBotonPanel(boton.id)) {
                reproducirSonido("panel");
            }
            else if (esBotonNavegacion(boton.id)) {
                reproducirSonido("navegar");
            }
            else {
                reproducirSonido("interfaz");
            }
            return;
        }
        if (objetivo !== null && objetivo.closest(".tarjeta-avatar") !== null) {
            reproducirSonido("avatar");
        }
        else if (objetivo?.id === "superposicion-ajustes") {
            reproducirSonido("panel");
        }
    }, true);
    document.addEventListener("change", function (evento) {
        const control = evento.target;
        if (control === null)
            return;
        if (control.id === "control-volumen") {
            reproducirSonido("ajuste");
        }
        else if (control.id === "control-sonido") {
            if (control instanceof HTMLInputElement && control.checked)
                reproducirSonido("ajuste");
        }
        else if (control.id === "selector-jugadores") {
            reproducirSonido("usuario");
        }
    });
}
/** Todos los eventos especiales comparten una misma señal reconocible. */
export function reproducirEvento(idEvento) {
    reproducirSonido("eventoAlerta");
}
/** Todas las cartas/modificadores de crisis comparten su propia señal fija. */
export function reproducirCartaCrisis(tipo) {
    reproducirSonido("cartaMixta");
}
function porcentaje(valor, maximo) {
    return Math.max(0, Math.min(100, Math.round((valor / maximo) * 100)));
}
function tramo(valor) {
    if (valor >= 100)
        return 4;
    if (valor < 25)
        return 0;
    if (valor < 50)
        return 1;
    if (valor < 75)
        return 2;
    return 3;
}
/**
 * Acompaña el resultado y solo añade una transición cuando se cruza realmente
 * un 25%, 50%, 75% o 100%. Una actualización dentro del mismo tramo no suena.
 */
export function reproducirFeedbackDeRonda(resumen) {
    let resultadoSonoro = "fracaso";
    if (resumen.resultado === "CONVERGENCIA")
        resultadoSonoro = "convergencia";
    else if (resumen.resultado === "RIVALIDAD")
        resultadoSonoro = "rivalidad";
    programarSonido(resultadoSonoro, 160);
    const crisisAntes = 100 - porcentaje(resumen.saludPlanetaAntes, 100);
    const crisisDespues = 100 - porcentaje(resumen.saludPlanetaDespues, 100);
    if (tramo(crisisAntes) !== tramo(crisisDespues)) {
        programarSonido(crisisDespues < crisisAntes ? "planetaMejora" : "eventoCritico", 620);
    }
    const humanoAntes = porcentaje(resumen.evolucionJugadorAntes, 40);
    const humanoDespues = porcentaje(resumen.evolucionJugadorDespues, 40);
    const iaAntes = porcentaje(resumen.evolucionIAAntes, 40);
    const iaDespues = porcentaje(resumen.evolucionIADespues, 40);
    if (tramo(humanoAntes) !== tramo(humanoDespues)) {
        programarSonido(humanoDespues === 100 ? "evolucionMaxima" : "fortaleza", 1450);
    }
    if (tramo(iaAntes) !== tramo(iaDespues)) {
        programarSonido(iaDespues === 100 ? "evolucionMaxima" : "cartaMixta", 2050);
    }
    if (resumen.capacidadConquistada !== "") {
        programarSonido("fortaleza", 2700);
    }
}
export function reproducirDesenlace() {
    reproducirSonido("desenlace");
}
