import { Partida } from "./Partida.js";
import { guardarMejorMarca, guardarPerfil, importarProgresoAnteriorSiExiste, listarJugadores, seleccionarJugador } from "./almacenamiento.js";
import { elemento, escribir, habilitarCartasTrasApuesta, mostrar, mostrarEvento, mostrarPantalla, ocultar, ocultarEvento, ocultarResolucion, pintarApuestaElegida, pintarCabeceraRonda, pintarCapacidades, pintarCartasIA, pintarDeclaracionIA, pintarEvolucionVisual, pintarFinal, pintarMano, pintarMarcadores, pintarMejorMarca, pintarMemoria, pintarPistas, pintarResolucion, pintarSeleccionCartas } from "./interfaz.js";
import { audioInicio, actualizarVolumenAudioInicio, apagarAudioInicioSuavemente, pausarAudioInicio, reproducirAudioInicio } from "./suspense.js";
import { actualizarVolumenEfectos, actualizarVolumenMusicaEquilibrioRestablecido, actualizarVolumenMusicaIntroduccionConfiguracion, actualizarVolumenMusicaPartida, actualizarVolumenMusicaPlanetaColapso, actualizarVolumenMusicaPlanetaRestaurado, actualizarVolumenMusicaRivalidadFinal, apagarMusicaIntroduccionConfiguracionSuavemente, cancelarEfectosProgramados, conectarSonidosInterfaz, correspondeMusicaPlanetaRestaurado, detenerEfectos, pausarMusicaEquilibrioRestablecido, pausarMusicaIntroduccionConfiguracion, pausarMusicaPartida, pausarMusicaPlanetaColapso, pausarMusicaPlanetaRestaurado, pausarMusicaRivalidadFinal, precargarEfectos, reproducirCartaCrisis, reproducirDesenlace, reproducirEvento, reproducirFeedbackDeRonda, reproducirMusicaEquilibrioRestablecido, reproducirMusicaIntroduccionConfiguracion, reproducirMusicaPartida, reproducirMusicaPlanetaColapso, reproducirMusicaPlanetaRestaurado, reproducirMusicaRivalidadFinal, reproducirSonido } from "./sonidos.js";
let partida = null;
let fase = "apuesta";
let apuestaElegida = null;
let cartasSeleccionadas = [];
// Configuración elegida en la pantalla previa a la partida.
let avatarElegido = "humano-hombre";
let avatarIAElegido = "ia-01";
let rondasElegidas = 12;
let nombreJugadorElegido = "";
// Bloque narrativo visible en la introducción (0 = primero, 3 = último).
let bloqueIntroActual = 0;
let cartaCrisisPendienteDeSonido = false;
let finalConMusicaRivalidad = false;
// Ajustes de sonido. Se guardan para respetar la preferencia del usuario.
let sonidoActivo = localStorage.getItem("nexo-sonido") !== "off";
let volumenSonido = Number(localStorage.getItem("nexo-volumen") || "28");
// El MP3 contiene once latidos dobles dentro de cada ciclo de descargas.
// Usamos las duraciones medidas de ambos ciclos para que la X y los nodos
// mantengan su fase incluso después de varias repeticiones de la pista.
const DURACION_PULSO_PORTADA = 1.009272;
const DURACION_DESCARGAS_PORTADA = 11.101995;
/**
 * Ajusta el punto de inicio de la animación al tiempo que lleva sonando el MP3.
 * La clase temporal detiene la animación durante un fotograma; al retirarla,
 * CSS vuelve a empezar desde la fase exacta indicada por las dos variables.
 */
