import { Jugador } from "./Jugador.js";
import { Evento } from "./Evento.js";
import { decidirCartaIA, declararApuestaIA, intuicionActiva, preverCartaConIntuicion, laIAJuegaACartasVistas } from "./ia.js";
import { CAPACIDADES_HUMANAS, CAPACIDADES_IA, CARTAS_CRISIS, CARTAS_POR_MANO, PENALIZACION_FRACASO, PERFILES, PLANETA_EN_PELIGRO, PROBABILIDAD_CARTA_CRISIS, RONDAS_ENTRE_EVENTOS, SALUD_INICIAL, SALUD_MAXIMA, elegirCrisisAlAzar } from "./datos.js";
/**
 * La partida: es la clase que dirige el juego.
 *
 * Guarda el estado general (ronda actual, salud del planeta, crisis y
 * evento de esta ronda) y se encarga de las tres tareas importantes:
 *   - preparar la ronda (crisis, carta de crisis, evento y carta de la IA),
 *   - resolverla (sumar, mirar si es PAR o IMPAR y repartir puntos),
 *   - comprobar si la partida ha terminado y con qué desenlace.
 *
 * Es la única clase que toca los tres marcadores. La interfaz no calcula
 * nada: le pide a Partida el resumen de la ronda y lo pinta.
 */
