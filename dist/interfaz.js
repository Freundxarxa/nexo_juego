import { PERFILES, SALUD_MAXIMA, buscarCapacidad } from "./datos.js";
import { leerMejorMarca, leerPerfiles } from "./almacenamiento.js";
/**
 * La interfaz: todo lo que toca el HTML está en este archivo.
 *
 * Ninguna función de aquí calcula puntos ni decide nada del juego: reciben
 * datos ya calculados (la partida o el resumen de la ronda) y los pintan.
 * Gracias a eso, si mañana cambiamos el diseño de la pantalla no hay que
 * tocar ni una línea de las clases del juego.
 */
/** Evolución que llena la barra del todo (las barras necesitan un tope). */
const EVOLUCION_MAXIMA_BARRA = 40;
// PLANETA · RUTAS DE PARTIDA
// Durante la partida conservamos una serie específica con la esfera/núcleo NEXO.
// La pantalla final usa otra serie, sin la esfera protagonista, porque su composición
// y su propósito visual son diferentes.
const RUTAS_PLANETA_JUEGO = [
    "./assets/images/partida/fondos-planeta/partida-planeta-0-24-equilibrio-saludable.webp",
    "./assets/images/partida/fondos-planeta/partida-planeta-25-49-equilibrio-fragil.webp",
    "./assets/images/partida/fondos-planeta/partida-planeta-50-74-equilibrio-critico.webp",
    "./assets/images/partida/fondos-planeta/partida-planeta-75-99-colapso-inminente.webp",
    "./assets/images/partida/fondos-planeta/partida-planeta-100-crisis-catastrofica.webp"
];
const RUTA_PLANETA_RECUPERADO = "./assets/images/partida/fondos-planeta/partida-planeta-0-recuperacion-total.webp";
// Guardamos las imágenes precargadas para que el navegador conserve la referencia.
// Así, al cruzar 25/50/75/100 no aparece un hueco negro mientras llega el nuevo fondo.
const FONDOS_PLANETA_PRECARGADOS = [];
function precargarFondosPlaneta() {
    const recuperado = new Image();
    recuperado.src = RUTA_PLANETA_RECUPERADO;
    FONDOS_PLANETA_PRECARGADOS.push(recuperado);
    for (let i = 0; i < RUTAS_PLANETA_JUEGO.length; i++) {
        const imagen = new Image();
        imagen.src = RUTAS_PLANETA_JUEGO[i];
        FONDOS_PLANETA_PRECARGADOS.push(imagen);
    }
}
precargarFondosPlaneta();
function rutaPlanetaJuego(nivel) {
    if (nivel >= 0 && nivel < RUTAS_PLANETA_JUEGO.length) {
        return RUTAS_PLANETA_JUEGO[nivel];
    }
    return RUTAS_PLANETA_JUEGO[0];
}
// ---- Ayudas para trabajar con el DOM ------------------------------------
/**
 * Busca un elemento por su id. Usamos "as HTMLElement" para decirle a
 * TypeScript que ese elemento existe: los ids están escritos en el HTML.
 */
export function elemento(id) {
    const encontrado = document.getElementById(id);
    if (encontrado === null) {
        throw new Error("NEXO: falta en index.html el elemento con id \"" + id + "\".");
    }
    return encontrado;
}
/** Escribe un texto dentro de un elemento. */
export function escribir(id, texto) {
    elemento(id).textContent = texto;
}
export function mostrar(id) {
    elemento(id).classList.remove("oculta");
}
export function ocultar(id) {
    elemento(id).classList.add("oculta");
}
/** Enseña una pantalla y esconde todas las demás. */
export function mostrarPantalla(idPantalla) {
    const pantallas = [
        "pantalla-suspense",
        "pantalla-inicio",
        "pantalla-introduccion",
        "pantalla-configuracion",
        "pantalla-juego",
        "pantalla-final"
    ];
    for (let i = 0; i < pantallas.length; i++) {
        const pantalla = elemento(pantallas[i]);
        const esActiva = pantallas[i] === idPantalla;
        pantalla.classList.toggle("activa", esActiva);
        pantalla.classList.toggle("oculta", !esActiva);
    }
    // Fuera de la partida siempre existe acceso al sonido. En la partida se
    // mantiene el botón integrado en su cabecera para no duplicar controles.
    const ajustesGlobales = elemento("btn-ajustes-global");
    const usarAjustesDePartida = idPantalla === "pantalla-juego";
    ajustesGlobales.classList.toggle("oculta", usarAjustesDePartida);
    ajustesGlobales.setAttribute("aria-expanded", "false");
}
// ---- Los tres marcadores y los avatares ----------------------------------
/** Pinta las tres barras con sus números. */
export function pintarMarcadores(partida) {
    const jugador = partida.getJugador();
    const ia = partida.getIA();
    const porcentajeHumano = calcularPorcentaje(jugador.getEvolucion(), EVOLUCION_MAXIMA_BARRA);
    const porcentajeIA = calcularPorcentaje(ia.getEvolucion(), EVOLUCION_MAXIMA_BARRA);
    const porcentajeSaludPlaneta = calcularPorcentaje(partida.getSaludPlaneta(), SALUD_MAXIMA);
    // CRISIS DEL PLANETA · V7
    // El juego internamente conserva "salud". Visualmente mostramos "crisis":
    // 0% = equilibrio saludable, 100% = crisis catastrófica.
    const porcentajePlaneta = 100 - porcentajeSaludPlaneta;
    // ANIMACIÓN BARRAS · PRINCIPIANTE
    // La función solo cambia el ancho y comprueba si se ha cruzado uno de los
    // tramos 25/50/75. Si cambia de tramo, añade una clase CSS durante el repintado.
    // Humano e IA usan exactamente la misma animación; el CSS cambia únicamente el color.
    actualizarBarraConPulso("barra-evolucion-humana", porcentajeHumano);
    actualizarBarraConPulso("barra-evolucion-ia", porcentajeIA);
    // BARRA DE CRISIS DEL PLANETA · V7
    // A más crisis, más se llena la barra. El cálculo real del juego sigue usando
    // saludPlaneta; aquí solo invertimos el porcentaje para la representación visual.
    elemento("barra-salud-planeta").style.width = porcentajePlaneta + "%";
    escribir("valor-evolucion-humana", porcentajeHumano + "%");
    escribir("valor-evolucion-ia", porcentajeIA + "%");
    actualizarPlanetaConPulso(porcentajePlaneta);
}
/**
 * Actualiza el porcentaje del planeta y hace un pulso verde/rojo cuando cambia.
 * Es feedback visual simple: no calcula puntos, solo muestra el cambio ya calculado.
 */
function actualizarPlanetaConPulso(porcentajePlaneta) {
    const valor = elemento("valor-salud-planeta");
    const contenedor = valor.parentElement;
    const anterior = valor.dataset.porcentajeAnterior;
    valor.textContent = porcentajePlaneta + "%";
    if (contenedor !== null) {
        contenedor.classList.remove("cambio-planeta-sube", "cambio-planeta-baja");
        if (anterior !== undefined && Number(anterior) !== porcentajePlaneta) {
            if (porcentajePlaneta > Number(anterior)) {
                contenedor.classList.add("cambio-planeta-sube");
            }
            else {
                contenedor.classList.add("cambio-planeta-baja");
            }
        }
    }
    valor.dataset.porcentajeAnterior = String(porcentajePlaneta);
}
/** Convierte un valor en un porcentaje entre 0 y 100. */
function calcularPorcentaje(valor, maximo) {
    let porcentaje = Math.round((valor / maximo) * 100);
    if (porcentaje > 100) {
        porcentaje = 100;
    }
    if (porcentaje < 0) {
        porcentaje = 0;
    }
    return porcentaje;
}
/** Devuelve el tramo visual 0, 1, 2 o 3. Cada tramo ocupa un 25%. */
function calcularTramoVisual(porcentaje) {
    if (porcentaje < 25) {
        return 0;
    }
    if (porcentaje < 50) {
        return 1;
    }
    if (porcentaje < 75) {
        return 2;
    }
    return 3;
}
/**
 * Actualiza una barra y hace un pulso SOLO cuando entra en otro tramo de 25%.
 * Es reversible: si baja de 50% a 49%, vuelve al tramo anterior y también pulsa.
 */
