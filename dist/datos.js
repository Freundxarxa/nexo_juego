/**
 * Datos del juego: los arrays de objetos con las crisis, las cartas, los
 * eventos, las capacidades y los perfiles finales.
 *
 * Están todos juntos y separados de la lógica a propósito. Si mañana
 * queremos añadir una crisis nueva o cambiar el efecto de una carta, se
 * toca este archivo y nada más.
 */
// ---- Constantes de equilibrio de la partida ---------------------------
/** Salud del planeta al empezar la partida. */
export const SALUD_INICIAL = 50;
/** Salud máxima que puede alcanzar el planeta. */
export const SALUD_MAXIMA = 100;
/** Puntos que pierde el planeta cuando la ronda termina en FRACASO. */
export const PENALIZACION_FRACASO = 3;
/** Cartas numeradas que tiene cada participante en la mano. */
export const CARTAS_POR_MANO = 5;
/** Cada cuántas rondas se dispara un evento especial. */
export const RONDAS_ENTRE_EVENTOS = 4;
/** Probabilidad de que aparezca una carta de crisis (una de cada tres). */
export const PROBABILIDAD_CARTA_CRISIS = 0.34;
/** Salud por debajo de la cual la IA con Empatía busca la convergencia. */
export const PLANETA_EN_PELIGRO = 25;
// ---- Crisis ecológica de cada ronda -----------------------------------
/**
 * Las ocho crisis del protocolo NEXO. Solo son el contexto de la ronda:
 * no cambian las reglas, dan sentido a lo que está pasando en pantalla.
 */
export const CRISIS_ECOLOGICAS = [
    "Incendios forestales",
    "Contaminación oceánica",
    "Sequía prolongada",
    "Pérdida de biodiversidad",
    "Desertificación",
    "Residuos electrónicos",
    "Calentamiento global",
    "Escasez energética"
];
// ---- Cartas de crisis --------------------------------------------------
/**
 * Cartas que modifican la puntuación de la ronda. Se revelan ANTES de que
 * el jugador apueste, para que pueda tenerlas en cuenta al decidir.
 */
export const CARTAS_CRISIS = [
    {
        id: "renovable",
        nombre: "Energía Renovable",
        efecto: "Si hay CONVERGENCIA, la reducción de CRISIS se duplica.",
        tipo: "Positiva"
    },
    {
        id: "circular",
        nombre: "Economía Circular",
        efecto: "Si hay CONVERGENCIA, la CRISIS baja 3 puntos extra.",
        tipo: "Positiva"
    },
    {
        id: "incendio",
        nombre: "Incendio Forestal",
        efecto: "Si NO hay CONVERGENCIA, la CRISIS aumenta 3 puntos adicionales.",
        tipo: "Negativa"
    },
    {
        id: "sequia",
        nombre: "Sequía",
        efecto: "La suma de las cartas AUMENTA la CRISIS esta ronda, incluso si hay convergencia.",
        tipo: "Negativa"
    },
    {
        id: "inflexion",
        nombre: "Punto de Inflexión",
        efecto: "Cualquier cambio de CRISIS vale el doble esta ronda, pero nadie puede conquistar capacidades.",
        tipo: "Mixta"
    }
];
// ---- Eventos especiales ------------------------------------------------
/** Los cinco eventos. Alteran las reglas durante una sola ronda. */
export const EVENTOS = [
    {
        id: "tormenta",
        nombre: "Tormenta solar",
        descripcion: "Ninguno de los dos puede usar sus capacidades conquistadas."
    },
    {
        id: "cumbre",
        nombre: "Cumbre de emergencia",
        descripcion: "Si la ronda termina en CONVERGENCIA, la CRISIS se reduce el doble."
    },
    {
        id: "sobrecarga",
        nombre: "Sobrecarga de datos",
        descripcion: "Nadie puede usar Análisis ni Precisión, pero la carta de la IA vale +1."
    },
    {
        id: "chispa",
        nombre: "Chispa creativa",
        descripcion: "Ves la carta de la IA antes de apostar, pero no su apuesta."
    },
    {
        id: "sinretorno",
        nombre: "Punto sin retorno",
        descripcion: "Si la ronda termina en FRACASO, la CRISIS aumenta 6 puntos en lugar de 3."
    }
];
// ---- Capacidades conquistables -----------------------------------------
/**
 * Capacidades de la IA que puede conquistar el jugador.
 *
 * El ORDEN importa: no se elige capacidad, se conquista siempre la
 * siguiente de la lista que todavía no se tenga. Así el jugador aprende
 * el orden y puede planificar, y nosotros nos ahorramos programar una
 * pantalla de selección.
 */