export class Partida {
    constructor(nombreJugador, avatarJugador, totalRondas, avatarIA = "ia-01") {
        this.jugador = new Jugador(nombreJugador, false, avatarJugador);
        this.ia = new Jugador("IA", true, avatarIA);
        this.ronda = 0;
        this.totalRondas = totalRondas;
        this.saludPlaneta = SALUD_INICIAL;
        this.crisisActual = "";
        this.cartaCrisis = null;
        this.eventos = Evento.crearTodos();
        this.eventoActivo = null;
        this.cartaIA = 0;
        this.apuestaDeclaradaIA = "PAR";
        this.cartasIAReveladas = [];
        this.cartaIAFijadaPorPrecision = false;
        this.intuicionAplicadaPorPrecision = false;
        this.terminada = false;
    }
    // ---- Consultas del estado ---------------------------------------------
    getJugador() {
        return this.jugador;
    }
    getIA() {
        return this.ia;
    }
    getRonda() {
        return this.ronda;
    }
    getTotalRondas() {
        return this.totalRondas;
    }
    getSaludPlaneta() {
        return this.saludPlaneta;
    }
    getCrisisActual() {
        return this.crisisActual;
    }
    getCartaCrisis() {
        return this.cartaCrisis;
    }
    getEventoActivo() {
        return this.eventoActivo;
    }
    getCartaIA() {
        return this.cartaIA;
    }
    estaTerminada() {
        return this.terminada;
    }
    /** Indica si un evento concreto está activo justo ahora. */
    hayEvento(idEvento) {
        return this.eventoActivo !== null && this.eventoActivo.getId() === idEvento;
    }
    /**
     * Indica si las capacidades conquistadas se pueden usar esta ronda.
     * Durante la "Tormenta solar" no las puede usar nadie.
     */
    capacidadesPermitidas() {
        return !this.hayEvento("tormenta");
    }
    /** Estado visual del planeta, para cambiar el fondo de la pantalla. */
    getEstadoPlaneta() {
        if (this.saludPlaneta < 25) {
            return "critico";
        }
        if (this.saludPlaneta < 50) {
            return "deteriorado";
        }
        if (this.saludPlaneta < 75) {
            return "estable";
        }
        return "recuperado";
    }
    // ---- Preparación de la ronda -------------------------------------------
    /**
     * Prepara la ronda siguiente: sube el contador, sortea la crisis, decide
     * si sale carta de crisis, dispara evento si toca y hace que la IA ponga
     * su carta boca abajo.
     */
    prepararRonda() {
        if (this.eventoActivo !== null) {
            this.eventoActivo.desactivar();
            this.eventoActivo = null;
        }
        this.ronda = this.ronda + 1;
        this.cartaIAFijadaPorPrecision = false;
        this.intuicionAplicadaPorPrecision = false;
        this.jugador.limpiarApuesta();
        this.ia.limpiarApuesta();
        this.jugador.reiniciarManoSiHaceFalta();
        // Si la IA ha recuperado sus cinco cartas, empieza un ciclo nuevo y ya no
        // sabemos nada de lo que va a jugar: se borra la lista de reveladas.
        if (this.ia.reiniciarManoSiHaceFalta()) {
            this.cartasIAReveladas = [];
        }
        this.crisisActual = elegirCrisisAlAzar();
        this.cartaCrisis = this.sortearCartaCrisis();
        this.eventoActivo = this.dispararEventoSiToca();
        // La IA pone su carta y CANTA SU APUESTA antes de que el jugador decida.
        this.cartaIA = decidirCartaIA(this.ia, this.capacidadesPermitidas());
        this.apuestaDeclaradaIA = declararApuestaIA(this.ia, this.capacidadesPermitidas());
    }
    /** Una de cada tres rondas, aproximadamente, sale una carta de crisis. */
    sortearCartaCrisis() {
        if (Math.random() > PROBABILIDAD_CARTA_CRISIS) {
            return null;
        }
        const posicion = Math.floor(Math.random() * CARTAS_CRISIS.length);
        return CARTAS_CRISIS[posicion];
    }
    /**
     * Cada cuatro rondas dispara un evento especial que todavía no haya
     * salido en esta partida. Si ya han salido los cinco, no dispara ninguno.
     */
    dispararEventoSiToca() {
        if (this.ronda % RONDAS_ENTRE_EVENTOS !== 0) {
            return null;
        }
        const disponibles = [];
        for (let i = 0; i < this.eventos.length; i++) {
            if (!this.eventos[i].getYaUsado()) {
                disponibles.push(this.eventos[i]);
            }
        }
        if (disponibles.length === 0) {
            return null;
        }
        const posicion = Math.floor(Math.random() * disponibles.length);
        const elegido = disponibles[posicion];
        elegido.activar();
        return elegido;
    }
    /** Indica si esta carta de crisis concreta está en juego esta ronda. */
    hayCartaCrisis(idCarta) {
        return this.cartaCrisis !== null && this.cartaCrisis.id === idCarta;
    }
    /**
     * La apuesta que la IA ha cantado esta ronda. El jugador la ve antes de
     * decidir la suya, y de ahí sale toda la decisión del juego:
     *
     *   - apostar LO MISMO  -> o acertáis los dos (convergencia, el planeta
     *     sana) o falláis los dos (fracaso, el planeta cae);
     *   - apostar LO CONTRARIO -> acierta uno y falla el otro SIEMPRE, así que
     *     hay duelo seguro y alguien conquista una capacidad.
     */
    getApuestaDeclaradaIA() {
        return this.apuestaDeclaradaIA;
    }
    /**
     * Con EMPATÍA y el planeta en peligro, la IA renuncia a ganar y enseña su
     * carta para que el humano pueda buscar la convergencia sobre seguro.
     */
    iaJuegaACartasVistas() {
        return laIAJuegaACartasVistas(this.ia, this.saludPlaneta, PLANETA_EN_PELIGRO, this.capacidadesPermitidas());
    }
    /** Mensajes visibles de las fortalezas de IA que afectan a esta ronda. */
    getAvisosFortalezasIA() {
        const avisos = [];
        if (!this.capacidadesPermitidas()) {
            return avisos;
        }
        if (this.ia.tiene("adaptacion") && this.ia.getCartaGanadora() > 0 && this.cartaIA === this.ia.getCartaGanadora()) {
            avisos.push("ADAPTACIÓN · REUTILIZACIÓN EFICAZ: la IA recupera una carta con la que ya consiguió una victoria");
        }
        if (this.ia.tiene("creatividad") && this.ia.getDerrotasSeguidas() >= 2) {
            avisos.push("CREATIVIDAD · CAMBIO DE ENFOQUE: tras dos derrotas, la IA rompe su patrón y cambia su apuesta");
        }
        if (this.iaJuegaACartasVistas()) {
            avisos.push("EMPATÍA · PRIORIDAD PLANETARIA: la IA juega a cartas vistas para favorecer la CONVERGENCIA");
        }
        return avisos;
    }
    /**
     * Cartas que la IA todavía NO ha revelado en este ciclo de mano, una de
     * ellas es la que tiene ahora mismo boca abajo.
     *
     * Con esto el jugador puede calcular: si le quedan el 2 y el 4 (las dos
     * pares) y yo juego una carta par, la suma será par seguro. Esta es la
     * única habilidad de verdad que tiene el juego, así que hay que verla.
     */
    getCartasIAPorRevelar() {
        const porRevelar = [];
        for (let valor = 1; valor <= CARTAS_POR_MANO; valor++) {
            let revelada = false;
            for (let i = 0; i < this.cartasIAReveladas.length; i++) {
                if (this.cartasIAReveladas[i] === valor) {
                    revelada = true;
                }
            }
            if (!revelada) {
                porRevelar.push(valor);
            }
        }
        return porRevelar;
    }
    /**
     * Valor con el que juega la carta de la IA. Normalmente es su número,
     * pero con el evento "Sobrecarga de datos" vale un punto más.
     */
    getValorCartaIA() {
        if (this.hayEvento("sobrecarga")) {
            return this.cartaIA + 1;
        }
        return this.cartaIA;
    }
    /** Valor efectivo de una carta concreta de la IA en la ronda actual. */
    getValorCartaIAPara(carta) {
        if (this.hayEvento("sobrecarga")) {
            return carta + 1;
        }
        return carta;
    }
    /**
     * ANÁLISIS PREDICTIVO: convierte las cartas que aún puede jugar la IA en
     * una recomendación clara para el Humano. No adivina la carta oculta:
     * cuenta posibilidades con un bucle y calcula un porcentaje.
     */
    getConsejoAnalisis() {
        const cartasHumano = this.jugador.getCartasDisponibles();
        const cartasIA = this.getCartasIAPorRevelar();
        if (cartasHumano.length === 0 || cartasIA.length === 0) {
            return { convergencia: "sin datos", rivalidad: "sin datos" };
        }
        let mejorConvergencia = 1;
        let aciertosConvergencia = -1;
        let mejorRivalidad = 1;
        let aciertosRivalidad = -1;
        const apuestaRival = this.apuestaDeclaradaIA === "PAR" ? "IMPAR" : "PAR";
        for (const cartaDisponible of cartasHumano) {
            const cartaHumano = cartaDisponible.getValor();
            let coincideIA = 0;
            let contradiceIA = 0;
            for (const cartaPosibleIA of cartasIA) {
                const valorIA = this.getValorCartaIAPara(cartaPosibleIA);
                const paridad = (cartaHumano + valorIA) % 2 === 0 ? "PAR" : "IMPAR";
                if (paridad === this.apuestaDeclaradaIA)
                    coincideIA = coincideIA + 1;
                if (paridad === apuestaRival)
                    contradiceIA = contradiceIA + 1;
            }
            if (coincideIA > aciertosConvergencia) {
                aciertosConvergencia = coincideIA;
                mejorConvergencia = cartaHumano;
            }
            if (contradiceIA > aciertosRivalidad) {
                aciertosRivalidad = contradiceIA;
                mejorRivalidad = cartaHumano;
            }
        }
        const porcentajeConvergencia = Math.round((aciertosConvergencia / cartasIA.length) * 100);
        const porcentajeRivalidad = Math.round((aciertosRivalidad / cartasIA.length) * 100);
        return {
            convergencia: "carta " + mejorConvergencia + " · " + porcentajeConvergencia + "% de combinaciones posibles",
            rivalidad: "carta " + mejorRivalidad + " · " + porcentajeRivalidad + "% de combinaciones posibles"
        };
    }
    /**
     * Vista previa sin efectos secundarios. VELOCIDAD la usa para comparar
     * dos cartas y decidir cuál beneficia más al Humano.
     */
    previsualizarResultado(cartaJugador, apuestaJugador) {
        const usaIntuicion = intuicionActiva(this.ia, this.ronda, this.capacidadesPermitidas());
        const incremento = this.hayEvento("sobrecarga") ? 1 : 0;
        const cartaIAPrevista = preverCartaConIntuicion(this.ia, this.cartaIA, cartaJugador, this.apuestaDeclaradaIA, this.ronda, this.capacidadesPermitidas(), incremento);
        const valorIA = this.getValorCartaIAPara(cartaIAPrevista);
        const suma = cartaJugador + valorIA;
        const paridad = suma % 2 === 0 ? "PAR" : "IMPAR";
        const aciertaJugador = apuestaJugador === paridad;
        const aciertaIA = this.apuestaDeclaradaIA === paridad;
        let resultado;
        let ganador;
        if (aciertaJugador && aciertaIA) {
            resultado = "CONVERGENCIA";
            ganador = "NADIE";
        }
        else if (aciertaJugador) {
            resultado = "RIVALIDAD";
            ganador = "HUMANO";
        }
        else if (aciertaIA) {
            resultado = "RIVALIDAD";
            ganador = "IA";
        }
        else {
            resultado = "FRACASO";
            ganador = "NADIE";
        }
        let puntosPlaneta = 0;
        let puntosJugador = 0;
        let puntosIA = 0;
        if (resultado === "CONVERGENCIA")
            puntosPlaneta = suma;
        else if (resultado === "RIVALIDAD" && ganador === "HUMANO") {
            puntosJugador = suma;
            puntosIA = -suma;
        }
        else if (resultado === "RIVALIDAD" && ganador === "IA") {
            puntosIA = suma;
            puntosJugador = -suma;
        }
        else
            puntosPlaneta = this.hayEvento("sinretorno") ? -6 : -PENALIZACION_FRACASO;
        if (resultado === "CONVERGENCIA" && this.hayCartaCrisis("renovable"))
            puntosPlaneta = puntosPlaneta * 2;
        if (resultado === "CONVERGENCIA" && this.hayCartaCrisis("circular"))
            puntosPlaneta = puntosPlaneta + 3;
        if (this.hayCartaCrisis("incendio") && resultado !== "CONVERGENCIA")
            puntosPlaneta = puntosPlaneta - 3;
        if (this.hayCartaCrisis("sequia")) {
            if (resultado === "CONVERGENCIA")
                puntosPlaneta = -suma;
            else
                puntosPlaneta = puntosPlaneta - suma;
        }
        if (resultado === "CONVERGENCIA" && puntosPlaneta > 0 && this.hayEvento("cumbre"))
            puntosPlaneta = puntosPlaneta * 2;
        if (this.hayCartaCrisis("inflexion"))
            puntosPlaneta = puntosPlaneta * 2;
        const planetaDespues = Math.max(0, Math.min(SALUD_MAXIMA, this.saludPlaneta + puntosPlaneta));
        const humanoDespues = Math.max(0, this.jugador.getEvolucion() + puntosJugador);
        const iaDespues = Math.max(0, this.ia.getEvolucion() + puntosIA);
        return {
            cartaJugador, cartaIA: cartaIAPrevista, suma, paridad, apuestaIA: this.apuestaDeclaradaIA,
            resultado, ganador, intuicionActiva: usaIntuicion,
            puntosPlaneta: planetaDespues - this.saludPlaneta,
            puntosJugador: humanoDespues - this.jugador.getEvolucion(),
            puntosIA: iaDespues - this.ia.getEvolucion()
        };
    }
    /**
     * PRECISIÓN revela una carta IA fiable. Si INTUICIÓN está activa, la IA
     * ajusta primero su carta usando la decisión humana ya confirmada y luego
     * esa carta queda fijada para el resto de la ronda.
     */
    fijarCartaIAParaPrecision(cartaJugador) {
        const usaIntuicion = intuicionActiva(this.ia, this.ronda, this.capacidadesPermitidas());
        const incremento = this.hayEvento("sobrecarga") ? 1 : 0;
        const cartaAntesIntuicion = this.cartaIA;
        const cartaFinal = preverCartaConIntuicion(this.ia, this.cartaIA, cartaJugador, this.apuestaDeclaradaIA, this.ronda, this.capacidadesPermitidas(), incremento);
        if (cartaFinal !== this.cartaIA) {
            this.ia.devolverCarta(this.cartaIA);
            this.ia.jugarCarta(cartaFinal);
            this.cartaIA = cartaFinal;
        }
        this.cartaIAFijadaPorPrecision = true;
        // ADQUIRIDA ≠ ACTIVA: el aviso fuerte solo aparece si INTUICIÓN
        // realmente modificó la carta preparada por la IA.
        this.intuicionAplicadaPorPrecision = usaIntuicion && cartaFinal !== cartaAntesIntuicion;
        return this.cartaIA;
    }
    // ---- Resolución de la ronda --------------------------------------------
    /**
     * Resuelve la ronda: suma las dos cartas, comprueba si el total es PAR o
     * IMPAR, compara con las dos apuestas y reparte los puntos.
     *
     * El corazón del juego son las tres comparaciones de aquí abajo.
     */
    resolverRonda(cartaJugador, apuestaJugador) {
        let usaIntuicion = this.intuicionAplicadaPorPrecision;
        if (!this.cartaIAFijadaPorPrecision) {
            const intuicionDisponible = intuicionActiva(this.ia, this.ronda, this.capacidadesPermitidas());
            const incremento = this.hayEvento("sobrecarga") ? 1 : 0;
            const cartaAntesIntuicion = this.cartaIA;
            const cartaIAPrevista = preverCartaConIntuicion(this.ia, this.cartaIA, cartaJugador, this.apuestaDeclaradaIA, this.ronda, this.capacidadesPermitidas(), incremento);
            if (cartaIAPrevista !== this.cartaIA) {
                this.ia.devolverCarta(this.cartaIA);
                this.ia.jugarCarta(cartaIAPrevista);
                this.cartaIA = cartaIAPrevista;
            }
            // Solo se anuncia como ACTIVA si hubo una intervención visible real.
            usaIntuicion = intuicionDisponible && cartaIAPrevista !== cartaAntesIntuicion;
        }
        const valorIA = this.getValorCartaIA();
        const suma = cartaJugador + valorIA;
        const paridad = suma % 2 === 0 ? "PAR" : "IMPAR";
        const apuestaIA = this.apuestaDeclaradaIA;
        this.jugador.apostar(apuestaJugador);
        this.ia.apostar(apuestaIA);
        const aciertaJugador = apuestaJugador === paridad;
        const aciertaIA = apuestaIA === paridad;
        let resultado;
        let ganador;
        if (aciertaJugador && aciertaIA) {
            resultado = "CONVERGENCIA";
            ganador = "NADIE";
        }
        else if (aciertaJugador) {
            resultado = "RIVALIDAD";
            ganador = "HUMANO";
        }
        else if (aciertaIA) {
            resultado = "RIVALIDAD";
            ganador = "IA";
        }
        else {
            resultado = "FRACASO";
            ganador = "NADIE";
        }
        const resumen = this.repartirPuntos(resultado, ganador, suma, cartaJugador, valorIA, paridad, apuestaJugador, apuestaIA);
        resumen.intuicionIA = usaIntuicion;
        this.actualizarMemorias(resultado, ganador, cartaJugador, apuestaJugador, apuestaIA);
        this.comprobarFinal();
        return resumen;
    }
    /**
     * Calcula y aplica los puntos de la ronda teniendo en cuenta la carta de
     * crisis y el evento activo. Devuelve el resumen que pintará la interfaz.
     */
    repartirPuntos(resultado, ganador, suma, cartaJugador, valorIA, paridad, apuestaJugador, apuestaIA) {
        const saludPlanetaAntes = this.saludPlaneta;
        const evolucionJugadorAntes = this.jugador.getEvolucion();
        const evolucionIAAntes = this.ia.getEvolucion();
        const puntosBase = suma;
        let puntosPlaneta = 0;
        let puntosJugador = 0;
        let puntosIA = 0;
        let explicacion = "";
        if (resultado === "CONVERGENCIA") {
            puntosPlaneta = puntosBase;
            explicacion = "Los dos habéis acertado: hay convergencia y el planeta puede recuperarse.";
        }
        else if (resultado === "RIVALIDAD") {
            if (ganador === "HUMANO") {
                puntosJugador = puntosBase;
                puntosIA = -puntosBase;
                explicacion = "Te has impuesto a la IA: tu evolución avanza y la suya retrocede.";
            }
            else {
                puntosIA = puntosBase;
                puntosJugador = -puntosBase;
                explicacion = "La IA se ha impuesto: su evolución avanza y la tuya retrocede.";
            }
        }
        else {
            puntosPlaneta = -PENALIZACION_FRACASO;
            if (this.hayEvento("sinretorno")) {
                puntosPlaneta = -6;
            }
            explicacion = "Nadie ha entendido la crisis. El planeta pierde equilibrio.";
        }
        if (resultado === "CONVERGENCIA" && this.hayCartaCrisis("renovable")) {
            puntosPlaneta = puntosPlaneta * 2;
        }
        if (resultado === "CONVERGENCIA" && this.hayCartaCrisis("circular")) {
            puntosPlaneta = puntosPlaneta + 3;
        }
        if (this.hayCartaCrisis("incendio") && resultado !== "CONVERGENCIA") {
            puntosPlaneta = puntosPlaneta - 3;
        }
        if (this.hayCartaCrisis("sequia")) {
            if (resultado === "CONVERGENCIA") {
                puntosPlaneta = -puntosBase;
            }
            else {
                puntosPlaneta = puntosPlaneta - puntosBase;
            }
        }
        // Cumbre solo duplica una recuperación real. Si Sequía ha convertido
        // la convergencia en daño, el evento positivo no puede agravarlo.
        if (resultado === "CONVERGENCIA" && puntosPlaneta > 0 && this.hayEvento("cumbre")) {
            puntosPlaneta = puntosPlaneta * 2;
        }
        if (this.hayCartaCrisis("inflexion")) {
            puntosPlaneta = puntosPlaneta * 2;
        }
        this.saludPlaneta = this.saludPlaneta + puntosPlaneta;
        if (this.saludPlaneta > SALUD_MAXIMA)
            this.saludPlaneta = SALUD_MAXIMA;
        if (this.saludPlaneta < 0)
            this.saludPlaneta = 0;
        this.jugador.sumarEvolucion(puntosJugador);
        this.ia.sumarEvolucion(puntosIA);
        // Mostramos el cambio realmente aplicado después de respetar el mínimo 0.
        puntosPlaneta = this.saludPlaneta - saludPlanetaAntes;
        puntosJugador = this.jugador.getEvolucion() - evolucionJugadorAntes;
        puntosIA = this.ia.getEvolucion() - evolucionIAAntes;
        if (this.saludPlaneta >= SALUD_MAXIMA && saludPlanetaAntes < SALUD_MAXIMA) {
            explicacion =
                "RECUPERACIÓN PLANETARIA COMPLETA · La Crisis ha llegado al 0%. " +
                    "El planeta vuelve a respirar. Sobrevivir no era suficiente: el verdadero desafío era aprender a evolucionar sin destruir aquello que nos sostiene.";
        }
        let capacidadConquistada = "";
        if (resultado === "RIVALIDAD" && !this.hayCartaCrisis("inflexion")) {
            if (ganador === "HUMANO") {
                const ficha = this.jugador.conquistarSiguiente(CAPACIDADES_IA);
                if (ficha !== null)
                    capacidadConquistada = ficha.nombre;
            }
            else {
                const ficha = this.ia.conquistarSiguiente(CAPACIDADES_HUMANAS);
                if (ficha !== null)
                    capacidadConquistada = ficha.nombre;
            }
        }
        return {
            ronda: this.ronda,
            cartaJugador: cartaJugador,
            cartaIA: valorIA,
            suma: suma,
            paridad: paridad,
            apuestaJugador: apuestaJugador,
            apuestaIA: apuestaIA,
            resultado: resultado,
            ganador: ganador,
            puntosPlaneta: puntosPlaneta,
            puntosJugador: puntosJugador,
            puntosIA: puntosIA,
            saludPlanetaAntes: saludPlanetaAntes,
            saludPlanetaDespues: this.saludPlaneta,
            evolucionJugadorAntes: evolucionJugadorAntes,
            evolucionJugadorDespues: this.jugador.getEvolucion(),
            evolucionIAAntes: evolucionIAAntes,
            evolucionIADespues: this.ia.getEvolucion(),
            capacidadConquistada: capacidadConquistada,
            explicacion: explicacion,
            intuicionIA: false
        };
    }
    /**
     * Apunta lo que ha pasado para que las capacidades puedan usarlo después:
     * el historial (Memoria y Análisis), las derrotas seguidas (Creatividad) y
     * la última jugada ganadora de la IA (Adaptación).
     */
    actualizarMemorias(resultado, ganador, cartaJugador, apuestaJugador, apuestaIA) {
        this.jugador.registrarJugada(cartaJugador, apuestaJugador);
        this.ia.registrarJugada(this.cartaIA, apuestaIA);
        this.cartasIAReveladas.push(this.cartaIA);
        if (ganador === "IA") {
            this.ia.reiniciarDerrotas();
            this.ia.guardarJugadaGanadora(this.cartaIA, apuestaIA);
        }
        else if (ganador === "HUMANO") {
            this.ia.sumarDerrota();
        }
        else {
            this.ia.reiniciarDerrotas();
        }
    }
    // ---- Final de la partida ------------------------------------------------
    /**
     * La partida termina inmediatamente cuando la Crisis alcanza
     * cualquiera de sus dos extremos:
     *
     * Crisis 0%   = salud del planeta 100% = recuperación total.
     * Crisis 100% = salud del planeta 0%   = colapso planetario.
     *
     * Si no se alcanza ninguno de los extremos, una partida de duración
     * fija termina al completar el número de rondas seleccionado.
     */
    comprobarFinal() {
        if (this.saludPlaneta <= 0 || this.saludPlaneta >= SALUD_MAXIMA) {
            this.terminada = true;
        }
        else if (this.totalRondas > 0 && this.ronda >= this.totalRondas) {
            this.terminada = true;
        }
        return this.terminada;
    }
    /** Termina la partida aunque queden rondas (botón de abandonar). */
    abandonar() {
        this.terminada = true;
    }
    /**
     * Calcula el desenlace y el perfil de evolución. Primero se mira el
     * planeta: si ha colapsado no importa cuánta evolución se haya acumulado.
     */
    calcularFinal() {
        const evolucionJugador = this.jugador.getEvolucion();
        const evolucionIA = this.ia.getEvolucion();
        const diferencia = Math.abs(evolucionJugador - evolucionIA);
        const crisisFinal = SALUD_MAXIMA - this.saludPlaneta;
        let desenlace;
        let mensaje;
        if (this.saludPlaneta <= 0) {
            desenlace = "COLAPSO";
            mensaje =
                "El planeta ha colapsado. Perdéis los dos: no importa cuánto " +
                    "hayáis evolucionado si no queda mundo donde hacerlo.";
        }
        else if (this.saludPlaneta > 75 && diferencia <= 5) {
            desenlace = "CONVERGENCIA TOTAL";
            mensaje = this.saludPlaneta >= SALUD_MAXIMA
                ? "El planeta se ha recuperado y Humano e IA llegan al final sin que uno domine al otro. NEXO demuestra que avanzar juntos puede ser una forma de supervivencia."
                : "Habéis protegido el planeta sin que ninguno dominase al otro. El protocolo NEXO ha alcanzado un equilibrio real.";
        }
        else if (evolucionJugador > evolucionIA) {
            desenlace = "SUPREMACIA HUMANA";
            mensaje = this.saludPlaneta >= SALUD_MAXIMA
                ? "El planeta se ha recuperado, pero el equilibrio entre Humano e IA no lo ha hecho: la evolución humana domina el desenlace. Salvar el mundo no responde por sí solo a la pregunta de cómo compartirlo."
                : "Te has impuesto a la IA. El planeta termina con " + crisisFinal + "% de crisis.";
        }
        else if (evolucionIA > evolucionJugador) {
            desenlace = "SUPREMACIA IA";
            mensaje = this.saludPlaneta >= SALUD_MAXIMA
                ? "El planeta se ha recuperado, pero la IA domina la evolución final. La supervivencia está asegurada; la cuestión que queda abierta es quién define ahora el futuro compartido."
                : "La IA se ha impuesto. El planeta termina con " + crisisFinal + "% de crisis.";
        }
        else {
            desenlace = "EQUILIBRIO INESTABLE";
            mensaje =
                "Humano e IA han terminado con la misma evolución, pero el planeta " +
                    "aún conserva " + crisisFinal + "% de crisis. El protocolo sigue abierto.";
        }
        const total = evolucionJugador + evolucionIA;
        let porcentajeJugador = 50;
        if (total > 0) {
            porcentajeJugador = Math.round((evolucionJugador / total) * 100);
        }
        return {
            desenlace: desenlace,
            mensaje: mensaje,
            perfil: this.elegirPerfil(),
            rondasJugadas: this.ronda,
            saludPlaneta: this.saludPlaneta,
            evolucionJugador: evolucionJugador,
            evolucionIA: evolucionIA,
            porcentajeJugador: porcentajeJugador,
            porcentajeIA: 100 - porcentajeJugador
        };
    }
    /**
     * Elige el perfil de evolución comparando las capacidades conquistadas
     * con el estado del planeta. Es la cadena de if/else del documento de
     * diseño: el orden importa, porque se queda con el primero que encaja.
     */
    elegirPerfil() {
        const conquistadas = this.jugador.getCapacidades().length;
        let id = "superviviente";
        if (conquistadas === 4 && this.saludPlaneta > 75) {
            id = "nexo";
        }
        else if (conquistadas === 4) {
            id = "conquistador";
        }
        else if (conquistadas === 3) {
            id = "mente";
        }
        else if (conquistadas === 2) {
            id = "estratega";
        }
        else if (this.saludPlaneta >= 75) {
            id = "guardian";
        }
        for (let i = 0; i < PERFILES.length; i++) {
            if (PERFILES[i].id === id) {
                return PERFILES[i];
            }
        }
        return PERFILES[PERFILES.length - 1];
    }
}