function actualizarBarraConPulso(idBarra, porcentaje) {
    const barra = elemento(idBarra);
    const tramoNuevo = calcularTramoVisual(porcentaje);
    const tramoAnterior = barra.dataset.tramoVisual;
    barra.style.width = porcentaje + "%";
    if (tramoAnterior !== undefined && tramoAnterior !== String(tramoNuevo)) {
        barra.classList.remove("barra-evoluciona");
        // Esta línea reinicia la animación CSS. Ya usamos la misma idea en la intro.
        void barra.offsetWidth;
        barra.classList.add("barra-evoluciona");
    }
    barra.dataset.tramoVisual = String(tramoNuevo);
}
/**
 * Cambia las imágenes de avatar y el fondo del planeta.
 * Los avatares cambian únicamente de imagen al entrar en cada tramo.
 * No se aplican filtros, escalados, halos ni animaciones de transformación.
 */
export function pintarEvolucionVisual(partida) {
    const jugador = partida.getJugador();
    const ia = partida.getIA();
    const porcentajeHumano = calcularPorcentaje(jugador.getEvolucion(), EVOLUCION_MAXIMA_BARRA);
    const porcentajeIA = calcularPorcentaje(ia.getEvolucion(), EVOLUCION_MAXIMA_BARRA);
    const nivelHumano = porcentajeHumano === 100 ? 4 : calcularTramoVisual(porcentajeHumano);
    const nivelIA = porcentajeIA === 100 ? 4 : calcularTramoVisual(porcentajeIA);
    let tipoHumano = jugador.getAvatar();
    if (tipoHumano !== "humano-hombre" && tipoHumano !== "humano-mujer") {
        tipoHumano = "humano-hombre";
    }
    let tipoIA = ia.getAvatar();
    if (tipoIA !== "ia-01" && tipoIA !== "ia-02") {
        tipoIA = "ia-01";
    }
    actualizarAvatar("avatar-humano", "avatar avatar-humano " + tipoHumano + " nivel-" + nivelHumano, nivelHumano);
    actualizarAvatar("avatar-ia", "avatar avatar-ia " + tipoIA + " nivel-" + nivelIA, nivelIA);
    // PLANETA · V17: estados reversibles cada 25% y feedback perceptible al cruzar un umbral.
    const porcentajeSaludPlaneta = calcularPorcentaje(partida.getSaludPlaneta(), SALUD_MAXIMA);
    const crisisPlaneta = 100 - porcentajeSaludPlaneta;
    const tramoPlaneta = crisisPlaneta >= 100 ? 4 : calcularTramoVisual(crisisPlaneta);
    const pantalla = elemento("pantalla-juego");
    const tramoAnterior = pantalla.dataset.tramoPlaneta;
    const crisisAnterior = pantalla.dataset.crisisVisual;
    pantalla.classList.remove("planeta-saludable", "planeta-fragil", "planeta-critico", "planeta-colapso", "planeta-catastrofe");
    if (crisisPlaneta < 25)
        pantalla.classList.add("planeta-saludable");
    else if (crisisPlaneta < 50)
        pantalla.classList.add("planeta-fragil");
    else if (crisisPlaneta < 75)
        pantalla.classList.add("planeta-critico");
    else if (crisisPlaneta < 100)
        pantalla.classList.add("planeta-colapso");
    else
        pantalla.classList.add("planeta-catastrofe");
    // El fondo principal conserva la imagen anterior hasta que el nuevo asset
    // confirma que está cargado. El contenedor mantiene además el mismo fondo
    // como respaldo visual: nunca dejamos el centro de la partida en negro.
    const fondoPlaneta = elemento("fondo-planeta-juego");
    const escenaPlaneta = fondoPlaneta.parentElement;
    const rutaPlaneta = crisisPlaneta === 0 ? RUTA_PLANETA_RECUPERADO : rutaPlanetaJuego(tramoPlaneta);
    pantalla.classList.toggle("evolucion-humano-100", porcentajeHumano === 100);
    pantalla.classList.toggle("evolucion-ia-100", porcentajeIA === 100);
    pantalla.classList.toggle("crisis-planeta-0", crisisPlaneta === 0);
    pantalla.classList.toggle("crisis-planeta-100", crisisPlaneta === 100);
    if (!fondoPlaneta.dataset.controlError) {
        fondoPlaneta.dataset.controlError = "1";
        fondoPlaneta.addEventListener("error", function () {
            fondoPlaneta.setAttribute("src", RUTAS_PLANETA_JUEGO[0]);
            if (escenaPlaneta !== null) {
                escenaPlaneta.style.backgroundImage = 'url("' + RUTAS_PLANETA_JUEGO[0] + '")';
            }
        });
    }
    if (escenaPlaneta !== null && escenaPlaneta.style.backgroundImage === "") {
        escenaPlaneta.style.backgroundImage = 'url("' + (fondoPlaneta.getAttribute("src") || RUTAS_PLANETA_JUEGO[0]) + '")';
    }
    if (fondoPlaneta.getAttribute("src") !== rutaPlaneta) {
        const siguienteFondo = new Image();
        siguienteFondo.addEventListener("load", function () {
            fondoPlaneta.setAttribute("src", rutaPlaneta);
            if (escenaPlaneta !== null) {
                escenaPlaneta.style.backgroundImage = 'url("' + rutaPlaneta + '")';
            }
        });
        siguienteFondo.addEventListener("error", function () {
            if (escenaPlaneta !== null) {
                escenaPlaneta.style.backgroundImage = 'url("' + RUTAS_PLANETA_JUEGO[0] + '")';
            }
        });
        siguienteFondo.src = rutaPlaneta;
    }
    if (tramoAnterior !== undefined && tramoAnterior !== String(tramoPlaneta)) {
        pantalla.classList.remove("planeta-cambia-estado", "planeta-empeora-estado", "planeta-mejora-estado");
        void pantalla.offsetWidth;
        pantalla.classList.add("planeta-cambia-estado");
        if (crisisAnterior !== undefined && crisisPlaneta > Number(crisisAnterior)) {
            pantalla.classList.add("planeta-empeora-estado");
        }
        else {
            pantalla.classList.add("planeta-mejora-estado");
        }
        window.setTimeout(function () {
            pantalla.classList.remove("planeta-cambia-estado", "planeta-empeora-estado", "planeta-mejora-estado");
        }, 1250);
    }
    pantalla.dataset.tramoPlaneta = String(tramoPlaneta);
    pantalla.dataset.crisisVisual = String(crisisPlaneta);
}
/**
 * Sustituye directamente el asset del avatar según su tramo visual.
 * La imagen contiene por sí misma la evolución; no añadimos efectos artificiales.
 */
