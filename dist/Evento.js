import { EVENTOS } from "./datos.js";
/**
 * Un evento especial. Se dispara cada cuatro rondas y cambia las reglas
 * durante UNA sola ronda; después se desactiva.
 *
 * La clase guarda si el evento está activo ahora mismo y si ya ha salido
 * antes en esta partida, para no repetir eventos mientras queden nuevos.
 */
export class Evento {
    constructor(id, nombre, descripcion) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.activo = false;
        this.yaUsado = false;
    }
    getId() {
        return this.id;
    }
    getNombre() {
        return this.nombre;
    }
    getDescripcion() {
        return this.descripcion;
    }
    estaActivo() {
        return this.activo;
    }
    getYaUsado() {
        return this.yaUsado;
    }
    /** Activa el evento para la ronda que va a empezar. */
    activar() {
        this.activo = true;
        this.yaUsado = true;
    }
    /** Lo desactiva al terminar la ronda: sus efectos no se arrastran. */
    desactivar() {
        this.activo = false;
    }
    /**
     * Crea los cinco eventos a partir del array de datos.
     *
     * Es un método `static`: se llama sobre la clase (Evento.crearTodos())
     * porque no pertenece a ningún evento concreto, sino que sirve para
     * fabricarlos todos de golpe al empezar la partida.
     */
    static crearTodos() {
        const lista = [];
        for (let i = 0; i < EVENTOS.length; i++) {
            lista.push(new Evento(EVENTOS[i].id, EVENTOS[i].nombre, EVENTOS[i].descripcion));
        }
        return lista;
    }
}