function sincronizarPulsoPortada() {
    const logo = document.querySelector("#pantalla-inicio .logo-nexo-animado");
    if (logo === null)
        return;
    const faseAudio = audioInicio.currentTime % DURACION_PULSO_PORTADA;
    const faseDescargas = audioInicio.currentTime % DURACION_DESCARGAS_PORTADA;
    logo.classList.add("reiniciar-animacion-audio");
    logo.style.setProperty("--desfase-pulso-audio", `-${faseAudio.toFixed(6)}s`);
    logo.style.setProperty("--desfase-descarga-audio", `-${faseDescargas.toFixed(6)}s`);
    window.requestAnimationFrame(function () {
        logo.classList.remove("reiniciar-animacion-audio");
    });
}
// ---- Arranque ------------------------------------------------------------
/** Conecta todos los botones de la página. Se ejecuta una sola vez. */
function iniciar() {
    // Precargamos la pista desde el archivo principal para evitar que el
    // navegador conserve una versión anterior del módulo de suspense.
    audioInicio.preload = "auto";
    audioInicio.id = "audio-inicio-nexo";
    audioInicio.hidden = true;
    audioInicio.setAttribute("aria-hidden", "true");
    document.body.appendChild(audioInicio);
    audioInicio.load();
    audioInicio.addEventListener("playing", function () {
        sincronizarPulsoPortada();
        // La portada aparece 700 ms después del clic de suspense.
        window.setTimeout(sincronizarPulsoPortada, 700);
    });
    elemento("btn-jugar").addEventListener("click", function () {
        apagarAudioInicioSuavemente();
        bloqueIntroActual = 0;
        mostrarBloqueIntro();
        mostrarPantalla("pantalla-introduccion");
        reproducirMusicaIntroduccionConfiguracionSiCorresponde();
    });
    // El mismo botón CONTINUAR avanza por los cuatro bloques.
    // En el último bloque conduce a la pantalla de configuración.
    elemento("btn-ir-configuracion").addEventListener("click", avanzarIntro);
    elemento("btn-intro-atras").addEventListener("click", retrocederIntro);
    elemento("btn-saltar-intro").addEventListener("click", saltarIntro);
    elemento("btn-como-jugar-intro").addEventListener("click", abrirManual);
    elemento("btn-ayuda-juego").addEventListener("click", abrirManual);
    elemento("btn-manual-desde-ajustes").addEventListener("click", abrirManual);
    elemento("btn-cerrar-manual").addEventListener("click", cerrarManual);
    elemento("btn-iniciar-partida").addEventListener("click", empezarPartida);
    elemento("btn-apuesta-par").addEventListener("click", function () {
        elegirApuesta("PAR");
    });
    elemento("btn-apuesta-impar").addEventListener("click", function () {
        elegirApuesta("IMPAR");
    });
    // CARTAS · V10
    // Los botones conectan su click directamente al crearse en pintarMano().
    elemento("btn-confirmar-jugada").addEventListener("click", confirmar);
    elemento("btn-precision-mantener").addEventListener("click", mantenerCartaPrecision);
    elemento("btn-precision-corregir").addEventListener("click", corregirCartaPrecision);
    elemento("btn-siguiente").addEventListener("click", siguiente);
    elemento("btn-cerrar-evento").addEventListener("click", cerrarEventoDeRonda);
    prepararAjustes();
    elemento("btn-abandonar").addEventListener("click", function () {
        if (partida !== null) {
            partida.abandonar();
            terminarPartida(false);
        }
    });
    elemento("btn-volver-jugar").addEventListener("click", function () {
        pausarMusicaIntroduccionConfiguracion(true);
        pausarMusicaPlanetaRestaurado(true);
        pausarMusicaEquilibrioRestablecido(true);
        pausarMusicaPlanetaColapso(true);
        pausarMusicaRivalidadFinal(true);
        finalConMusicaRivalidad = false;
        partida = null;
        pintarMejorMarca();
        mostrarPantalla("pantalla-inicio");
        reproducirAudioInicioSiCorresponde();
    });
    prepararOpcionesConfig();
    prepararJugadores();
    conectarSonidosInterfaz();
    precargarEfectos();
    pintarMejorMarca();
    mostrarPantalla("pantalla-suspense");
}
/** Muestra uno de los cuatro bloques narrativos de la introducción. */
function mostrarBloqueIntro() {
    const bloques = document.querySelectorAll(".bloque-intro");
    const pasos = document.querySelectorAll(".paso-nexo");
    for (let i = 0; i < bloques.length; i++) {
        const bloque = bloques[i];
        if (i === bloqueIntroActual) {
            bloque.hidden = false;
            bloque.classList.remove("activo");
            // Forzamos un nuevo inicio de la animación al volver a un bloque.
            void bloque.offsetWidth;
            bloque.classList.add("activo");
        }
        else {
            bloque.hidden = true;
            bloque.classList.remove("activo");
        }
    }
    for (let i = 0; i < pasos.length; i++) {
        const paso = pasos[i];
        paso.classList.remove("activo", "completado");
        if (i < bloqueIntroActual) {
            paso.classList.add("completado");
        }
        else if (i === bloqueIntroActual) {
            paso.classList.add("activo");
        }
    }
    const botonAtras = elemento("btn-intro-atras");
    botonAtras.disabled = bloqueIntroActual === 0;
    const botonContinuar = elemento("btn-ir-configuracion");
    if (bloqueIntroActual === 3) {
        botonContinuar.classList.add("ultimo-paso");
        botonContinuar.setAttribute("aria-label", "Finalizar introducción y continuar a la configuración");
    }
    else {
        botonContinuar.classList.remove("ultimo-paso");
        botonContinuar.setAttribute("aria-label", "Continuar la introducción");
    }
}
/** Avanza un bloque; desde el cuarto continúa a la configuración. */
function avanzarIntro() {
    if (bloqueIntroActual < 3) {
        bloqueIntroActual++;
        mostrarBloqueIntro();
    }
    else {
        abrirConfiguracion();
    }
}
/** Permite releer el bloque anterior sin abandonar la introducción. */
function retrocederIntro() {
    if (bloqueIntroActual > 0) {
        bloqueIntroActual--;
        mostrarBloqueIntro();
    }
}
/** Acceso discreto para jugadores que ya conocen la historia. */
function saltarIntro() {
    abrirConfiguracion();
}
/** Abre el manual sin cambiar de pantalla ni perder la ronda actual. */
function abrirManual() {
    elemento("superposicion-manual").classList.remove("oculta");
}
/** Cierra el manual y devuelve al punto exacto donde estaba el jugador. */
function cerrarManual() {
    elemento("superposicion-manual").classList.add("oculta");
}
/** Abre Configuración lista para escribir un jugador nuevo o elegir uno guardado. */
function abrirConfiguracion() {
    const input = elemento("nombre-jugador");
    input.value = "";
    input.setCustomValidity("");
    elemento("selector-jugadores").value = "";
    nombreJugadorElegido = "";
    actualizarListaJugadores();
    mostrarPantalla("pantalla-configuracion");
    input.focus();
}
/** Botones de avatar y de número de rondas de la pantalla de configuración. */
function prepararOpcionesConfig() {
    // La pantalla de Configuración V12 usa radios para elegir avatar.
    // Guardamos la elección con un listener sencillo de "change".
    const avatares = document.querySelectorAll('input[name="avatar-humano"]');
    for (let i = 0; i < avatares.length; i++) {
        const radio = avatares[i];
        radio.addEventListener("change", function () {
            if (radio.checked) {
                avatarElegido = String(radio.value);
            }
        });
        if (radio.checked) {
            avatarElegido = String(radio.value);
        }
    }
    // Guardamos también el avatar elegido para la IA. Así no dependemos de
    // volver a leer la pantalla anterior cuando ya estamos jugando.
    const avataresIA = document.querySelectorAll('input[name="avatar-ia"]');
    for (let i = 0; i < avataresIA.length; i++) {
        const radioIA = avataresIA[i];
        radioIA.addEventListener("change", function () {
            if (radioIA.checked) {
                avatarIAElegido = String(radioIA.value);
            }
        });
        if (radioIA.checked) {
            avatarIAElegido = String(radioIA.value);
        }
    }
    const rondas = document.querySelectorAll("#pantalla-configuracion .boton-opcion");
    for (let i = 0; i < rondas.length; i++) {
        const boton = rondas[i];
        boton.addEventListener("click", function () {
            for (let j = 0; j < rondas.length; j++) {
                rondas[j].classList.remove("boton-opcion-activa");
                rondas[j].setAttribute("aria-pressed", "false");
            }
            boton.classList.add("boton-opcion-activa");
            boton.setAttribute("aria-pressed", "true");
            rondasElegidas = Number(boton.dataset.rondas);
        });
    }
}
/** Mantiene varios progresos locales sin alterar la organización de Configuración. */
function prepararJugadores() {
    const input = elemento("nombre-jugador");
    const selector = elemento("selector-jugadores");
    nombreJugadorElegido = "";
    input.value = "";
    actualizarListaJugadores();
    selector.addEventListener("change", function () {
        if (selector.value !== "") {
            input.value = selector.value;
            selector.value = "";
            input.focus();
        }
    });
}
function actualizarListaJugadores() {
    const lista = elemento("selector-jugadores");
    lista.innerHTML = "";
    const cabecera = document.createElement("option");
    cabecera.value = "";
    cabecera.textContent = " ";
    lista.appendChild(cabecera);
    const jugadores = listarJugadores();
    for (let i = 0; i < jugadores.length; i++) {
        const opcion = document.createElement("option");
        opcion.value = jugadores[i];
        opcion.textContent = jugadores[i];
        lista.appendChild(opcion);
    }
    lista.disabled = jugadores.length === 0;
}
/** Crea la partida con la configuración elegida y lanza la primera ronda. */
function empezarPartida() {
    const inputNombre = elemento("nombre-jugador");
    if (!inputNombre.checkValidity()) {
        inputNombre.reportValidity();
        return;
    }
    nombreJugadorElegido = seleccionarJugador(inputNombre.value);
    if (nombreJugadorElegido === "") {
        inputNombre.setCustomValidity("Escribe un nombre de jugador.");
        inputNombre.reportValidity();
        return;
    }
    inputNombre.setCustomValidity("");
    inputNombre.value = nombreJugadorElegido;
    importarProgresoAnteriorSiExiste(nombreJugadorElegido);
    actualizarListaJugadores();
    // Leemos de nuevo el radio por seguridad: así la partida usa exactamente
    // el avatar que está marcado al pulsar INICIAR PROTOCOLO.
    const radioHumano = document.querySelector('input[name="avatar-humano"]:checked');
    if (radioHumano !== null) {
        avatarElegido = String(radioHumano.value);
    }
    const radioIA = document.querySelector('input[name="avatar-ia"]:checked');
    if (radioIA !== null) {
        avatarIAElegido = String(radioIA.value);
    }
    partida = new Partida(nombreJugadorElegido, avatarElegido, rondasElegidas, avatarIAElegido);
    finalConMusicaRivalidad = false;
    escribir("nombre-humano", "HUMANO");
    escribir("nombre-jugador-partida", nombreJugadorElegido);
    apagarMusicaIntroduccionConfiguracionSuavemente();
    mostrarPantalla("pantalla-juego");
    reproducirMusicaPartidaSiCorresponde();
    nuevaRonda();
}
// ---- Ajustes rápidos -------------------------------------------------------
function prepararAjustes() {
    const panel = elemento("superposicion-ajustes");
    const botones = [elemento("btn-ajustes"), elemento("btn-ajustes-global")];
    const controlSonido = elemento("control-sonido");
    const controlVolumen = elemento("control-volumen");
    controlSonido.checked = sonidoActivo;
    controlVolumen.value = String(volumenSonido);
    controlVolumen.disabled = !sonidoActivo;
    for (let i = 0; i < botones.length; i++) {
        botones[i].addEventListener("click", function () {
            panel.classList.remove("oculta");
            for (let j = 0; j < botones.length; j++) {
                botones[j].setAttribute("aria-expanded", "true");
            }
        });
    }
    elemento("btn-cerrar-ajustes").addEventListener("click", cerrarAjustes);
    panel.addEventListener("click", function (evento) {
        if (evento.target === panel) {
            cerrarAjustes();
        }
    });
    controlSonido.addEventListener("change", function () {
        sonidoActivo = controlSonido.checked;
        controlVolumen.disabled = !sonidoActivo;
        localStorage.setItem("nexo-sonido", sonidoActivo ? "on" : "off");
        if (sonidoActivo) {
            reproducirAudioInicioSiCorresponde();
            reproducirMusicaIntroduccionConfiguracionSiCorresponde();
            reproducirMusicaPartidaSiCorresponde();
            reproducirMusicaFinalSiCorresponde();
        }
        else {
            pausarAudioInicio();
            pausarMusicaIntroduccionConfiguracion();
            pausarMusicaPartida();
            pausarMusicaPlanetaRestaurado();
            pausarMusicaEquilibrioRestablecido();
            pausarMusicaPlanetaColapso();
            pausarMusicaRivalidadFinal();
            detenerEfectos();
        }
    });
    controlVolumen.addEventListener("input", function () {
        volumenSonido = Number(controlVolumen.value);
        actualizarVolumenAudioInicio(volumenSonido);
        actualizarVolumenEfectos(volumenSonido);
        actualizarVolumenMusicaIntroduccionConfiguracion(volumenSonido);
        actualizarVolumenMusicaPartida(volumenSonido);
        actualizarVolumenMusicaPlanetaRestaurado(volumenSonido);
        actualizarVolumenMusicaEquilibrioRestablecido(volumenSonido);
        actualizarVolumenMusicaPlanetaColapso(volumenSonido);
        actualizarVolumenMusicaRivalidadFinal(volumenSonido);
        localStorage.setItem("nexo-volumen", String(volumenSonido));
    });
}
function cerrarAjustes() {
    elemento("superposicion-ajustes").classList.add("oculta");
    elemento("btn-ajustes").setAttribute("aria-expanded", "false");
    elemento("btn-ajustes-global").setAttribute("aria-expanded", "false");
}
function reproducirAudioInicioSiCorresponde() {
    const portadaActiva = elemento("pantalla-inicio").classList.contains("activa");
    if (!sonidoActivo || !portadaActiva) {
        return;
    }
    reproducirAudioInicio(volumenSonido);
}
/** La misma pista continúa al pasar de Introducción a Configuración. */
function reproducirMusicaIntroduccionConfiguracionSiCorresponde() {
    const introduccionActiva = elemento("pantalla-introduccion").classList.contains("activa");
    const configuracionActiva = elemento("pantalla-configuracion").classList.contains("activa");
    if (!sonidoActivo || (!introduccionActiva && !configuracionActiva)) {
        return;
    }
    reproducirMusicaIntroduccionConfiguracion(volumenSonido);
}
/** La música larga solo acompaña la pantalla de juego, nunca las demás. */
function reproducirMusicaPartidaSiCorresponde() {
    const juegoActivo = elemento("pantalla-juego").classList.contains("activa");
    if (!sonidoActivo || !juegoActivo || partida === null) {
        return;
    }
    reproducirMusicaPartida(volumenSonido);
}
/** Reanuda la música que corresponda al desenlace visible. */
function reproducirMusicaFinalSiCorresponde() {
    const finalActivo = elemento("pantalla-final").classList.contains("activa");
    if (!sonidoActivo || !finalActivo || partida === null) {
        return;
    }
    const saludPlaneta = partida.getSaludPlaneta();
    if (saludPlaneta >= 100) {
        reproducirMusicaEquilibrioRestablecido(volumenSonido);
    }
    else if (saludPlaneta <= 0) {
        reproducirMusicaPlanetaColapso(volumenSonido);
    }
    else if (correspondeMusicaPlanetaRestaurado(saludPlaneta)) {
        reproducirMusicaPlanetaRestaurado(volumenSonido);
    }
    else if (finalConMusicaRivalidad) {
        reproducirMusicaRivalidadFinal(volumenSonido);
    }
}
// ---- Ciclo de la ronda ----------------------------------------------------
/** Prepara la ronda siguiente y deja la pantalla lista para apostar. */
function nuevaRonda() {
    if (partida === null) {
        return;
    }
    cancelarEfectosProgramados();
    partida.prepararRonda();
    fase = "apuesta";
    apuestaElegida = null;
    cartasSeleccionadas = [];
    ocultarResolucion();
    ocultar("zona-velocidad");
    ocultarPrecision();
    elemento("pantalla-juego").classList.remove("precision-decision-activa", "precision-correccion-activa");
    ocultar("btn-siguiente");
    mostrar("zona-decision-activa");
    mostrar("zona-apuesta");
    mostrar("zona-declaraciones");
    mostrar("zona-mano");
    mostrar("acciones");
    escribir("btn-confirmar-jugada", "RESOLVER RONDA");
    mostrar("btn-confirmar-jugada");
    elemento("btn-confirmar-jugada").disabled = true;
    pintarApuestaElegida(null);
    refrescarPantalla();
    escribir("instruccion-mano", textoInstruccionMano());
    // FORTALEZAS · V18
    // Cuando VELOCIDAD está disponible, la instrucción gana presencia visual
    // junto a las cartas. No invade la esfera central ni el HUD superior.
    elemento("instruccion-mano").classList.remove("instruccion-precision-activa");
    elemento("instruccion-mano").classList.toggle("instruccion-fortaleza-activa", velocidadDisponible());
    const evento = partida.getEventoActivo();
    const cartaCrisis = partida.getCartaCrisis();
    cartaCrisisPendienteDeSonido = evento !== null && cartaCrisis !== null;
    // CHISPA + VELOCIDAD necesitan compartir la franja central con dos avisos.
    // Marcamos únicamente esta combinación para compactar la mano sin mover
    // el panel PAR/IMPAR ni alterar la lógica de ninguna fortaleza.
    elemento("pantalla-juego").classList.toggle("chispa-velocidad-activa", evento !== null && evento.getId() === "chispa" && velocidadDisponible());
    if (evento !== null) {
        mostrarEvento(evento.getId(), evento.getNombre(), evento.getDescripcion());
        reproducirEvento(evento.getId());
    }
    else if (cartaCrisis !== null) {
        reproducirCartaCrisis(cartaCrisis.tipo);
    }
}
/** Cierra el evento y presenta después el modificador de crisis si coinciden. */
function cerrarEventoDeRonda() {
    ocultarEvento();
    if (partida === null || !cartaCrisisPendienteDeSonido)
        return;
    const cartaCrisis = partida.getCartaCrisis();
    cartaCrisisPendienteDeSonido = false;
    if (cartaCrisis !== null) {
        window.setTimeout(function () {
            reproducirCartaCrisis(cartaCrisis.tipo);
        }, 180);
    }
}
/** Repinta todo lo que puede haber cambiado: marcadores, avatares, mano... */
function refrescarPantalla() {
    if (partida === null) {
        return;
    }
    pintarMarcadores(partida);
    pintarEvolucionVisual(partida);
    pintarCabeceraRonda(partida);
    pintarCartasIA(partida);
    pintarDeclaracionIA(partida);
    pintarPistas(partida);
    pintarMemoria(partida);
    pintarCapacidades("capacidades-humano", partida.getJugador().getCapacidades());
    pintarCapacidades("capacidades-ia", partida.getIA().getCapacidades());
    pintarMano(partida.getJugador(), cartasSeleccionadas, pulsarCarta, apuestaElegida !== null);
    elemento("mano-cartas").classList.toggle("modo-velocidad", velocidadDisponible());
}
/** Texto de ayuda de la mano, distinto si el poder Velocidad está activo. */
function textoInstruccionMano() {
    if (velocidadDisponible()) {
        return "FORTALEZA ACTIVA · VELOCIDAD — ELIGE DOS CARTAS";
    }
    return "Tu carta";
}
/**
 * Indica si esta ronda se puede usar el poder Velocidad: hay que tenerlo,
 * que no haya Tormenta solar y que queden al menos dos cartas en la mano.
 */