function actualizarAvatar(idAvatar, clases, nivelNuevo) {
    const avatar = elemento(idAvatar);
    avatar.className = clases;
    avatar.dataset.nivelVisual = String(nivelNuevo);
}
/** Rellena una lista <ul> con los nombres de las capacidades conquistadas. */
export function pintarCapacidades(idLista, capacidades) {
    const lista = elemento(idLista);
    lista.innerHTML = "";
    if (capacidades.length === 0) {
        const vacio = document.createElement("li");
        vacio.className = "capacidad-vacia";
        vacio.textContent = "Ninguna todavía";
        lista.appendChild(vacio);
        return;
    }
    for (let i = 0; i < capacidades.length; i++) {
        const ficha = buscarCapacidad(capacidades[i]);
        const linea = document.createElement("li");
        linea.className = "capacidad-adquirida capacidad-" + capacidades[i];
        if (ficha !== null) {
            const nombre = document.createElement("strong");
            nombre.textContent = ficha.nombre;
            const efecto = document.createElement("small");
            efecto.textContent = ficha.efecto;
            linea.appendChild(nombre);
            linea.appendChild(efecto);
            linea.title = ficha.efecto;
        }
        else {
            linea.textContent = capacidades[i];
        }
        lista.appendChild(linea);
    }
}
// ---- La zona de la ronda --------------------------------------------------
/** Escribe la ronda, la crisis y, si la hay, la carta de crisis. */
export function pintarCabeceraRonda(partida) {
    let texto = "RONDA " + partida.getRonda();
    if (partida.getTotalRondas() > 0) {
        texto = texto + " / " + partida.getTotalRondas();
    }
    else {
        texto = texto + " · LIBRE";
    }
    escribir("contador-ronda", texto);
    const crisis = partida.getCrisisActual();
    escribir("nombre-crisis", crisis);
    escribir("descripcion-crisis", descripcionCrisis(crisis));
    escribir("puntos-en-juego", describirPuntosEnJuego(partida));
    const evento = partida.getEventoActivo();
    if (evento !== null && evento.getId() !== "chispa") {
        escribir("evento-activo-nombre", evento.getNombre());
        escribir("evento-activo-efecto", evento.getDescripcion());
        mostrar("evento-activo-resumen");
    }
    else {
        ocultar("evento-activo-resumen");
    }
    const carta = partida.getCartaCrisis();
    const impacto = document.querySelector(".hud-impacto");
    if (impacto !== null) {
        impacto.classList.toggle("con-modificador", carta !== null);
        impacto.classList.remove("modificador-positivo", "modificador-negativo", "modificador-mixto");
    }
    if (carta === null) {
        ocultar("tarjeta-carta-crisis");
        escribir("regla-ronda", "Sin modificador · CONVERGENCIA: la CRISIS baja la suma exacta de las dos cartas · FRACASO: la CRISIS sube 3 puntos");
    }
    else {
        const tipo = carta.tipo.toLowerCase();
        escribir("tipo-carta-crisis", "MODIFICADOR " + carta.tipo.toUpperCase());
        escribir("nombre-carta-crisis", carta.nombre);
        escribir("descripcion-carta-crisis", carta.efecto);
        escribir("impacto-carta-crisis", impactoCartaCrisis(carta.id));
        const tarjeta = elemento("tarjeta-carta-crisis");
        tarjeta.className = "tarjeta-carta-crisis hud-modificador crisis-" + tipo;
        if (impacto !== null) {
            impacto.classList.add("modificador-" + tipo);
        }
        mostrar("tarjeta-carta-crisis");
        escribir("regla-ronda", reglaResumenCarta(carta.id));
    }
}
/**
 * PUNTOS EN JUEGO · V12
 * Siempre informa de la horquilla posible ANTES de escoger carta.
 * No modifica la lógica: solo traduce las reglas existentes a un texto claro.
 */
function describirPuntosEnJuego(partida) {
    // La carta de la IA es secreta: antes de resolver mostramos la REGLA,
    // no una cifra inventada ni un intervalo que pueda confundir.
    let convergencia = "reduce la CRISIS en la suma de las 2 cartas";
    let fracaso = partida.hayEvento("sinretorno") ? "aumenta la CRISIS 6 puntos" : "aumenta la CRISIS 3 puntos";
    let rivalidad = "la CRISIS no cambia";
    if (partida.hayEvento("sobrecarga")) {
        convergencia = "reduce la CRISIS según la suma (la carta IA cuenta +1)";
    }
    const carta = partida.getCartaCrisis();
    if (carta !== null) {
        if (carta.id === "renovable") {
            convergencia = convergencia + " ×2";
        }
        else if (carta.id === "circular") {
            convergencia = convergencia + " y 3 puntos extra";
        }
        else if (carta.id === "incendio") {
            rivalidad = "aumenta la CRISIS 3 puntos";
            fracaso = partida.hayEvento("sinretorno") ? "aumenta la CRISIS 9 puntos" : "aumenta la CRISIS 6 puntos";
        }
        else if (carta.id === "sequia") {
            const extraFracaso = partida.hayEvento("sinretorno") ? 6 : 3;
            return "SEQUÍA · La suma de las cartas AUMENTA la CRISIS · FRACASO añade además +" + extraFracaso;
        }
        else if (carta.id === "inflexion") {
            convergencia = convergencia + " ×2";
            fracaso = partida.hayEvento("sinretorno") ? "aumenta la CRISIS 12 puntos" : "aumenta la CRISIS 6 puntos";
        }
    }
    if (partida.hayEvento("cumbre")) {
        convergencia = convergencia + " ×2";
    }
    if (rivalidad !== "la CRISIS no cambia") {
        return "CONVERGENCIA → " + convergencia + " · RIVALIDAD → " + rivalidad + " · FRACASO → " + fracaso;
    }
    return "CONVERGENCIA → " + convergencia + " · FRACASO → " + fracaso;
}
/** Explicación narrativa corta de la crisis ecológica de la ronda. */
function descripcionCrisis(nombre) {
    if (nombre === "Incendios forestales")
        return "El fuego avanza sobre ecosistemas y zonas habitadas; cada decisión puede contenerlo o agravarlo.";
    if (nombre === "Contaminación oceánica")
        return "Los océanos pierden capacidad de regeneración y la cadena ecológica se debilita.";
    if (nombre === "Sequía prolongada")
        return "El agua disponible disminuye y aumenta la presión sobre ciudades, cultivos y ecosistemas.";
    if (nombre === "Pérdida de biodiversidad")
        return "La desaparición de especies reduce la resiliencia del planeta frente a nuevas crisis.";
    if (nombre === "Desertificación")
        return "El suelo fértil retrocede y los territorios habitables pierden recursos esenciales.";
    if (nombre === "Residuos electrónicos")
        return "El avance tecnológico deja una huella tóxica que exige decisiones coordinadas.";
    if (nombre === "Calentamiento global")
        return "La temperatura media continúa aumentando y multiplica los riesgos ambientales.";
    if (nombre === "Escasez energética")
        return "La demanda supera la capacidad disponible y obliga a replantear cómo se distribuye la energía.";
    return "El planeta afronta una nueva crisis y la ronda decidirá hacia dónde evoluciona el equilibrio.";
}
/** Texto que deja claro, antes de jugar, qué puede sumar o restar el modificador. */
function impactoCartaCrisis(id) {
    if (id === "renovable")
        return "POSITIVA · Si hay CONVERGENCIA, la reducción de CRISIS se duplica.";
    if (id === "circular")
        return "POSITIVA · Si hay CONVERGENCIA, la CRISIS baja 3 puntos extra.";
    if (id === "incendio")
        return "NEGATIVA · Si NO hay CONVERGENCIA, la CRISIS aumenta 3 puntos adicionales.";
    if (id === "sequia")
        return "NEGATIVA · La suma de las cartas AUMENTA la CRISIS esta ronda.";
    if (id === "inflexion")
        return "MIXTA · Cualquier cambio de CRISIS vale ×2 y no se conquistan fortalezas.";
    return "";
}
/** Resumen muy corto de la regla, visible junto a la crisis. */
function reglaResumenCarta(id) {
    if (id === "renovable")
        return "CONVERGENCIA: CRISIS −(suma ×2) · RIVALIDAD: sin cambio · FRACASO: CRISIS +3";
    if (id === "circular")
        return "CONVERGENCIA: CRISIS −(suma +3) · RIVALIDAD: sin cambio · FRACASO: CRISIS +3";
    if (id === "incendio")
        return "Sin CONVERGENCIA: CRISIS +3 adicionales";
    if (id === "sequia")
        return "La suma de cartas AUMENTA la CRISIS, incluso si hay CONVERGENCIA";
    if (id === "inflexion")
        return "Todo cambio de CRISIS ×2 · esta ronda no conquista fortalezas";
    return "";
}
/**
 * Pistas que ve el jugador antes de apostar:
 *   - Análisis predictivo: recomendación calculada para convergencia/rivalidad.
 *   - Chispa creativa (evento): la carta que la IA ha puesto boca abajo.
 */
