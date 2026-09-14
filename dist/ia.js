/**
 * Decisiones sencillas de la IA.
 *
 * No hay aprendizaje automático ni algoritmos avanzados: solo arrays,
 * Math.random(), bucles y condicionales, igual que el resto del proyecto.
 */
/** Devuelve "PAR" o "IMPAR" al azar. */
function apuestaAlAzar() {
    if (Math.random() < 0.5) {
        return "PAR";
    }
    return "IMPAR";
}
/** Devuelve la apuesta contraria a la recibida. */
export function apuestaContraria(apuesta) {
    if (apuesta === "PAR") {
        return "IMPAR";
    }
    return "PAR";
}
/**
 * Elige la carta inicial de la IA.
 *
 * ADAPTACIÓN reutiliza, si todavía está disponible, la última carta con la
 * que la IA ganó. Aprende de un resultado anterior que funcionó.
 */
export function decidirCartaIA(ia, capacidadesPermitidas) {
    const disponibles = ia.getCartasDisponibles();
    if (disponibles.length === 0) {
        return 0;
    }
    if (capacidadesPermitidas && ia.tiene("adaptacion") && ia.getCartaGanadora() > 0) {
        for (let i = 0; i < disponibles.length; i++) {
            if (disponibles[i].getValor() === ia.getCartaGanadora()) {
                return ia.jugarCarta(ia.getCartaGanadora());
            }
        }
    }
    const posicion = Math.floor(Math.random() * disponibles.length);
    return ia.jugarCarta(disponibles[posicion].getValor());
}
/**
 * Apuesta inicial de la IA.
 *
 * CREATIVIDAD: tras dos derrotas seguidas rompe su patrón y prueba la apuesta
 * contraria a la anterior. Si no se activa, la apuesta sigue siendo aleatoria.
 */
export function declararApuestaIA(ia, capacidadesPermitidas) {
    if (!capacidadesPermitidas) {
        return apuestaAlAzar();
    }
    const historial = ia.getHistorialApuestas();
    if (ia.tiene("creatividad") && ia.getDerrotasSeguidas() >= 2 && historial.length > 0) {
        return apuestaContraria(historial[historial.length - 1]);
    }
    return apuestaAlAzar();
}
/**
 * INTUICIÓN se activa una vez cada tres rondas.
 * La IA no ve el futuro: usa la carta elegida por el Humano como una pista y,
 * entre las cartas que todavía conserva, busca una que haga acertar su propia
 * apuesta declarada. Si no existe una opción mejor, mantiene la carta inicial.
 */
export function intuicionActiva(ia, ronda, capacidadesPermitidas) {
    return capacidadesPermitidas && ia.tiene("intuicion") && ronda % 3 === 0;
}
/**
 * Calcula qué carta preferiría la IA con Intuición SIN modificar la mano.
 * incrementoValorIA vale 1 durante Sobrecarga de datos y 0 el resto del tiempo.
 */
export function preverCartaConIntuicion(ia, cartaActual, cartaJugador, apuestaIA, ronda, capacidadesPermitidas, incrementoValorIA) {
    if (!intuicionActiva(ia, ronda, capacidadesPermitidas)) {
        return cartaActual;
    }
    const candidatas = [cartaActual];
    const disponibles = ia.getCartasDisponibles();
    for (const cartaDisponible of disponibles) {
        candidatas.push(cartaDisponible.getValor());
    }
    // Si la carta actual ya hace acertar a la IA, no hace falta cambiarla.
    const sumaActual = cartaJugador + cartaActual + incrementoValorIA;
    const paridadActual = sumaActual % 2 === 0 ? "PAR" : "IMPAR";
    if (paridadActual === apuestaIA) {
        return cartaActual;
    }
    for (const candidata of candidatas) {
        const suma = cartaJugador + candidata + incrementoValorIA;
        const paridad = suma % 2 === 0 ? "PAR" : "IMPAR";
        if (paridad === apuestaIA) {
            return candidata;
        }
    }
    return cartaActual;
}
/**
 * EMPATÍA: con el planeta en peligro, la IA muestra su carta para que el
 * Humano pueda intentar una convergencia consciente.
 */
export function laIAJuegaACartasVistas(ia, saludPlaneta, limitePeligro, capacidadesPermitidas) {
    return capacidadesPermitidas && ia.tiene("empatia") && saludPlaneta < limitePeligro;
}