function velocidadDisponible() {
    if (partida === null) {
        return false;
    }
    const jugador = partida.getJugador();
    return (jugador.tiene("velocidad") &&
        partida.capacidadesPermitidas() &&
        jugador.getCartasDisponibles().length >= 2);
}
/**
 * Recupera la elección normal si un estado temporal quedó activo internamente
 * aunque su panel ya no esté visible. De este modo los controles visibles no
 * pueden quedar convertidos en botones que ignoran el clic.
 */
function recuperarFaseInteractiva() {
    const zonaDecisionVisible = !elemento("zona-decision-activa").classList.contains("oculta");
    if (!zonaDecisionVisible) {
        return;
    }
    const precisionVisible = !elemento("panel-precision").classList.contains("oculta");
    const velocidadVisible = !elemento("zona-velocidad").classList.contains("oculta");
    const precisionDesincronizada = fase === "precision-decision" && !precisionVisible;
    const velocidadDesincronizada = fase === "velocidad" && !velocidadVisible;
    const resolucionDesincronizada = fase === "resuelta" && elemento("zona-resolucion").classList.contains("oculta");
    if (!precisionDesincronizada && !velocidadDesincronizada && !resolucionDesincronizada) {
        return;
    }
    fase = cartasSeleccionadas.length > 0 ? "carta" : "apuesta";
    ocultarPrecision();
    ocultar("zona-velocidad");
    mostrar("zona-declaraciones");
    mostrar("zona-mano");
    mostrar("acciones");
    actualizarBotonConfirmar();
}
/**
 * El jugador declara PAR o IMPAR. Esta decisión abre después la selección
 * de cartas para que el orden de la jugada sea inequívoco.
 */