export function pintarPistas(partida) {
    const jugador = partida.getJugador();
    const puede = partida.capacidadesPermitidas();
    // ANÁLISIS PREDICTIVO · V17: la información pertenece a la fortaleza conquistada,
    // por eso se muestra exclusivamente en el lateral humano y nunca sobre la esfera.
    if (jugador.tiene("analisis") && puede && !partida.hayEvento("sobrecarga")) {
        const consejo = partida.getConsejoAnalisis();
        pintarAvisoFortaleza("pista-analisis-lateral", "ANÁLISIS PREDICTIVO", "Para buscar CONVERGENCIA: " + consejo.convergencia + ". Para buscar RIVALIDAD: " + consejo.rivalidad + ".");
        mostrar("pista-analisis-lateral");
    }
    else {
        ocultar("pista-analisis-lateral");
    }
    // CHISPA CREATIVA: la carta revelada se integra en el panel donde se decide.
    if (partida.hayEvento("chispa")) {
        const cartaIA = partida.getCartaIA();
        const imagenCarta = elemento("carta-chispa-ia");
        imagenCarta.src = "./assets/images/partida/cartas/ia/carta-ia-" + cartaIA + ".webp";
        imagenCarta.alt = "Carta " + cartaIA + " elegida por la IA";
        escribir("texto-chispa", "Carta IA: " + cartaIA + " · su apuesta permanece oculta.");
        mostrar("pista-chispa");
        elemento("zona-declaraciones").classList.add("chispa-activa");
    }
    else {
        ocultar("pista-chispa");
        elemento("zona-declaraciones").classList.remove("chispa-activa");
    }
}
/**
 * Pinta las cartas que la IA todavía no ha revelado en este ciclo.
 *
 * Es la información que convierte el juego en algo más que una moneda al
 * aire: sabiendo qué le queda a la IA, el jugador puede elegir su carta
 * para forzar que la suma salga par o impar.
 */
function pintarAvisoFortaleza(id, nombre, mensaje) {
    const contenedor = elemento(id);
    contenedor.innerHTML = "";
    const etiqueta = document.createElement("span");
    etiqueta.className = "fortaleza-aviso-nombre";
    etiqueta.textContent = nombre;
    const texto = document.createElement("span");
    texto.className = "fortaleza-aviso-texto";
    texto.textContent = mensaje;
    contenedor.appendChild(etiqueta);
    contenedor.appendChild(texto);
}
export function pintarCartasIA(partida) {
    const contenedor = elemento("lista-cartas-ia");
    contenedor.innerHTML = "";
    const porRevelar = partida.getCartasIAPorRevelar();
    for (let i = 0; i < porRevelar.length; i++) {
        const ficha = document.createElement("span");
        ficha.className = "carta-pequena";
        ficha.textContent = String(porRevelar[i]);
        ficha.dataset.valor = String(porRevelar[i]);
        ficha.style.backgroundImage =
            'url("./assets/images/partida/cartas/ia/carta-ia-3.webp")';
        contenedor.appendChild(ficha);
    }
    // ADQUIRIDA ≠ ACTIVA: este aviso solo existe cuando una fortaleza de la IA
    // está interviniendo realmente en la ronda actual.
    const avisosIA = partida.getAvisosFortalezasIA();
    if (avisosIA.length > 0) {
        let mensaje = avisosIA.join(" · ");
        if (partida.iaJuegaACartasVistas()) {
            mensaje = mensaje + ". CARTA REVELADA: " + partida.getCartaIA() + ".";
        }
        pintarAvisoFortaleza("carta-vista-ia", "FORTALEZA IA ACTIVA", mensaje);
        mostrar("carta-vista-ia");
    }
    else {
        ocultar("carta-vista-ia");
    }
}
/**
 * Escribe la apuesta que ha cantado la IA y recuerda al jugador qué pasa
 * según se alinee con ella o la desafíe. Es la decisión de la ronda, así
 * que va en grande y con las consecuencias delante.
 */
export function pintarDeclaracionIA(partida) {
    // CHISPA CREATIVA cambia la información de esta ronda: el jugador puede
    // ver la carta elegida por la IA, pero su apuesta PAR/IMPAR debe permanecer
    // oculta hasta la resolución. Ocultamos también el texto de consecuencias
    // normal porque contiene la apuesta y la revelaría indirectamente.
    if (partida.hayEvento("chispa")) {
        ocultar("declaracion-ia");
        ocultar("consecuencia-apuesta");
        return;
    }
    mostrar("declaracion-ia");
    mostrar("consecuencia-apuesta");
    const declarada = partida.getApuestaDeclaradaIA();
    escribir("apuesta-declarada", declarada);
    const contraria = declarada === "PAR" ? "IMPAR" : "PAR";
    escribir("consecuencia-apuesta", "IGUALA " + declarada + " → CONVERGENCIA · ELIGE " + contraria +
        " → RIVALIDAD por una fortaleza");
}
/** Panel lateral de la capacidad Memoria: últimas tres jugadas de la IA. */
export function pintarMemoria(partida) {
    const jugador = partida.getJugador();
    if (!jugador.tiene("memoria") || !partida.capacidadesPermitidas()) {
        ocultar("panel-memoria");
        return;
    }
    const cartas = partida.getIA().getHistorialCartas();
    const apuestas = partida.getIA().getHistorialApuestas();
    const lista = elemento("lista-memoria");
    lista.innerHTML = "";
    let desde = cartas.length - 3;
    if (desde < 0) {
        desde = 0;
    }
    for (let i = desde; i < cartas.length; i++) {
        // MEMORIA · V19
        // Cada jugada se representa como una mini ficha táctica para que el
        // jugador identifique de un vistazo ronda, carta y declaración de la IA.
        const linea = document.createElement("li");
        linea.className = "entrada-memoria-tactica";
        const ronda = document.createElement("span");
        ronda.className = "memoria-ronda";
        ronda.textContent = "R" + (i + 1);
        const carta = document.createElement("strong");
        carta.className = "memoria-carta";
        carta.textContent = "CARTA " + cartas[i];
        const apuesta = document.createElement("span");
        apuesta.className = "memoria-apuesta memoria-apuesta-" + String(apuestas[i]).toLowerCase();
        apuesta.textContent = apuestas[i];
        linea.appendChild(ronda);
        linea.appendChild(carta);
        linea.appendChild(apuesta);
        lista.appendChild(linea);
    }
    if (cartas.length === 0) {
        const vacio = document.createElement("li");
        vacio.className = "entrada-memoria-vacia";
        vacio.textContent = "Aún no hay jugadas registradas";
        lista.appendChild(vacio);
    }
    mostrar("panel-memoria");
}
/**
 * Pinta la mano de cartas del jugador.
 *
 * Recibe la función que hay que ejecutar al pulsar una carta: así este
 * archivo no necesita saber qué pasa después, solo avisa de que se ha
 * pulsado. Las cartas ya jugadas aparecen descartadas y no se pueden pulsar.
 */