export const CAPACIDADES_IA = [
    {
        id: "memoria",
        nombre: "Memoria",
        efecto: "Ves las tres últimas apuestas y cartas de la IA."
    },
    {
        id: "precision",
        nombre: "Precisión",
        efecto: "Una vez por ciclo, al confirmar revela la carta de la IA —no su apuesta— y te permite mantener tu carta o corregirla antes de resolver."
    },
    {
        id: "analisis",
        nombre: "Análisis predictivo",
        efecto: "Recibes una recomendación de carta para buscar convergencia y otra para buscar rivalidad, calculada con las cartas que todavía puede jugar la IA."
    },
    {
        id: "velocidad",
        nombre: "Velocidad",
        efecto: "Elige dos cartas: NEXO calcula ambas posibilidades y aplica automáticamente la más beneficiosa para el Humano."
    }
];
/** Capacidades humanas que puede conquistar la IA. */
export const CAPACIDADES_HUMANAS = [
    {
        id: "creatividad",
        nombre: "Creatividad",
        efecto: "Tras 2 derrotas seguidas, la IA rompe su patrón y cambia su apuesta a la contraria de la anterior."
    },
    {
        id: "intuicion",
        nombre: "Intuición",
        efecto: "Cada 3 rondas la IA usa tu elección como pista y puede sustituir su carta por otra disponible que favorezca su apuesta."
    },
    {
        id: "empatia",
        nombre: "Empatía",
        efecto: "Cuando el planeta está en peligro, la IA revela su carta para favorecer una posible convergencia."
    },
    {
        id: "adaptacion",
        nombre: "Adaptación",
        efecto: "Si puede, la IA reutiliza la última carta con la que consiguió una victoria para adaptarse a lo que ya le funcionó."
    }
];
// ---- Perfiles de evolución (pantalla final) ----------------------------
/**
 * Perfiles que puede obtener el jugador. Se eligen con una cadena de
 * if/else en la clase Partida comparando capacidades y marcadores.
 */
export const PERFILES = [
    {
        id: "nexo",
        nombre: "NEXO",
        descripcion: "Lo has conquistado todo y aun así has dejado el planeta a salvo. " +
            "El final oculto: convergencia y evolución al mismo tiempo."
    },
    {
        id: "conquistador",
        nombre: "EL CONQUISTADOR",
        descripcion: "Has absorbido las cuatro capacidades de la IA, pero no has alcanzado " +
            "el equilibrio necesario para el desenlace NEXO. Tu dominio tiene un coste planetario."
    },
    {
        id: "mente",
        nombre: "LA MENTE PERFECTA",
        descripcion: "Memoria, cálculo y creatividad bajo el mismo cráneo. Te has impuesto " +
            "a la máquina en su propio terreno."
    },
    {
        id: "estratega",
        nombre: "EL ESTRATEGA",
        descripcion: "Has combinado la intuición humana con el análisis artificial y has " +
            "sabido cuándo imponerte y cuándo ceder."
    },
    {
        id: "guardian",
        nombre: "EL GUARDIÁN",
        descripcion: "Casi no has conquistado nada, pero el planeta respira. Has jugado " +
            "para que hubiera mundo, no para ganarlo."
    },
    {
        id: "superviviente",
        nombre: "EL SUPERVIVIENTE",
        descripcion: "Ni te has impuesto ni has salvado gran cosa. La partida ha terminado " +
            "y el protocolo sigue sin respuesta."
    }
];
// ---- Funciones auxiliares de datos --------------------------------------
/**
 * Devuelve la ficha de una capacidad a partir de su id, mirando en las dos
 * listas. Si no la encuentra devuelve null.
 */
export function buscarCapacidad(id) {
    for (let i = 0; i < CAPACIDADES_IA.length; i++) {
        if (CAPACIDADES_IA[i].id === id) {
            return CAPACIDADES_IA[i];
        }
    }
    for (let i = 0; i < CAPACIDADES_HUMANAS.length; i++) {
        if (CAPACIDADES_HUMANAS[i].id === id) {
            return CAPACIDADES_HUMANAS[i];
        }
    }
    return null;
}
/** Devuelve un elemento al azar de un array de textos. */
export function elegirCrisisAlAzar() {
    const posicion = Math.floor(Math.random() * CRISIS_ECOLOGICAS.length);
    return CRISIS_ECOLOGICAS[posicion];
}