function elegirApuesta(apuesta) {
    recuperarFaseInteractiva();
    if (fase !== "apuesta" && fase !== "carta") {
        return;
    }
    apuestaElegida = apuesta;
    pintarApuestaElegida(apuesta);
    habilitarCartasTrasApuesta();
    actualizarBotonConfirmar();
}
/** El jugador pulsa una carta de su mano. */
function pulsarCarta(valor) {
    recuperarFaseInteractiva();
    if (partida === null || (fase !== "apuesta" && fase !== "carta" && fase !== "precision-correccion")) {
        return;
    }
    // Defensa funcional: aunque otro código intentara invocar esta función,
    // nunca se acepta una carta antes de declarar PAR o IMPAR.
    if (apuestaElegida === null) {
        actualizarBotonConfirmar();
        return;
    }
    const corrigiendoPrecision = fase === "precision-correccion";
    fase = corrigiendoPrecision ? "precision-correccion" : "carta";
    if (velocidadDisponible() && !corrigiendoPrecision) {
        // Con Velocidad se eligen dos cartas. Si ya hay dos y se pulsa una
        // tercera, sustituimos la más antigua y conservamos una jugada completa.
        // Así un roce accidental no vuelve a bloquear RESOLVER RONDA.
        if (yaSeleccionada(valor)) {
            cartasSeleccionadas = quitarSeleccion(valor);
        }
        else if (cartasSeleccionadas.length < 2) {
            cartasSeleccionadas.push(valor);
        }
        else {
            cartasSeleccionadas.shift();
            cartasSeleccionadas.push(valor);
        }
    }
    else {
        cartasSeleccionadas = [valor];
    }
    // CARTAS · V10
    // No reconstruimos la mano después del click.
    // Solo actualizamos qué botón tiene la clase .seleccionada.
    pintarSeleccionCartas(cartasSeleccionadas);
    actualizarBotonConfirmar();
    if (corrigiendoPrecision) {
        escribir("btn-confirmar-jugada", "CONFIRMAR CORRECCIÓN");
    }
}
function yaSeleccionada(valor) {
    for (let i = 0; i < cartasSeleccionadas.length; i++) {
        if (cartasSeleccionadas[i] === valor) {
            return true;
        }
    }
    return false;
}
function quitarSeleccion(valor) {
    const restantes = [];
    for (let i = 0; i < cartasSeleccionadas.length; i++) {
        if (cartasSeleccionadas[i] !== valor) {
            restantes.push(cartasSeleccionadas[i]);
        }
    }
    return restantes;
}
/** Habilita el botón de confirmar solo cuando la jugada está completa. */
function actualizarBotonConfirmar() {
    const boton = elemento("btn-confirmar-jugada");
    // Durante una corrección de PRECISIÓN siempre se sustituye una sola carta,
    // aunque el jugador también haya conquistado VELOCIDAD.
    const usaVelocidad = fase === "precision-correccion" ? false : velocidadDisponible();
    const necesarias = usaVelocidad ? 2 : 1;
    const jugadaCompleta = apuestaElegida !== null && cartasSeleccionadas.length >= necesarias;
    boton.disabled = !jugadaCompleta;
    // El botón nunca desaparece durante la elección y explica qué falta.
    mostrar("btn-confirmar-jugada");
    if (apuestaElegida === null) {
        escribir("btn-confirmar-jugada", "DECLARA PAR / IMPAR");
    }
    else if (cartasSeleccionadas.length < necesarias) {
        if (usaVelocidad) {
            const elegidas = cartasSeleccionadas.length;
            escribir("btn-confirmar-jugada", elegidas === 0 ? "ELIGE 2 CARTAS · 0/2" : "ELIGE OTRA CARTA · 1/2");
        }
        else {
            escribir("btn-confirmar-jugada", "ELIGE TU CARTA");
        }
    }
    else {
        // La acción principal siempre conserva su significado: resolver la ronda.
        // Si PRECISIÓN está disponible, se aplicará automáticamente al pulsar y
        // mostrará su panel informativo antes del resultado.
        escribir("btn-confirmar-jugada", usaVelocidad ? "RESOLVER RONDA · 2/2" : "RESOLVER RONDA");
    }
    boton.classList.toggle("jugada-lista", jugadaCompleta);
}
/**
 * Confirma la jugada. La comprobación se basa en la apuesta y las cartas
 * realmente seleccionadas, no solo en la variable de fase. Así un pequeño
 * desfase visual nunca puede dejar un botón habilitado que no haga nada.
 */