export function pintarMano(jugador, seleccionadas, alPulsar, cartasHabilitadas = true) {
    const contenedor = elemento("mano-cartas");
    contenedor.innerHTML = "";
    const mano = jugador.getMano();
    for (let i = 0; i < mano.length; i++) {
        const carta = mano[i];
        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = String(carta.getValor());
        boton.className = "carta-mano";
        boton.dataset.valor = String(carta.getValor());
        boton.setAttribute("aria-label", "Seleccionar carta " + carta.getValor());
        boton.setAttribute("aria-pressed", "false");
        // ASSET CARTA · V7
        // Cada número tiene su SVG individual. La animación sigue estando en CSS.
        boton.style.backgroundImage =
            'url("./assets/images/partida/cartas/humano/carta-humano-' + carta.getValor() + '.webp")';
        if (!carta.estaDisponible()) {
            boton.classList.add("descartada");
            boton.disabled = true;
        }
        else if (!cartasHabilitadas) {
            boton.classList.add("esperando-apuesta");
            boton.setAttribute("aria-disabled", "true");
            boton.setAttribute("aria-description", "Primero declara PAR o IMPAR");
        }
        for (let j = 0; j < seleccionadas.length; j++) {
            if (seleccionadas[j] === carta.getValor()) {
                boton.classList.add("seleccionada");
                boton.setAttribute("aria-pressed", "true");
            }
        }
        // ============================================================
        // CARTAS · V11 · CLICK DIRECTO Y ESTABLE
        // ------------------------------------------------------------
        // La carta se crea UNA VEZ al comenzar la ronda.
        // Al hacer click NO reconstruimos la mano: solo cambiamos clases.
        // Esto evita perder el hover, el click y la animación.
        // ============================================================
        if (!boton.disabled) {
            boton.addEventListener("click", function () {
                alPulsar(carta.getValor());
            });
        }
        contenedor.appendChild(boton);
    }
}
/** Activa la mano existente después de declarar sin reconstruir sus botones. */
export function habilitarCartasTrasApuesta() {
    const botones = document.querySelectorAll("#mano-cartas button.carta-mano.esperando-apuesta");
    for (let i = 0; i < botones.length; i++) {
        botones[i].classList.remove("esperando-apuesta");
        botones[i].removeAttribute("aria-disabled");
        botones[i].removeAttribute("aria-description");
    }
}
/**
 * CARTAS · V11 · ACTUALIZAR SOLO LA SELECCIÓN
 * ------------------------------------------------------------
 * No borra ni vuelve a crear las cartas.
 * Recorre los botones que ya existen y añade/quita .seleccionada.
 * Así el elemento bajo el ratón sigue siendo el mismo.
 */
export function pintarSeleccionCartas(seleccionadas) {
    const botones = document.querySelectorAll("#mano-cartas button.carta-mano");
    for (let i = 0; i < botones.length; i++) {
        const boton = botones[i];
        const valor = Number(boton.dataset.valor);
        let seleccionada = false;
        for (let j = 0; j < seleccionadas.length; j++) {
            if (seleccionadas[j] === valor) {
                seleccionada = true;
            }
        }
        if (seleccionada) {
            boton.classList.add("seleccionada");
            boton.setAttribute("aria-pressed", "true");
        }
        else {
            boton.classList.remove("seleccionada");
            boton.setAttribute("aria-pressed", "false");
        }
    }
}
/** Marca visualmente qué botón de apuesta ha elegido el jugador. */
export function pintarApuestaElegida(apuesta) {
    elemento("btn-apuesta-par").classList.remove("seleccionada");
    elemento("btn-apuesta-impar").classList.remove("seleccionada");
    if (apuesta === "PAR") {
        elemento("btn-apuesta-par").classList.add("seleccionada");
    }
    if (apuesta === "IMPAR") {
        elemento("btn-apuesta-impar").classList.add("seleccionada");
    }
}
// ---- Resolución de la ronda ------------------------------------------------
/** Muestra las cartas reveladas, la suma y qué ha pasado. */
export function pintarResolucion(resumen) {
    const panelResultado = elemento("zona-resolucion");
    ocultar("zona-resolucion");
    panelResultado.classList.remove("panel-resultado-entra");
    if (temporizadorPanelResultado !== null) {
        window.clearTimeout(temporizadorPanelResultado);
        temporizadorPanelResultado = null;
    }
    // Debajo de cada carta va LA APUESTA de cada uno, y debajo de la suma el
    // resultado real. Se escribe la frase entera para que no se confundan:
    // el "IMPAR" de tu carta es lo que apostaste, no la paridad de la carta.
    escribir("valor-carta-jugador", String(resumen.cartaJugador));
    escribir("apuesta-jugador", "apostaste " + resumen.apuestaJugador);
    escribir("valor-carta-ia", String(resumen.cartaIA));
    escribir("apuesta-ia", "apostó " + resumen.apuestaIA);
    escribir("valor-suma", String(resumen.suma));
    escribir("resultado-paridad", "la suma es " + resumen.paridad);
    const recuperacionCompleta = resumen.saludPlanetaDespues >= SALUD_MAXIMA && resumen.saludPlanetaAntes < SALUD_MAXIMA;
    escribir("resultado-ronda", recuperacionCompleta ? "PLANETA RECUPERADO" : resumen.resultado);
    elemento("resultado-ronda").className = recuperacionCompleta
        ? "resultado-ronda resultado-convergencia"
        : "resultado-ronda resultado-" + resumen.resultado.toLowerCase();
    panelResultado.classList.remove("ronda-convergencia", "ronda-fracaso", "ronda-rivalidad-humano", "ronda-rivalidad-ia", "ronda-neutral", "recuperacion-planetaria-completa");
    if (recuperacionCompleta) {
        panelResultado.classList.add("recuperacion-planetaria-completa");
    }
    if (resumen.resultado === "CONVERGENCIA") {
        panelResultado.classList.add("ronda-convergencia");
    }
    else if (resumen.resultado === "FRACASO") {
        panelResultado.classList.add("ronda-fracaso");
    }
    else if (resumen.resultado === "RIVALIDAD" && resumen.ganador === "HUMANO") {
        panelResultado.classList.add("ronda-rivalidad-humano");
    }
    else if (resumen.resultado === "RIVALIDAD" && resumen.ganador === "IA") {
        panelResultado.classList.add("ronda-rivalidad-ia");
    }
    else {
        panelResultado.classList.add("ronda-neutral");
    }
    escribir("detalle-ronda", construirDetalle(resumen));
    pintarCambiosRonda(resumen);
    activarFeedbackRonda(resumen);
    // ANIMACIÓN CONVERGENCIA · PRINCIPIANTE
    // Si los dos aciertan, añadimos una clase al núcleo central. El CSS hace
    // la explosión/onda; JavaScript no calcula posiciones ni partículas.
    if (resumen.resultado === "CONVERGENCIA") {
        activarConvergenciaVisual();
    }
    else if (resumen.resultado === "FRACASO") {
        activarFracasoVisual(resumen);
    }
    else if (resumen.resultado === "RIVALIDAD") {
        activarRivalidadVisual(resumen.ganador);
    }
    const duracionHito = mostrarHitosDeEvolucion(resumen);
    const retraso = duracionHito > 0 ? duracionHito : 820;
    temporizadorPanelResultado = window.setTimeout(function () {
        mostrar("zona-resolucion");
        panelResultado.classList.remove("panel-resultado-entra");
        void panelResultado.offsetWidth;
        panelResultado.classList.add("panel-resultado-entra");
        temporizadorPanelResultado = null;
    }, retraso);
}
/**
 * Da a cada cruce de 25% un momento propio antes del resumen. Así el cambio
 * de retrato o de planeta no queda escondido detrás del panel de resultado.
 */
