/** Persistencia local profesional de NEXO. Los datos nunca salen del navegador. */
const STORAGE_KEY = "nexo.playerProfiles.v1";
const SCHEMA_VERSION = 1;
const LEGACY_V22_KEY = "nexo_jugadores_v22";
const LEGACY_BEST_SCORE_KEY = "nexo_mejor_marca_v20";
const LEGACY_UNLOCKS_KEY = "nexo_perfiles";
const LEGACY_IMPORT_KEY = "nexo.legacyProgressImported.v1";
function nowIso() {
    return new Date().toISOString();
}
function cleanDisplayName(name) {
    return String(name || "").trim().replace(/\s+/g, " ").slice(0, 20);
}
function comparableName(name) {
    return cleanDisplayName(name).toLocaleLowerCase("es-ES");
}
function createPlayerId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
        return "player_" + globalThis.crypto.randomUUID();
    }
    return "player_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}
function emptyStore() {
    return { schemaVersion: SCHEMA_VERSION, activePlayerId: null, players: {} };
}
function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
function migrateV22Store() {
    const text = localStorage.getItem(LEGACY_V22_KEY);
    if (text === null)
        return emptyStore();
    try {
        const legacy = JSON.parse(text);
        const migrated = emptyStore();
        const oldToNewIds = {};
        for (const [oldId, oldPlayer] of Object.entries(legacy.jugadores || {})) {
            const displayName = cleanDisplayName(oldPlayer.nombre);
            if (displayName === "")
                continue;
            const id = createPlayerId();
            oldToNewIds[oldId] = id;
            migrated.players[id] = {
                id,
                displayName,
                unlockedProfiles: Array.isArray(oldPlayer.perfiles) ? [...oldPlayer.perfiles] : [],
                bestScore: oldPlayer.mejorMarca || null,
                createdAt: nowIso(),
                updatedAt: nowIso()
            };
        }
        migrated.activePlayerId = oldToNewIds[legacy.activo] || null;
        saveStore(migrated);
        return migrated;
    }
    catch (error) {
        return emptyStore();
    }
}
function readStore() {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text === null)
        return migrateV22Store();
    try {
        const store = JSON.parse(text);
        if (store && store.schemaVersion === SCHEMA_VERSION && store.players)
            return store;
    }
    catch (error) {
        // Un guardado dañado no debe impedir que el juego arranque.
    }
    return emptyStore();
}
function findPlayerByName(store, name) {
    const target = comparableName(name);
    return Object.values(store.players).find((player) => comparableName(player.displayName) === target) || null;
}
function ensurePlayer(name) {
    const displayName = cleanDisplayName(name);
    if (displayName === "")
        return null;
    const store = readStore();
    let player = findPlayerByName(store, displayName);
    if (player === null) {
        const id = createPlayerId();
        const timestamp = nowIso();
        player = {
            id,
            displayName,
            unlockedProfiles: [],
            bestScore: null,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        store.players[id] = player;
    }
    store.activePlayerId = player.id;
    player.updatedAt = nowIso();
    saveStore(store);
    return player;
}
export function seleccionarJugador(name) {
    const player = ensurePlayer(name);
    return player === null ? "" : player.displayName;
}
export function leerJugadorActivo() {
    const store = readStore();
    const player = store.activePlayerId ? store.players[store.activePlayerId] : null;
    return player ? player.displayName : "";
}
export function listarJugadores() {
    return Object.values(readStore().players)
        .map((player) => player.displayName)
        .sort((a, b) => a.localeCompare(b, "es"));
}
export function leerMejorMarca() {
    const store = readStore();
    const player = store.activePlayerId ? store.players[store.activePlayerId] : null;
    return player ? player.bestScore : null;
}
export function guardarMejorMarca(name, summary) {
    const selected = ensurePlayer(name);
    if (selected === null)
        return false;
    const store = readStore();
    const player = store.players[selected.id];
    const score = {
        playerId: player.id,
        displayName: player.displayName,
        evolucion: summary.evolucionJugador,
        planeta: summary.saludPlaneta,
        perfil: summary.perfil.nombre,
        desenlace: summary.desenlace,
        achievedAt: nowIso()
    };
    if (player.bestScore !== null) {
        const newValue = score.evolucion + score.planeta;
        const previousValue = player.bestScore.evolucion + player.bestScore.planeta;
        if (newValue <= previousValue)
            return false;
    }
    player.bestScore = score;
    player.updatedAt = nowIso();
    saveStore(store);
    return true;
}
export function leerPerfiles() {
    const store = readStore();
    const player = store.activePlayerId ? store.players[store.activePlayerId] : null;
    return player ? [...player.unlockedProfiles] : [];
}
export function guardarPerfil(profileName) {
    const store = readStore();
    const player = store.activePlayerId ? store.players[store.activePlayerId] : null;
    if (!player || player.unlockedProfiles.includes(profileName))
        return;
    player.unlockedProfiles.push(profileName);
    player.updatedAt = nowIso();
    saveStore(store);
}
/** Asigna una sola vez los guardados anteriores al primer jugador seleccionado. */
export function importarProgresoAnteriorSiExiste(name) {
    if (localStorage.getItem(LEGACY_IMPORT_KEY) === "yes")
        return false;
    const selected = ensurePlayer(name);
    if (selected === null)
        return false;
    const store = readStore();
    const player = store.players[selected.id];
    if (player.unlockedProfiles.length > 0 || player.bestScore !== null) {
        localStorage.setItem(LEGACY_IMPORT_KEY, "yes");
        return false;
    }
    try {
        const unlocks = JSON.parse(localStorage.getItem(LEGACY_UNLOCKS_KEY) || "[]");
        const bestScore = JSON.parse(localStorage.getItem(LEGACY_BEST_SCORE_KEY) || "null");
        if (Array.isArray(unlocks))
            player.unlockedProfiles = [...unlocks];
        player.bestScore = bestScore;
        player.updatedAt = nowIso();
        saveStore(store);
        localStorage.setItem(LEGACY_IMPORT_KEY, "yes");
        return unlocks.length > 0 || bestScore !== null;
    }
    catch (error) {
        localStorage.setItem(LEGACY_IMPORT_KEY, "yes");
        return false;
    }
}