function confirmar() {
    recuperarFaseInteractiva();
    if (partida === null || apuestaElegida === null) {
        actualizarBotonConfirmar();
        return;
    }
    // PRECISIÓN corrige una sola carta. Esta comprobación va antes de VELOCIDAD
    // para que la combinación de ambas fortalezas nunca bloquee el botón.
    if (fase === "precision-correccion") {
        if (cartasSeleccionadas.length < 1) {
            actualizarBotonConfirmar();
            return;
        }
        revelar();
        return;
    }
    const usaVelocidad = velocidadDisponible();
    const necesarias = usaVelocidad ? 2 : 1;
    if (cartasSeleccionadas.length < necesarias) {
        actualizarBotonConfirmar();
        return;
    }
    // Estos estados ya tienen su propia decisión o su propia resolución.
    if (fase === "precision-decision" || fase === "velocidad" || fase === "resuelta") {
        return;
    }
    // Con apuesta + carta(s) completas, la jugada está lista aunque la fase
    // hubiera quedado accidentalmente en "apuesta" por un repintado de UI.
    fase = "carta";
    const jugador = partida.getJugador();
    const puedeUsarPrecision = jugador.puedeUsarPrecision() &&
        partida.capacidadesPermitidas() &&
        !partida.hayEvento("sobrecarga") &&
        !usaVelocidad;
    // PRECISIÓN es una ventaja pasiva: no sustituye el botón RESOLVER RONDA.
    // Al resolver, si está disponible, abre primero el panel para MANTENER o CORREGIR.
    if (puedeUsarPrecision && activarPrecision()) {
        return;
    }
    revelar();
}
/**
 * PRECISIÓN · una vez por ciclo de mano.
 * La información nueva es la ventaja: al confirmar se revela la carta real
 * que la IA ya había preparado, pero su apuesta sigue sin alterarse ni
 * revelarse por esta capacidad.
 */