function mostrarHitosDeEvolucion(resumen) {
    // V22.24: el cambio de avatar ya se ve directamente en el retrato.
    // Este hito se conserva solo para cambios importantes del estado del planeta.
    const crisisAntes = 100 - calcularPorcentaje(resumen.saludPlanetaAntes, SALUD_MAXIMA);
    const crisisDespues = 100 - calcularPorcentaje(resumen.saludPlanetaDespues, SALUD_MAXIMA);
    const tramoPlanetaAntes = crisisAntes >= 100 ? 4 : calcularTramoVisual(crisisAntes);
    const tramoPlanetaDespues = crisisDespues >= 100 ? 4 : calcularTramoVisual(crisisDespues);
    if (tramoPlanetaAntes === tramoPlanetaDespues)
        return 0;
    const estados = ["EQUILIBRIO SALUDABLE", "EQUILIBRIO FRÁGIL", "EQUILIBRIO CRÍTICO", "COLAPSO INMINENTE", "CRISIS CATASTRÓFICA"];
    const capa = elemento("hito-evolucion");
    const contenido = elemento("hito-evolucion-contenido");
    contenido.innerHTML = "";
    const tarjeta = document.createElement("article");
    tarjeta.className = "hito-evolucion-tarjeta hito-planeta";
    const texto = document.createElement("div");
    texto.className = "hito-evolucion-texto";
    const titulo = document.createElement("span");
    titulo.textContent = "CRISIS DEL PLANETA";
    const valor = document.createElement("strong");
    valor.textContent = estados[tramoPlanetaAntes] + " → " + estados[tramoPlanetaDespues];
    texto.appendChild(titulo);
    texto.appendChild(valor);
    tarjeta.appendChild(texto);
    const comparacion = document.createElement("div");
    comparacion.className = "hito-evolucion-comparacion";
    function crearEstado(etiqueta, valorEstado, nivelPlaneta) {
        const estado = document.createElement("div");
        estado.className = "hito-evolucion-estado hito-estado-" + etiqueta.toLowerCase();
        const rotulo = document.createElement("span");
        rotulo.className = "hito-evolucion-rotulo";
        rotulo.textContent = etiqueta;
        // El comparador usa un fondo CSS directo. Los cinco assets ya están
        // precargados y no dependemos de un <img> que pueda quedarse vacío.
        const visual = document.createElement("div");
        visual.className = "hito-planeta-visual planeta-nivel-" + nivelPlaneta;
        const rutaVisual = rutaPlanetaJuego(nivelPlaneta);
        visual.style.backgroundImage = 'url("' + rutaVisual + '")';
        visual.setAttribute("role", "img");
        visual.setAttribute("aria-label", etiqueta + " · estado visual de Crisis " + valorEstado);
        const porcentaje = document.createElement("strong");
        porcentaje.className = "hito-evolucion-porcentaje";
        porcentaje.textContent = valorEstado;
        estado.appendChild(rotulo);
        estado.appendChild(visual);
        estado.appendChild(porcentaje);
        return estado;
    }
    comparacion.appendChild(crearEstado("ANTES", crisisAntes + "%", tramoPlanetaAntes));
    const flecha = document.createElement("span");
    flecha.className = "hito-evolucion-flecha";
    flecha.textContent = "→";
    comparacion.appendChild(flecha);
    comparacion.appendChild(crearEstado("AHORA", crisisDespues + "%", tramoPlanetaDespues));
    tarjeta.appendChild(comparacion);
    contenido.appendChild(tarjeta);
    const duracion = 5600;
    capa.style.setProperty("--duracion-hito", duracion + "ms");
    capa.classList.remove("oculta", "hito-entra");
    void capa.offsetWidth;
    capa.classList.add("hito-entra");
    window.setTimeout(function () {
        capa.classList.add("oculta");
        capa.classList.remove("hito-entra");
    }, duracion);
    return duracion;
}
/** Pinta los cambios numéricos de la ronda para que ninguna penalización quede oculta. */
function pintarCambiosRonda(resumen) {
    const saludAntes = calcularPorcentaje(resumen.saludPlanetaAntes, SALUD_MAXIMA);
    const saludDespues = calcularPorcentaje(resumen.saludPlanetaDespues, SALUD_MAXIMA);
    const crisisAntes = 100 - saludAntes;
    const crisisDespues = 100 - saludDespues;
    const cambioCrisis = crisisDespues - crisisAntes;
    const humanoAntes = calcularPorcentaje(resumen.evolucionJugadorAntes, EVOLUCION_MAXIMA_BARRA);
    const humanoDespues = calcularPorcentaje(resumen.evolucionJugadorDespues, EVOLUCION_MAXIMA_BARRA);
    const iaAntes = calcularPorcentaje(resumen.evolucionIAAntes, EVOLUCION_MAXIMA_BARRA);
    const iaDespues = calcularPorcentaje(resumen.evolucionIADespues, EVOLUCION_MAXIMA_BARRA);
    pintarCambio("cambio-planeta-ronda", "CRISIS", crisisAntes, crisisDespues, cambioCrisis, "crisis");
    pintarCambio("cambio-humano-ronda", "HUMANO", humanoAntes, humanoDespues, resumen.puntosJugador, "");
    pintarCambio("cambio-ia-ronda", "IA", iaAntes, iaDespues, resumen.puntosIA, "ia");
}
function pintarCambio(id, nombre, antes, despues, puntos, tipo) {
    const ficha = elemento(id);
    let signo = "";
    if (puntos > 0)
        signo = "+";
    ficha.textContent = nombre + " " + antes + "% → " + despues + "% (" + signo + puntos + " pts)";
    ficha.className = "cambio-ronda";
    // En CRISIS el significado del signo es inverso: bajar es bueno y subir es malo.
    if (tipo === "crisis") {
        if (puntos < 0)
            ficha.classList.add("positivo");
        if (puntos > 0)
            ficha.classList.add("negativo");
        return;
    }
    if (puntos > 0)
        ficha.classList.add(tipo === "ia" ? "ia-positivo" : "positivo");
    if (puntos < 0)
        ficha.classList.add("negativo");
}
/** Construye la frase que explica los puntos repartidos en la ronda. */
function construirDetalle(resumen) {
    let detalle = resumen.explicacion;
    if (resumen.intuicionIA) {
        detalle = "INTUICIÓN IA ACTIVADA · la IA utilizó tu elección como pista y cambió su carta antes de revelar. " + detalle;
    }
    if (resumen.capacidadConquistada !== "") {
        if (resumen.ganador === "HUMANO") {
            detalle = detalle + " Has conquistado: " + resumen.capacidadConquistada + ".";
        }
        else {
            detalle = detalle + " La IA te ha conquistado: " + resumen.capacidadConquistada + ".";
        }
    }
    return detalle;
}
/**
 * Reinicia el destello del núcleo NEXO para que pueda reproducirse en otra ronda.
 * AUDIO FUTURO: aquí se puede añadir el sonido de convergencia cuando esté listo.
 */
let temporizadorDescargasNexo = null;
let temporizadorPanelResultado = null;
/**
 * FEEDBACK DE RONDA · V12
 * - FRACASO: sacudida siempre.
 * - Si además cruza a un tramo planetario peor, la sacudida es más fuerte.
 * - Recuperación: destello verde/cian.
 * - Si cruza a un tramo mejor, el destello es más intenso.
 *
 * Solo añadimos clases CSS: no hay canvas ni física.
 */
function activarFeedbackRonda(resumen) {
    const pantalla = elemento("pantalla-juego");
    pantalla.classList.remove("feedback-fracaso", "feedback-fracaso-fuerte", "feedback-recuperacion", "feedback-recuperacion-fuerte");
    const crisisAntes = 100 - calcularPorcentaje(resumen.saludPlanetaAntes, SALUD_MAXIMA);
    const crisisDespues = 100 - calcularPorcentaje(resumen.saludPlanetaDespues, SALUD_MAXIMA);
    const tramoAntes = calcularTramoVisual(crisisAntes);
    const tramoDespues = calcularTramoVisual(crisisDespues);
    if (resumen.resultado === "FRACASO" || resumen.puntosPlaneta < 0) {
        pantalla.classList.add("feedback-fracaso");
        if (tramoDespues > tramoAntes) {
            pantalla.classList.add("feedback-fracaso-fuerte");
        }
    }
    else if (resumen.puntosPlaneta > 0) {
        pantalla.classList.add("feedback-recuperacion");
        if (tramoDespues < tramoAntes) {
            pantalla.classList.add("feedback-recuperacion-fuerte");
        }
    }
    window.setTimeout(function () {
        pantalla.classList.remove("feedback-fracaso", "feedback-fracaso-fuerte", "feedback-recuperacion", "feedback-recuperacion-fuerte");
    }, 1250);
}
/**
 * CONVERGENCIA · V12
 * La esfera bajo la X se expande y varias rutas entre nodos se encienden
 * de forma pseudoaleatoria durante la explosión.
 */
