import { Carta } from "./Carta.js";
import { CARTAS_POR_MANO } from "./datos.js";
/**
 * Un participante de la partida: sirve tanto para el humano como para la IA.
 *
 * Guarda todo lo que "es suyo": su mano de cartas, la apuesta que ha
 * declarado esta ronda, sus puntos de evolución, las capacidades que le ha
 * conquistado al rival y el historial de jugadas que ya ha hecho.
 *
 * No decide nada por sí mismo: quién elige la carta y la apuesta lo deciden
 * el jugador (con clicks) o el archivo ia.ts. Esta clase solo guarda el
 * estado y ofrece métodos para consultarlo y cambiarlo.
 */
export class Jugador {
    constructor(nombre, esIA, avatar) {
        this.nombre = nombre;
        this.esIA = esIA;
        this.avatar = avatar;
        this.mano = [];
        this.crearMano();
        this.apuesta = null;
        this.evolucion = 0;
        this.capacidades = [];
        this.historialCartas = [];
        this.historialApuestas = [];
        this.precisionUsada = false;
        this.derrotasSeguidas = 0;
        this.cartaGanadora = 0;
        this.apuestaGanadora = null;
    }
    /** Crea las cinco cartas numeradas del 1 al 5. */
    crearMano() {
        for (let i = 1; i <= CARTAS_POR_MANO; i++) {
            this.mano.push(new Carta(i));
        }
    }
    // ---- Datos básicos ----------------------------------------------------
    getNombre() {
        return this.nombre;
    }
    setNombre(nombre) {
        this.nombre = nombre;
    }
    getAvatar() {
        return this.avatar;
    }
    setAvatar(avatar) {
        this.avatar = avatar;
    }
    getEsIA() {
        return this.esIA;
    }
    // ---- La mano de cartas ------------------------------------------------
    getMano() {
        return this.mano;
    }
    /** Devuelve solo las cartas que todavía no se han jugado. */
    getCartasDisponibles() {
        const disponibles = [];
        for (let i = 0; i < this.mano.length; i++) {
            if (this.mano[i].estaDisponible()) {
                disponibles.push(this.mano[i]);
            }
        }
        return disponibles;
    }
    /**
     * Juega la carta del valor indicado: la marca como usada y devuelve su
     * número. Si esa carta ya estaba descartada devuelve 0.
     */
    jugarCarta(valor) {
        for (let i = 0; i < this.mano.length; i++) {
            if (this.mano[i].getValor() === valor && this.mano[i].estaDisponible()) {
                this.mano[i].usar();
                return valor;
            }
        }
        return 0;
    }
    /** Devuelve una carta a la mano (lo necesita el poder Velocidad). */
    devolverCarta(valor) {
        for (let i = 0; i < this.mano.length; i++) {
            if (this.mano[i].getValor() === valor) {
                this.mano[i].reiniciar();
            }
        }
    }
    /**
     * Si ya no queda ninguna carta, vuelve a poner las cinco disponibles y
     * devuelve true para que la interfaz pueda avisar de que empieza un
     * ciclo nuevo. Aquí también se recupera el uso de Precisión.
     */
    reiniciarManoSiHaceFalta() {
        if (this.getCartasDisponibles().length > 0) {
            return false;
        }
        for (let i = 0; i < this.mano.length; i++) {
            this.mano[i].reiniciar();
        }
        this.precisionUsada = false;
        return true;
    }
    // ---- La apuesta -------------------------------------------------------
    apostar(apuesta) {
        this.apuesta = apuesta;
    }
    getApuesta() {
        return this.apuesta;
    }
    limpiarApuesta() {
        this.apuesta = null;
    }
    // ---- Evolución y capacidades ------------------------------------------
    getEvolucion() {
        return this.evolucion;
    }
    sumarEvolucion(puntos) {
        this.evolucion = this.evolucion + puntos;
        if (this.evolucion < 0) {
            this.evolucion = 0;
        }
    }
    getCapacidades() {
        return this.capacidades;
    }
    /** Indica si ya posee una capacidad concreta. */
    tiene(idCapacidad) {
        for (let i = 0; i < this.capacidades.length; i++) {
            if (this.capacidades[i] === idCapacidad) {
                return true;
            }
        }
        return false;
    }
    /**
     * Conquista la SIGUIENTE capacidad de la lista que todavía no tenga.
     * El orden es fijo y siempre el mismo, así que el jugador puede
     * planificar. Devuelve la ficha conquistada, o null si ya las tenía todas.
     */
    conquistarSiguiente(lista) {
        for (let i = 0; i < lista.length; i++) {
            if (!this.tiene(lista[i].id)) {
                this.capacidades.push(lista[i].id);
                return lista[i];
            }
        }
        return null;
    }
    /**
     * Nivel visual del avatar (0 a 3) según cuántas capacidades ha
     * conquistado: 0 capacidades, 1-2, 3 y 4. Lo usa la interfaz para
     * cambiar la clase CSS de la imagen.
     */
    getNivelVisual() {
        const total = this.capacidades.length;
        if (total === 0) {
            return 0;
        }
        if (total <= 2) {
            return 1;
        }
        if (total === 3) {
            return 2;
        }
        return 3;
    }
    // ---- Historial de jugadas ---------------------------------------------
    /** Apunta la carta y la apuesta de la ronda que se acaba de resolver. */
    registrarJugada(carta, apuesta) {
        this.historialCartas.push(carta);
        this.historialApuestas.push(apuesta);
    }
    getHistorialCartas() {
        return this.historialCartas;
    }
    getHistorialApuestas() {
        return this.historialApuestas;
    }
    // ---- Estado de las capacidades ----------------------------------------
    puedeUsarPrecision() {
        return this.tiene("precision") && !this.precisionUsada;
    }
    gastarPrecision() {
        this.precisionUsada = true;
    }
    getDerrotasSeguidas() {
        return this.derrotasSeguidas;
    }
    sumarDerrota() {
        this.derrotasSeguidas = this.derrotasSeguidas + 1;
    }
    reiniciarDerrotas() {
        this.derrotasSeguidas = 0;
    }
    /** Guarda la jugada con la que ganó una ronda (capacidad Adaptación). */
    guardarJugadaGanadora(carta, apuesta) {
        this.cartaGanadora = carta;
        this.apuestaGanadora = apuesta;
    }
    getCartaGanadora() {
        return this.cartaGanadora;
    }
    getApuestaGanadora() {
        return this.apuestaGanadora;
    }
}