function activarPrecision() {
    if (partida === null || cartasSeleccionadas.length !== 1) {
        return false;
    }
    const jugador = partida.getJugador();
    jugador.gastarPrecision();
    fase = "precision-decision";
    const cartaHumano = cartasSeleccionadas[0];
    const cartaIA = partida.fijarCartaIAParaPrecision(cartaHumano);
    escribir("precision-carta-ia", String(cartaIA));
    escribir("precision-carta-humano", String(cartaHumano));
    escribir("precision-carta-humano-resumen", String(cartaHumano));
    escribir("precision-apuesta-humano", apuestaElegida);
    escribir("precision-apuesta-humano-texto", apuestaElegida);
    escribir("precision-texto-mantener", "MANTENER " + cartaHumano);
    escribir("precision-titulo", "Lectura exacta detectada");
    const hayCartaAlternativa = jugador.getCartasDisponibles().some(function (carta) {
        return carta.getValor() !== cartaHumano;
    });
    const botonCorregir = elemento("btn-precision-corregir");
    botonCorregir.disabled = !hayCartaAlternativa;
    botonCorregir.textContent = hayCartaAlternativa ? "CORREGIR CARTA" : "SIN CARTAS ALTERNATIVAS";
    if (hayCartaAlternativa) {
        escribir("precision-dato-secundario", "La carta de la IA queda fijada para esta resolución.");
        escribir("precision-opciones-texto", "Ahora puedes decidir si mantenerla o corregirla con esta información.");
    }
    else {
        escribir("precision-dato-secundario", "No quedan cartas alternativas en este ciclo.");
        escribir("precision-opciones-texto", "Mantén esta última carta para resolver; las cinco se recuperarán al comenzar la ronda siguiente.");
    }
    // FIX · V24.20: antes se sobrescribía aquí el textContent completo de
    // #precision-decision, que es el CONTENEDOR de los <strong> que acabamos
    // de rellenar arriba (precision-apuesta-humano-texto y precision-carta-humano).
    // Sobrescribir el textContent de un elemento borra sus hijos, así que la
    // segunda vez que se activaba PRECISIÓN en la misma sesión, esos <strong>
    // ya no existían y el código se rompía a mitad de esta función, dejando
    // "RESOLVER RONDA" visible pero sin efecto. El párrafo ya queda correcto
    // solo con los dos <strong> actualizados arriba; no hace falta reescribirlo.
    const imagenPrecision = elemento("precision-imagen-carta-ia");
    imagenPrecision.src = "./assets/images/partida/cartas/ia/carta-ia-" + cartaIA + ".webp";
    imagenPrecision.alt = "Carta " + cartaIA + " seleccionada por la IA";
    elemento("panel-precision").classList.remove("precision-modo-correccion");
    mostrar("precision-acciones");
    ocultar("zona-declaraciones");
    const pantallaJuego = elemento("pantalla-juego");
    pantallaJuego.classList.add("precision-decision-activa");
    pantallaJuego.classList.remove("precision-correccion-activa");
    mostrar("panel-precision");
    ocultar("zona-mano");
    ocultar("acciones");
    ocultar("btn-confirmar-jugada");
    elemento("mano-cartas").classList.add("mano-bloqueada-precision");
    reproducirSonido("fortaleza");
    return true;
}
/** Mantiene la carta ya confirmada y resuelve con la información obtenida. */
function mantenerCartaPrecision() {
    if (partida === null || fase !== "precision-decision") {
        return;
    }
    ocultarPrecision();
    revelar();
}
/**
 * Permite una única corrección informada. La carta IA permanece visible para
 * que la decisión tenga valor estratégico; al seleccionar otra carta se podrá
 * resolver normalmente, sin volver a activar PRECISIÓN en este ciclo.
 */