function activarConvergenciaVisual() {
    const nucleo = document.getElementById("nexo-nucleo-partida");
    if (nucleo === null) {
        return;
    }
    nucleo.classList.remove("convergencia-activa", "fracaso-activo", "fracaso-fuerte", "rivalidad-humano-activa", "rivalidad-ia-activa");
    void nucleo.offsetWidth;
    nucleo.classList.add("convergencia-activa");
    const rutas = nucleo.querySelectorAll(".descarga-nucleo");
    for (let i = 0; i < rutas.length; i++) {
        rutas[i].classList.remove("descarga-activa");
    }
    if (temporizadorDescargasNexo !== null) {
        window.clearInterval(temporizadorDescargasNexo);
    }
    let pasos = 0;
    temporizadorDescargasNexo = window.setInterval(function () {
        for (let i = 0; i < rutas.length; i++) {
            rutas[i].classList.remove("descarga-activa");
        }
        if (rutas.length > 0) {
            const primera = Math.floor(Math.random() * rutas.length);
            rutas[primera].classList.add("descarga-activa");
            if (rutas.length > 1) {
                let segunda = Math.floor(Math.random() * rutas.length);
                if (segunda === primera) {
                    segunda = (segunda + 1) % rutas.length;
                }
                rutas[segunda].classList.add("descarga-activa");
            }
        }
        pasos = pasos + 1;
        if (pasos >= 10) {
            window.clearInterval(temporizadorDescargasNexo);
            temporizadorDescargasNexo = null;
        }
    }, 90);
}
/** FRACASO: contracción, interferencias y pulso rojo; aumenta con la penalización. */
function activarFracasoVisual(resumen) {
    const nucleo = document.getElementById("nexo-nucleo-partida");
    if (nucleo === null)
        return;
    nucleo.classList.remove("convergencia-activa", "fracaso-activo", "fracaso-fuerte", "rivalidad-humano-activa", "rivalidad-ia-activa");
    void nucleo.offsetWidth;
    nucleo.classList.add("fracaso-activo");
    if (Math.abs(resumen.puntosPlaneta) >= 6)
        nucleo.classList.add("fracaso-fuerte");
    const rutas = nucleo.querySelectorAll(".descarga-nucleo");
    for (let i = 0; i < rutas.length; i++)
        rutas[i].classList.add("descarga-activa");
}
/** RIVALIDAD: la energía se dirige visualmente hacia quien conquista la ronda. */
function activarRivalidadVisual(ganador) {
    const nucleo = document.getElementById("nexo-nucleo-partida");
    if (nucleo === null)
        return;
    nucleo.classList.remove("convergencia-activa", "fracaso-activo", "fracaso-fuerte", "rivalidad-humano-activa", "rivalidad-ia-activa");
    void nucleo.offsetWidth;
    if (ganador === "HUMANO")
        nucleo.classList.add("rivalidad-humano-activa");
    if (ganador === "IA")
        nucleo.classList.add("rivalidad-ia-activa");
}
export function ocultarResolucion() {
    ocultar("zona-resolucion");
    if (temporizadorPanelResultado !== null) {
        window.clearTimeout(temporizadorPanelResultado);
        temporizadorPanelResultado = null;
    }
    // CONVERGENCIA · V17: la luz/descargas no sobreviven al cambio de ronda.
    const nucleo = document.getElementById("nexo-nucleo-partida");
    if (nucleo !== null) {
        nucleo.classList.remove("convergencia-activa", "fracaso-activo", "fracaso-fuerte", "rivalidad-humano-activa", "rivalidad-ia-activa");
        const rutas = nucleo.querySelectorAll(".descarga-nucleo");
        for (let i = 0; i < rutas.length; i++) {
            rutas[i].classList.remove("descarga-activa");
        }
    }
    if (temporizadorDescargasNexo !== null) {
        window.clearInterval(temporizadorDescargasNexo);
        temporizadorDescargasNexo = null;
    }
    escribir("valor-carta-jugador", "?");
    escribir("valor-carta-ia", "?");
    escribir("valor-suma", "?");
    escribir("resultado-paridad", "—");
    escribir("apuesta-jugador", "—");
    escribir("apuesta-ia", "—");
}
/** Muestra la tarjeta superpuesta de un evento especial. */
export function mostrarEvento(idEvento, nombre, descripcion) {
    escribir("nombre-evento", nombre);
    escribir("descripcion-evento", descripcion);
    const imagen = elemento("imagen-evento");
    imagen.src = rutaImagenEvento(idEvento);
    imagen.alt = "Ilustración del evento " + nombre;
    mostrar("superposicion-evento");
}
/** Cada evento especial usa una imagen raster WebP cinematográfica propia. */
function rutaImagenEvento(idEvento) {
    if (idEvento === "tormenta")
        return "./assets/images/partida/eventos/evento-tormenta-solar.webp";
    if (idEvento === "cumbre")
        return "./assets/images/partida/eventos/evento-cumbre-emergencia.webp";
    if (idEvento === "sobrecarga")
        return "./assets/images/partida/eventos/evento-sobrecarga-datos.webp";
    if (idEvento === "chispa")
        return "./assets/images/partida/eventos/evento-chispa-creativa.webp";
    return "./assets/images/partida/eventos/evento-punto-sin-retorno.webp";
}
export function ocultarEvento() {
    ocultar("superposicion-evento");
}
// ---- Pantallas de inicio y final --------------------------------------------
/** Enseña en la pantalla de inicio la mejor marca guardada, si existe. */
export function pintarMejorMarca() {
    const marca = leerMejorMarca();
    if (marca === null) {
        escribir("mejor-marca", "Todavía no has jugado ninguna partida en este navegador.");
        return;
    }
    escribir("mejor-marca", "Mejor marca · " + marca.nombre + " — " + marca.perfil + " (evolución " +
        marca.evolucion + ", crisis " + (SALUD_MAXIMA - marca.planeta) + "%)");
}
/**
 * Decide el aspecto narrativo de la pantalla final según la Crisis.
 * El planeta tiene prioridad visual; el desenlace Humano/IA queda como
 * lectura secundaria para que el cierre sea coherente con el objetivo NEXO.
 */
