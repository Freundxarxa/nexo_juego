/* =====================================================================
   NEXO V10 · PANTALLA CONFIGURACIÓN DEFINITIVA CORREGIDA
   ANIMACIÓN DE NODOS Y DESCARGAS DE LA ESFERA
   ---------------------------------------------------------------------
   ARCHIVO AISLADO. NO modifica la lógica de partida.

   Cambios V7:
   - Descargas en zona alta, media y baja.
   - Aproximadamente el 55% de las ráfagas incluye una ruta superior.
   - Más luminosidad durante el recorrido.
   - Los nodos de cada ruta se iluminan secuencialmente cuando la
     descarga pasa por ellos.
   - Convergencia ocasional verde + azul hacia el centro.
   - Pausa fuera de la pantalla Configuración y con reduced-motion.
   ===================================================================== */

const pantalla = document.querySelector('#pantalla-configuracion');
const capaEnergia = document.querySelector('.energia-esfera');
const rutas = [...document.querySelectorAll('.energia-ruta')];
const nodos = new Map(
  [...document.querySelectorAll('.nodo-energia[id]')]
    .map((nodo) => [nodo.id, nodo])
);
const pulsoCentro = document.querySelector('.energia-pulso-centro');
const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');

let temporizadorRafaga = null;
let detenido = false;

const aleatorioEntre = (min, max) => Math.random() * (max - min) + min;

function pantallaConfiguracionVisible() {
  return Boolean(
    pantalla?.classList.contains('activa') &&
    !document.hidden &&
    !movimientoReducido.matches &&
    capaEnergia
  );
}

function reiniciarAnimacion(elemento, clase = 'activa') {
  elemento.classList.remove(clase);
  void elemento.getBoundingClientRect();
}

function activarNodo(nodo, retraso = 0) {
  if (!nodo) return;

  window.setTimeout(() => {
    if (!pantallaConfiguracionVisible()) return;

    nodo.classList.remove('nodo-activo');
    void nodo.getBoundingClientRect();
    nodo.classList.add('nodo-activo');

    window.setTimeout(
      () => nodo.classList.remove('nodo-activo'),
      520
    );
  }, retraso);
}

function activarNodosDeRuta(ruta, duracion, retrasoRuta = 0) {
  const ids = (ruta.dataset.nodos || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!ids.length) return;

  const paso = Math.max(45, duracion / Math.max(ids.length, 1));

  ids.forEach((id, indice) => {
    activarNodo(
      nodos.get(id),
      retrasoRuta + Math.round(indice * paso * .72)
    );
  });
}

function activarRuta(ruta, retraso = 0) {
  window.setTimeout(() => {
    if (!pantallaConfiguracionVisible()) return;

    reiniciarAnimacion(ruta);

    const duracion = Math.round(aleatorioEntre(290, 510));
    ruta.style.setProperty('--duracion-descarga', `${duracion}ms`);
    ruta.classList.add('activa');

    activarNodosDeRuta(ruta, duracion);

    window.setTimeout(
      () => ruta.classList.remove('activa'),
      duracion + 90
    );
  }, retraso);
}

function activarPulsoCentral() {
  if (!pulsoCentro || !pantallaConfiguracionVisible()) return;

  pulsoCentro.classList.remove('activo');
  void pulsoCentro.getBoundingClientRect();
  pulsoCentro.classList.add('activo');

  activarNodo(nodos.get('centro'), 40);

  window.setTimeout(
    () => pulsoCentro.classList.remove('activo'),
    640
  );
}

function barajar(lista) {
  return lista
    .map((elemento) => ({ elemento, orden: Math.random() }))
    .sort((a, b) => a.orden - b.orden)
    .map(({ elemento }) => elemento);
}

function elegirRutasNormales(cantidad) {
  const normales = rutas.filter(
    (ruta) => ruta.dataset.zona !== 'convergencia'
  );

  const superiores = normales.filter(
    (ruta) => ruta.classList.contains('energia-ruta-superior')
  );

  const resto = normales.filter(
    (ruta) => !ruta.classList.contains('energia-ruta-superior')
  );

  const seleccion = [];

  /* NEXO V10:
     55% de las ráfagas incluye al menos una descarga en la zona alta. */
  if (
    superiores.length &&
    cantidad > 0 &&
    Math.random() < .55
  ) {
    seleccion.push(
      superiores[Math.floor(Math.random() * superiores.length)]
    );
  }

  const disponibles = barajar(
    resto.filter((ruta) => !seleccion.includes(ruta))
  );

  while (
    seleccion.length < cantidad &&
    disponibles.length
  ) {
    seleccion.push(disponibles.shift());
  }

  return seleccion;
}

function lanzarRafagaNormal() {
  /* Mantiene la esfera viva pero sin convertirla en una tormenta:
     2 líneas es lo más frecuente. */
  const dado = Math.random();
  const cantidad =
    dado < .16 ? 1 :
    dado < .80 ? 2 :
    dado < .96 ? 3 : 4;

  const seleccion = elegirRutasNormales(cantidad);

  seleccion.forEach((ruta, indice) => {
    activarRuta(
      ruta,
      indice * Math.round(aleatorioEntre(18, 58))
    );
  });
}

function lanzarConvergencia() {
  const convergencia = rutas.filter(
    (ruta) => ruta.dataset.zona === 'convergencia'
  );

  const verde = convergencia.find(
    (ruta) => ruta.classList.contains('energia-verde')
  );

  const azul = convergencia.find(
    (ruta) => ruta.classList.contains('energia-azul')
  );

  const cian = convergencia.find(
    (ruta) => ruta.classList.contains('energia-cian')
  );

  if (verde) activarRuta(verde, 0);
  if (azul) activarRuta(azul, 46);
  if (cian) activarRuta(cian, 148);

  window.setTimeout(activarPulsoCentral, 265);
}

function programarSiguienteRafaga() {
  if (detenido) return;

  window.clearTimeout(temporizadorRafaga);

  const espera = pantallaConfiguracionVisible()
    ? Math.round(aleatorioEntre(900, 2450))
    : 900;

  temporizadorRafaga = window.setTimeout(() => {
    if (pantallaConfiguracionVisible()) {
      /* Aproximadamente una de cada nueve ráfagas converge. */
      if (Math.random() < .11) {
        lanzarConvergencia();
      } else {
        lanzarRafagaNormal();
      }
    }

    programarSiguienteRafaga();
  }, espera);
}

function detenerEfecto() {
  detenido = true;
  window.clearTimeout(temporizadorRafaga);

  rutas.forEach((ruta) => ruta.classList.remove('activa'));
  nodos.forEach((nodo) => nodo.classList.remove('nodo-activo'));
  pulsoCentro?.classList.remove('activo');
}

function iniciarEfecto() {
  if (movimientoReducido.matches || !capaEnergia) return;

  detenido = false;
  programarSiguienteRafaga();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.clearTimeout(temporizadorRafaga);
  } else if (!detenido) {
    programarSiguienteRafaga();
  }
});

movimientoReducido.addEventListener?.('change', (evento) => {
  if (evento.matches) {
    detenerEfecto();
  } else {
    iniciarEfecto();
  }
});

iniciarEfecto();