function corregirCartaPrecision() {
    if (partida === null || fase !== "precision-decision") {
        return;
    }
    const cartaActual = cartasSeleccionadas[0];
    const hayCartaAlternativa = partida.getJugador().getCartasDisponibles().some(function (carta) {
        return carta.getValor() !== cartaActual;
    });
    // Protección adicional: aunque se invoque la acción desde fuera del botón,
    // nunca se abre una corrección sin una carta distinta que poder elegir.
    if (!hayCartaAlternativa) {
        return;
    }
    fase = "precision-correccion";
    const pantallaJuego = elemento("pantalla-juego");
    pantallaJuego.classList.remove("precision-decision-activa");
    pantallaJuego.classList.add("precision-correccion-activa");
    mostrar("zona-mano");
    mostrar("acciones");
    const panelPrecision = elemento("panel-precision");
    panelPrecision.classList.add("precision-modo-correccion");
    escribir("precision-titulo", "Corrección de cálculo");
    // FIX · V24.20: igual que en activarPrecision(), aquí también se
    // sobrescribía el textContent de #precision-decision (que contiene los
    // <strong> precision-apuesta-humano-texto y precision-carta-humano).
    // Movemos el mensaje útil ("la carta de la IA no cambiará") a
    // precision-dato-secundario, que es un elemento independiente, en vez de
    // destruir esos <strong> para siempre en la primera corrección.
    escribir("precision-dato-secundario", "La carta de la IA no cambiará durante esta resolución. Elige tu nueva carta.");
    ocultar("precision-acciones");
    elemento("mano-cartas").classList.remove("mano-bloqueada-precision");
    cartasSeleccionadas = [];
    pintarSeleccionCartas(cartasSeleccionadas);
    escribir("instruccion-mano", "FORTALEZA ACTIVA · PRECISIÓN — ELIGE TU CORRECCIÓN");
    elemento("instruccion-mano").classList.add("instruccion-fortaleza-activa", "instruccion-precision-activa");
    mostrar("btn-confirmar-jugada");
    elemento("btn-confirmar-jugada").disabled = true;
    escribir("btn-confirmar-jugada", "ELIGE NUEVA CARTA");
}
/** Limpia únicamente la interfaz temporal de PRECISIÓN. */
function ocultarPrecision() {
    ocultar("panel-precision");
    const panel = elemento("panel-precision");
    panel.classList.remove("precision-modo-correccion");
    mostrar("precision-acciones");
    mostrar("zona-declaraciones");
    mostrar("zona-mano");
    mostrar("acciones");
    elemento("pantalla-juego").classList.remove("precision-decision-activa", "precision-correccion-activa");
    const mano = elemento("mano-cartas");
    mano.classList.remove("mano-bloqueada-precision");
}
/**
 * Revela la jugada. Con VELOCIDAD se descartan las dos cartas, NEXO compara
 * ambas posibilidades y marca automáticamente la más beneficiosa al Humano.
 */
function revelar() {
    if (partida === null || apuestaElegida === null) {
        return;
    }
    ocultarPrecision();
    ocultar("btn-confirmar-jugada");
    if (cartasSeleccionadas.length === 2) {
        const jugador = partida.getJugador();
        jugador.jugarCarta(cartasSeleccionadas[0]);
        jugador.jugarCarta(cartasSeleccionadas[1]);
        mostrarResultadoVelocidad(cartasSeleccionadas[0], cartasSeleccionadas[1]);
        return;
    }
    resolverConCarta(cartasSeleccionadas[0], false);
}
/** Da un valor sencillo a cada resultado para decidir cuál favorece más al Humano. */
function compararOpcionesVelocidad(a, b) {
    // 1) protege y mejora primero la evolución humana real;
    // 2) si empatan, favorece al planeta;
    // 3) si aún empatan, perjudica lo menos posible a la IA rival.
    if (a.puntosJugador !== b.puntosJugador)
        return a.puntosJugador - b.puntosJugador;
    if (a.puntosPlaneta !== b.puntosPlaneta)
        return a.puntosPlaneta - b.puntosPlaneta;
    if (a.puntosIA !== b.puntosIA)
        return b.puntosIA - a.puntosIA;
    return a.suma - b.suma;
}
/**
 * Muestra las dos posibilidades de VELOCIDAD, destaca la mejor y deja un
 * único botón para aplicarla. El jugador entiende qué ha hecho la fortaleza,
 * pero ya no tiene que elegir manualmente el resultado.
 */