function prepararEstadoFinal(pantallaFinal, crisisFinal) {
    const clases = [
        "final-crisis-0",
        "final-crisis-25",
        "final-crisis-50",
        "final-crisis-75",
        "final-crisis-100"
    ];
    for (let i = 0; i < clases.length; i++) {
        pantallaFinal.classList.remove(clases[i]);
    }
    if (crisisFinal === 0) {
        pantallaFinal.classList.add("final-crisis-0");
        return {
            sobrelinea: "MISIÓN COMPLETADA",
            titulo: "PLANETA RECUPERADO",
            subtitulo: "OBJETIVO DEL PROTOCOLO NEXO ALCANZADO",
            mensaje: "La Crisis ha llegado al 0%. Humano e IA han conseguido devolver el equilibrio al planeta.",
            reflexion: "NEXO ha cumplido su objetivo: no se trata de quién domina, sino de quién cuida.",
            lecturaEstrategica: "Humano e IA alcanzaron un equilibrio cooperativo: romper la cooperación ya no ofrecía un resultado mejor que proteger juntos el sistema compartido.",
            etiquetaDesenlace: "DESENLACE SECUNDARIO"
        };
    }
    if (crisisFinal === 100) {
        pantallaFinal.classList.add("final-crisis-100");
        return {
            sobrelinea: "PROTOCOLO NEXO · ESTADO FINAL",
            titulo: "COLAPSO PLANETARIO",
            subtitulo: "EL PLANETA HA ALCANZADO EL 100% DE CRISIS",
            mensaje: "El sistema planetario ha superado su límite. La evolución ya no puede compensar la pérdida del mundo que debía sostenerla.",
            reflexion: "La evolución pierde sentido si no existe un mundo capaz de sostenerla.",
            lecturaEstrategica: "El beneficio individual deja de ser una victoria cuando destruye el sistema del que dependen todos los participantes.",
            etiquetaDesenlace: "RESULTADO DEL PROTOCOLO"
        };
    }
    if (crisisFinal < 25) {
        pantallaFinal.classList.add("final-crisis-0");
        return {
            sobrelinea: "PROTOCOLO NEXO · RESULTADO FINAL",
            titulo: "EQUILIBRIO RESTABLECIDO",
            subtitulo: "LA PARTIDA TERMINA CON UNA CRISIS MUY BAJA",
            mensaje: "El planeta no ha alcanzado la recuperación total, pero NEXO ha dejado un mundo estable y con margen para seguir regenerándose.",
            reflexion: "El equilibrio no es un estado permanente: es una decisión que debe renovarse.",
            lecturaEstrategica: "La cooperación produjo un resultado colectivo mejor que la búsqueda de ventaja individual.",
            etiquetaDesenlace: "DESENLACE DE LA CONVERGENCIA"
        };
    }
    if (crisisFinal < 50) {
        pantallaFinal.classList.add("final-crisis-25");
        return {
            sobrelinea: "PROTOCOLO NEXO · RESULTADO FINAL",
            titulo: "EQUILIBRIO FRÁGIL",
            subtitulo: "EL PLANETA SOBREVIVE, PERO SIGUE BAJO PRESIÓN",
            mensaje: "La Crisis se mantiene contenida, aunque el futuro todavía exige cooperación y decisiones capaces de sostener el equilibrio.",
            reflexion: "Sobrevivir es solo el principio; mantener el equilibrio será la verdadera prueba.",
            lecturaEstrategica: "La estabilidad es posible, pero sigue siendo frágil: mantenerla exige que los incentivos de Humano e IA continúen alineados.",
            etiquetaDesenlace: "DESENLACE DE LA CONVERGENCIA"
        };
    }
    if (crisisFinal < 75) {
        pantallaFinal.classList.add("final-crisis-50");
        return {
            sobrelinea: "PROTOCOLO NEXO · RESULTADO FINAL",
            titulo: "EQUILIBRIO CRÍTICO",
            subtitulo: "LA CRISIS SIGUE COMPROMETIENDO EL FUTURO DEL PLANETA",
            mensaje: "El mundo continúa en pie, pero la presión ecológica sigue siendo alta. La evolución obtenida no ha bastado para restaurar un equilibrio seguro.",
            reflexion: "La capacidad de avanzar no sirve de mucho si el mundo queda cada vez más cerca del límite.",
            lecturaEstrategica: "Una ventaja individual puede convivir con un resultado colectivo deficiente: evolucionar no equivale necesariamente a mejorar el sistema compartido.",
            etiquetaDesenlace: "DESENLACE DE LA CONVERGENCIA"
        };
    }
    pantallaFinal.classList.add("final-crisis-75");
    return {
        sobrelinea: "PROTOCOLO NEXO · ALERTA FINAL",
        titulo: "COLAPSO INMINENTE",
        subtitulo: "EL PLANETA TERMINA LA PARTIDA AL BORDE DEL PUNTO DE NO RETORNO",
        mensaje: "La Crisis domina el escenario final. Queda vida, pero el margen para corregir el rumbo es mínimo.",
        reflexion: "Cuando el equilibrio se rompe, cada decisión llega más tarde y cuesta mucho más.",
        lecturaEstrategica: "Cuando cada parte protege su propia ventaja sin suficiente coordinación, el resultado conjunto puede empeorar para ambas.",
        etiquetaDesenlace: "DESENLACE DE LA CONVERGENCIA"
    };
}
/** Rellena toda la pantalla final con el estado del planeta, el desenlace y el perfil. */
export function pintarFinal(partida, resumen) {
    const pantallaFinal = elemento("pantalla-final");
    const crisisFinal = SALUD_MAXIMA - resumen.saludPlaneta;
    const estado = prepararEstadoFinal(pantallaFinal, crisisFinal);
    escribir("final-sobrelinea", estado.sobrelinea);
    escribir("titulo-final-principal", estado.titulo);
    escribir("subtitulo-final-principal", estado.subtitulo);
    escribir("mensaje-final-principal", estado.mensaje);
    escribir("final-reflexion", estado.reflexion);
    escribir("final-lectura-estrategica", estado.lecturaEstrategica);
    escribir("final-etiqueta-desenlace", estado.etiquetaDesenlace);
    escribir("titulo-desenlace", resumen.desenlace);
    elemento("titulo-desenlace").className =
        "titulo-desenlace final-" + resumen.desenlace.toLowerCase().split(" ").join("-");
    escribir("mensaje-desenlace", resumen.mensaje);
    escribir("final-nombre-jugador", partida.getJugador().getNombre().toUpperCase());
    escribir("nombre-perfil", resumen.perfil.nombre);
    escribir("descripcion-perfil", resumen.perfil.descripcion);
    // RESULTADO VISUAL V23 · La evolución se expresa como porcentaje real de la barra.
    const evolucionHumanoFinal = calcularPorcentaje(resumen.evolucionJugador, EVOLUCION_MAXIMA_BARRA);
    const evolucionIAFinal = calcularPorcentaje(resumen.evolucionIA, EVOLUCION_MAXIMA_BARRA);
    escribir("final-evo-humano", evolucionHumanoFinal + "%");
    escribir("final-evo-ia", evolucionIAFinal + "%");
    escribir("final-planeta", crisisFinal + "%");
    escribir("final-rondas", String(resumen.rondasJugadas));
    elemento("final-barra-humano").style.width = evolucionHumanoFinal + "%";
    elemento("final-barra-ia").style.width = evolucionIAFinal + "%";
    // Los retratos finales reutilizan exactamente los assets evolutivos de la partida.
    // Así el jugador ve en qué se han convertido Humano e IA al terminar.
    const jugador = partida.getJugador();
    const ia = partida.getIA();
    let tipoHumano = jugador.getAvatar();
    if (tipoHumano !== "humano-hombre" && tipoHumano !== "humano-mujer")
        tipoHumano = "humano-hombre";
    let tipoIA = ia.getAvatar();
    if (tipoIA !== "ia-01" && tipoIA !== "ia-02")
        tipoIA = "ia-01";
    elemento("final-avatar-humano").className =
        "final-avatar final-avatar-humano " + tipoHumano + " nivel-" + calcularTramoVisual(evolucionHumanoFinal);
    elemento("final-avatar-ia").className =
        "final-avatar final-avatar-ia " + tipoIA + " nivel-" + calcularTramoVisual(evolucionIAFinal);
    pintarCapacidades("lista-capacidades", jugador.getCapacidades());
    pintarCapacidades("lista-capacidades-ia", ia.getCapacidades());
    const perfiles = leerPerfiles();
    const total = PERFILES.length;
    const nombreJugadorFinal = partida.getJugador().getNombre().toUpperCase();
    let texto = "TRAYECTORIA NEXO · " + nombreJugadorFinal + " · NINGÚN PERFIL DESBLOQUEADO";
    if (perfiles.length > 0) {
        texto = "TRAYECTORIA NEXO · " + nombreJugadorFinal + " · " + perfiles.join(" · ");
    }
    escribir("coleccion-perfiles", texto + "  (" + perfiles.length + " de " + total + ")");
}