function mostrarResultadoVelocidad(cartaA, cartaB) {
    if (partida === null || apuestaElegida === null) {
        return;
    }
    fase = "velocidad";
    ocultar("zona-declaraciones");
    const opcionA = partida.previsualizarResultado(cartaA, apuestaElegida);
    const opcionB = partida.previsualizarResultado(cartaB, apuestaElegida);
    const mejor = compararOpcionesVelocidad(opcionA, opcionB) >= 0 ? opcionA : opcionB;
    pintarOpcionVelocidad("resultado-veloz-a", opcionA, opcionA === mejor);
    pintarOpcionVelocidad("resultado-veloz-b", opcionB, opcionB === mejor);
    escribir("velocidad-eleccion-nexo", "NEXO selecciona la carta " + mejor.cartaJugador + " como la opción más favorable.");
    elemento("btn-velocidad-aplicar").onclick = function () {
        ocultar("zona-velocidad");
        resolverConCarta(mejor.cartaJugador, true);
    };
    mostrar("zona-velocidad");
    reproducirSonido("fortaleza");
}
function pintarOpcionVelocidad(id, opcion, esMejor) {
    const ficha = elemento(id);
    ficha.className = "opcion-velocidad" + (esMejor ? " opcion-velocidad-mejor" : "");
    let resultado = opcion.resultado;
    if (opcion.ganador === "HUMANO")
        resultado = "RIVALIDAD · GANA HUMANO";
    if (opcion.ganador === "IA")
        resultado = "RIVALIDAD · GANA IA";
    ficha.textContent = "Carta " + opcion.cartaJugador + " → suma " + opcion.suma + " (" + opcion.paridad + ") · " + resultado + " · Humano " + formatoCambio(opcion.puntosJugador) + " · Crisis " + formatoCambio(opcion.puntosPlaneta);
}
function formatoCambio(valor) {
    if (valor > 0)
        return "+" + valor;
    return String(valor);
}
/** Resuelve la ronda con la carta elegida y pinta el resultado. */
function resolverConCarta(carta, yaDescartada) {
    if (partida === null || apuestaElegida === null) {
        return;
    }
    if (!yaDescartada) {
        partida.getJugador().jugarCarta(carta);
    }
    const resumen = partida.resolverRonda(carta, apuestaElegida);
    fase = "resuelta";
    // La resolución sustituye a TODA la zona de decisión y su acción principal.
    // El carril del botón está fuera de las cartas para garantizar el clic.
    ocultar("acciones");
    ocultar("zona-decision-activa");
    refrescarPantalla();
    pintarResolucionYSiguiente(resumen);
}
/** Pinta la resolución y prepara el botón de continuar. */
function pintarResolucionYSiguiente(resumen) {
    if (partida === null) {
        return;
    }
    pintarResolucion(resumen);
    reproducirFeedbackDeRonda(resumen);
    if (partida.estaTerminada()) {
        if (partida.getSaludPlaneta() >= 100) {
            escribir("btn-siguiente", "DESCUBRIR EL DESENLACE");
        }
        else if (partida.getSaludPlaneta() <= 0) {
            escribir("btn-siguiente", "VER DESENLACE");
        }
        else {
            escribir("btn-siguiente", "VER RESULTADO FINAL");
        }
    }
    else {
        escribir("btn-siguiente", "SIGUIENTE RONDA");
    }
    mostrar("btn-siguiente");
}
/** Botón de continuar: siguiente ronda o pantalla final. */
function siguiente() {
    if (partida === null) {
        return;
    }
    if (partida.estaTerminada()) {
        terminarPartida();
        return;
    }
    nuevaRonda();
}
/** Calcula el final, lo guarda en localStorage y enseña la pantalla final. */
function terminarPartida(guardarProgreso = true) {
    if (partida === null) {
        return;
    }
    cancelarEfectosProgramados();
    const resumen = partida.calcularFinal();
    finalConMusicaRivalidad = guardarProgreso
        && resumen.saludPlaneta > 0
        && resumen.saludPlaneta < 100
        && (resumen.desenlace === "SUPREMACIA HUMANA"
            || resumen.desenlace === "SUPREMACIA IA");
    if (guardarProgreso) {
        guardarPerfil(resumen.perfil.nombre);
        guardarMejorMarca(partida.getJugador().getNombre(), resumen);
    }
    pintarFinal(partida, resumen);
    pausarAudioInicio();
    pausarMusicaIntroduccionConfiguracion(true);
    pausarMusicaPartida(true);
    pausarMusicaPlanetaRestaurado(true);
    pausarMusicaEquilibrioRestablecido(true);
    pausarMusicaPlanetaColapso(true);
    pausarMusicaRivalidadFinal(true);
    mostrarPantalla("pantalla-final");
    reproducirDesenlace();
    if (resumen.saludPlaneta >= 100) {
        reproducirMusicaEquilibrioRestablecido(volumenSonido);
    }
    else if (resumen.saludPlaneta <= 0) {
        reproducirMusicaPlanetaColapso(volumenSonido);
    }
    else if (correspondeMusicaPlanetaRestaurado(resumen.saludPlaneta)) {
        reproducirMusicaPlanetaRestaurado(volumenSonido);
    }
    else if (finalConMusicaRivalidad) {
        reproducirMusicaRivalidadFinal(volumenSonido);
    }
}
/** Detiene y rebobina el audio cuando la página deja de estar activa. */
function detenerAudioAlSalir() {
    pausarAudioInicio();
    pausarMusicaIntroduccionConfiguracion(true);
    pausarMusicaPartida(true);
    pausarMusicaPlanetaRestaurado(true);
    pausarMusicaEquilibrioRestablecido(true);
    pausarMusicaPlanetaColapso(true);
    pausarMusicaRivalidadFinal(true);
    detenerEfectos();
}
// Arrancamos cuando el HTML ya está cargado, para que existan los elementos.
window.addEventListener("DOMContentLoaded", iniciar);
window.addEventListener("pagehide", detenerAudioAlSalir);
