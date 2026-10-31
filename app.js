/* =========================================================
   DIEGO & LIZ — INVITACIÓN DIGITAL
   ========================================================= */

/* -----------------------------------------------------------
   0. CONFIGURACIÓN — EDITA ESTOS VALORES
   ----------------------------------------------------------- */

// Fecha y hora de la ceremonia en Paraguay (usada por la cuenta regresiva y el calendario)
const FECHA_BODA = new Date("2026-11-21T20:30:00-03:00");

// Pega aquí la URL de tu Web App de Google Apps Script (ver code.gs)
const RSVP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlllF-xsEoIVmjUVEuP7JlttzJVv7PRt8cGDqNS7tmZyxGRlCNQ1-BHTKidzI-D22qQQ/exec";

const prefiereMovimientoReducido =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registro) => registro.update())
      .catch(() => {});
  });
}

/* -----------------------------------------------------------
   1. REVELADO LOCAL — animaciones de scroll fluidas por secciones
   ----------------------------------------------------------- */
function activarReveladoScroll() {
  const elementos = Array.from(document.querySelectorAll("[data-aos]"));
  if (!elementos.length) return;

  document.documentElement.classList.add("reveal-enabled");

  if (!("IntersectionObserver" in window)) {
    elementos.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("is-visible");
        } else {
          entrada.target.classList.remove("is-visible");
        }
      });
    },
    {
      rootMargin: "0px 0px -30px 0px",
      threshold: 0.06,
    }
  );

  elementos.forEach((el) => observer.observe(el));
}

(function inicializarRevelado() {
  const gate = document.getElementById("gate");
  if (!gate || getComputedStyle(gate).display === "none") {
    activarReveladoScroll();
  }
})();

/* -----------------------------------------------------------
   2. FONDO AMBIENTAL — pétalos y destellos sutiles
   ----------------------------------------------------------- */
(function inicializarFondoAmbiental() {

  const canvas = document.getElementById("ambient-canvas");
  const wrapper = document.querySelector(".site-wrapper");
  if (!canvas || !wrapper) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const particulas = [];
  const colores = [
    "rgba(200,164,104,0.34)",
    "rgba(216,167,161,0.28)",
    "rgba(143,165,138,0.24)",
    "rgba(255,253,248,0.58)",
  ];

  let ancho = 0;
  let alto = 0;
  let raf = null;

  function reiniciarParticula(p, yAleatoria = true) {
    p.x = Math.random() * ancho;
    p.y = yAleatoria ? Math.random() * alto : -24;
    p.radio = 2.4 + Math.random() * 6;
    p.velocidad = 0.18 + Math.random() * 0.42;
    p.balanceo = 9 + Math.random() * 24;
    p.fase = Math.random() * Math.PI * 2;
    p.giro = Math.random() * Math.PI * 2;
    p.giroVelocidad = (Math.random() - 0.5) * 0.018;
    p.color = colores[Math.floor(Math.random() * colores.length)];
    p.tipo = Math.random() > 0.68 ? "destello" : "petalo";
    return p;
  }

  function ajustarTamano() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ancho = wrapper.clientWidth;
    alto = Math.max(window.innerHeight, wrapper.scrollHeight);

    canvas.width = Math.floor(ancho * dpr);
    canvas.height = Math.floor(alto * dpr);
    canvas.style.height = `${alto}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cantidad = Math.min(58, Math.max(30, Math.round(alto / 145)));
    while (particulas.length < cantidad) particulas.push(reiniciarParticula({}));
    while (particulas.length > cantidad) particulas.pop();
  }

  function dibujarPetalo(p) {
    const x = p.x + Math.sin(p.fase) * p.balanceo;
    ctx.save();
    ctx.translate(x, p.y);
    ctx.rotate(p.giro);
    ctx.globalAlpha = p.tipo === "destello" ? 0.74 : 0.88;
    ctx.fillStyle = p.color;

    if (p.tipo === "destello") {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1.2, p.radio * 0.32), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.radio * 0.55, p.radio, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function animar() {
    ctx.clearRect(0, 0, ancho, alto);

    particulas.forEach((p) => {
      p.y += p.velocidad;
      p.fase += 0.008;
      p.giro += p.giroVelocidad;

      if (p.y > alto + 28) reiniciarParticula(p, false);
      dibujarPetalo(p);
    });

    raf = requestAnimationFrame(animar);
  }

  ajustarTamano();
  animar();

  window.addEventListener("resize", ajustarTamano);
  if ("ResizeObserver" in window) {
    new ResizeObserver(ajustarTamano).observe(wrapper);
  }
  window.addEventListener("beforeunload", () => {
    if (raf) cancelAnimationFrame(raf);
  });
})();

/* -----------------------------------------------------------
   3. NOMBRE DEL INVITADO (vía parámetro ?invitado= en la URL)
   Ejemplo: tusitio.com/?invitado=Familia%20Gonz%C3%A1lez
   ----------------------------------------------------------- */
(function aplicarNombreInvitado() {
  const params = new URLSearchParams(window.location.search);
  const invitado = params.get("invitado") || params.get("guest");
  if (invitado) {
    const nodo = document.getElementById("gate-guest-name");
    if (nodo) nodo.textContent = invitado;
  }
})();

const musicaSintetica = (() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const acordes = [
    [261.63, 329.63, 392.0],
    [293.66, 369.99, 440.0],
    [246.94, 329.63, 392.0],
    [220.0, 293.66, 349.23],
  ];

  let ctx = null;
  let master = null;
  let temporizador = null;
  let paso = 0;
  let reproduciendo = false;
  let silenciada = false;

  function crearNota(freq, inicio, duracion, volumen) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, inicio);
    gain.gain.setValueAtTime(0.0001, inicio);
    gain.gain.exponentialRampToValueAtTime(volumen, inicio + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);

    osc.connect(gain);
    gain.connect(master);
    osc.start(inicio);
    osc.stop(inicio + duracion + 0.2);
  }

  function programarCompas() {
    if (!reproduciendo || !ctx) return;

    const ahora = ctx.currentTime;
    const acorde = acordes[paso % acordes.length];
    acorde.forEach((freq, i) => {
      crearNota(freq, ahora + i * 0.08, 5.6, i === 0 ? 0.022 : 0.015);
    });

    crearNota(acorde[1] * 2, ahora + 2.5, 2.1, 0.008);
    paso += 1;
    if (paso < acordes.length) {
      temporizador = window.setTimeout(programarCompas, 5400);
    } else {
      temporizador = window.setTimeout(() => {
        pausar();
        actualizarIconoMusica(false, silenciada);
      }, 5600);
    }
  }

  async function reproducir() {
    if (reproduciendo) return;
    if (!AudioContextClass) throw new Error("Web Audio no disponible");

    if (!ctx) {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
    }

    await ctx.resume();
    paso = 0;
    reproduciendo = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(silenciada ? 0.0001 : 0.07, ctx.currentTime, 0.9);
    programarCompas();
  }

  function pausar() {
    if (!reproduciendo) return;
    reproduciendo = false;
    if (temporizador) window.clearTimeout(temporizador);
    temporizador = null;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.55);
    }
  }

  function setSilenciada(valor) {
    silenciada = valor;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(silenciada || !reproduciendo ? 0.0001 : 0.07, ctx.currentTime, 0.35);
    }
  }

  return {
    reproducir,
    pausar,
    setSilenciada,
    get reproduciendo() {
      return reproduciendo;
    },
    get silenciada() {
      return silenciada;
    },
  };
})();

let musicaSilenciada = false;

/* Sube el volumen del MP3 poco a poco (con curva suave) para que el
   sonido de apertura se escuche y la música entre sin sobresaltos.
   En iOS el volumen es de solo lectura, ahí simplemente no hace efecto. */
function aparecerVolumen(audio, objetivo, ms) {
  const inicio = performance.now();
  audio.volume = 0;

  function paso(ahora) {
    const t = Math.min(1, (ahora - inicio) / ms);
    audio.volume = objetivo * t * t * (3 - 2 * t);
    if (t < 1 && !audio.paused) requestAnimationFrame(paso);
  }

  requestAnimationFrame(paso);
}

/* -----------------------------------------------------------
   SONIDO DE APERTURA DEL SOBRE
   Efecto de carta / baraja (estilo ASMR, nítido y sin fuzz)
   ----------------------------------------------------------- */
const sonidoApertura = (() => {
  async function reproducir() {
    if (musicaSilenciada) return;
    const sfx = document.getElementById("sfx-carta");
    if (!sfx) return;

    try {
      sfx.currentTime = 0;
      sfx.volume = 0.55;
      await sfx.play();
    } catch {
      // Ignorar si el navegador bloquea audio antes de interacción
    }
  }

  return { reproducir };
})();

async function reproducirMusica() {
  const audio = document.getElementById("bg-music");
  const fuente = audio?.querySelector("source")?.getAttribute("src");

  if (audio && fuente) {
    if (audio.ended) {
      audio.currentTime = 0;
    }
    audio.loop = false;
    audio.volume = 0;
    audio.muted = musicaSilenciada;
    try {
      await audio.play();
      aparecerVolumen(audio, 0.48, 3000);
      musicaSintetica.pausar();
      actualizarIconoMusica(true, musicaSilenciada);
      return;
    } catch (error) {
      audio.pause();
    }
  }

  musicaSintetica.setSilenciada(musicaSilenciada);
  await musicaSintetica.reproducir();
  actualizarIconoMusica(true, musicaSilenciada);
}

function pausarMusica() {
  const audio = document.getElementById("bg-music");
  if (audio) audio.pause();
  musicaSintetica.pausar();
  actualizarIconoMusica(false, musicaSilenciada);
}

function musicaEstaActiva() {
  const audio = document.getElementById("bg-music");
  return Boolean((audio && !audio.paused) || musicaSintetica.reproduciendo);
}

function setMusicaSilenciada(valor) {
  musicaSilenciada = valor;
  const audio = document.getElementById("bg-music");
  if (audio) audio.muted = musicaSilenciada;
  musicaSintetica.setSilenciada(musicaSilenciada);
  actualizarIconoMusica(musicaEstaActiva(), musicaSilenciada);
}

/* -----------------------------------------------------------
   4. SOBRE — APERTURA DEL PORTAL
   ----------------------------------------------------------- */
(function inicializarSobre() {
  const gate = document.getElementById("gate");
  const envelope = document.getElementById("envelope");
  const musicToggle = document.getElementById("music-toggle");

  if (!gate || !envelope) return;

  let abierto = false;

  envelope.addEventListener("click", () => {
    if (abierto) return;
    abierto = true;

    gate.classList.add("gate--opening");
    envelope.classList.add("is-open");

    sonidoApertura.reproducir().catch(() => {});

    reproducirMusica()
      .then(() => {
        if (musicToggle) musicToggle.classList.add("is-visible");
      })
      .catch(() => {
        if (musicToggle) musicToggle.classList.add("is-visible");
      });

    const esperaCierre = 2500;
    setTimeout(() => {
      gate.classList.add("gate--closing");
      document.body.classList.add("site-opened");
      activarReveladoScroll();
      const esperaOculto = 900;
      setTimeout(() => {
        gate.style.display = "none";
        document.body.classList.remove("no-scroll");
      }, esperaOculto);
    }, esperaCierre);
  });
})();

/* -----------------------------------------------------------
   5. MÚSICA — botón flotante de silenciar/activar sonido
   ----------------------------------------------------------- */
function actualizarIconoMusica(reproduciendo, silenciada = musicaSilenciada) {
  const icono = document.getElementById("music-icon");
  const boton = document.getElementById("music-toggle");
  if (!icono) return;

  if (reproduciendo && silenciada) {
    icono.innerHTML =
      '<path d="M4 10 V14 H7 L12 18 V6 L7 10 H4 Z"/><line x1="17" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="17" y2="15"/>';
  } else if (reproduciendo) {
    icono.innerHTML =
      '<path d="M4 10 V14 H7 L12 18 V6 L7 10 H4 Z"/><path d="M16 9 C17.2 10.1 17.2 13.9 16 15"/><path d="M18.5 6.5 C21 9.2 21 14.8 18.5 17.5"/>';
  } else {
    icono.innerHTML =
      '<circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/><path d="M9 18 L9 5 L19 3 L19 16"/>';
  }

  if (boton) {
    boton.classList.toggle("is-playing", reproduciendo);
    boton.classList.toggle("is-muted", silenciada);
    boton.setAttribute("aria-pressed", silenciada ? "true" : "false");
    boton.setAttribute(
      "aria-label",
      reproduciendo
        ? (silenciada ? "Activar sonido" : "Silenciar música")
        : "Reproducir música"
    );
  }
}

(function inicializarMusica() {
  const boton = document.getElementById("music-toggle");
  const audio = document.getElementById("bg-music");

  if (audio) {
    audio.loop = false;
    audio.addEventListener("ended", () => {
      actualizarIconoMusica(false, musicaSilenciada);
    });
  }

  if (!boton) return;

  boton.addEventListener("click", () => {
    if (musicaEstaActiva()) {
      setMusicaSilenciada(!musicaSilenciada);
    } else {
      setMusicaSilenciada(false);
      reproducirMusica().catch(() => actualizarIconoMusica(false, musicaSilenciada));
    }
  });
})();

/* -----------------------------------------------------------
   6. FECHA ESPECIAL — CALENDARIO
   Genera la grilla del mes a partir de FECHA_BODA, marcando el
   día de la boda con un anillo. Si la fecha cambia arriba, el
   calendario se recalcula solo.
   ----------------------------------------------------------- */
(function inicializarCalendario() {
  const contenedor = document.getElementById("calendar-grid");
  if (!contenedor) return;

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const anio = FECHA_BODA.getFullYear();
  const mes = FECHA_BODA.getMonth();
  const diaBoda = FECHA_BODA.getDate();

  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const diasMesAnterior = new Date(anio, mes, 0).getDate();

  const celdas = [];

  // días grises del mes anterior, para completar la primera semana
  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    celdas.push({ numero: diasMesAnterior - i, fuera: true });
  }
  // días del mes de la boda
  for (let d = 1; d <= diasEnMes; d++) {
    celdas.push({ numero: d, fuera: false, esBoda: d === diaBoda });
  }
  // días grises del mes siguiente, para completar la última semana
  let siguiente = 1;
  while (celdas.length % 7 !== 0) {
    celdas.push({ numero: siguiente++, fuera: true });
  }

  const celdasHtml = celdas
    .map((c) => {
      const clases = ["calendar__day"];
      if (c.fuera) clases.push("is-outside");
      if (c.esBoda) clases.push("is-wedding");
      return `<span class="${clases.join(" ")}">${c.numero}</span>`;
    })
    .join("");

  const dowHtml = diasSemana
    .map((d) => `<span class="calendar__dow">${d}</span>`)
    .join("");

  contenedor.innerHTML =
    `<p class="calendar__month">${meses[mes]}</p>` +
    `<p class="calendar__year">${anio}</p>` +
    `<div class="calendar__grid">${dowHtml}${celdasHtml}</div>`;
})();

/* -----------------------------------------------------------
   7. CUENTA REGRESIVA
   ----------------------------------------------------------- */
(function inicializarContador() {
  const elDias = document.getElementById("dias");
  const elHoras = document.getElementById("horas");
  const elMinutos = document.getElementById("minutos");
  const elSegundos = document.getElementById("segundos");
  const elGrid = document.getElementById("countdown-grid");
  const elDone = document.getElementById("countdown-done");

  if (!elDias) return;

  const valoresPrevios = { dias: null, horas: null, minutos: null, segundos: null };

  function marcarTick(nodo, valorNuevo, clave) {
    nodo.textContent = String(valorNuevo).padStart(2, "0");
    if (!prefiereMovimientoReducido && valoresPrevios[clave] !== valorNuevo) {
      nodo.classList.remove("tick");
      // forzar reflow para reiniciar la animación
      void nodo.offsetWidth;
      nodo.classList.add("tick");
    }
    valoresPrevios[clave] = valorNuevo;
  }

  function actualizar() {
    const ahora = new Date();
    const diferencia = FECHA_BODA - ahora;

    if (diferencia <= 0) {
      if (elGrid) elGrid.style.display = "none";
      if (elDone) elDone.style.display = "block";
      clearInterval(intervalo);
      return;
    }

    const dias = Math.floor(diferencia / 1000 / 60 / 60 / 24);
    const horas = Math.floor(diferencia / 1000 / 60 / 60) % 24;
    const minutos = Math.floor(diferencia / 1000 / 60) % 60;
    const segundos = Math.floor(diferencia / 1000) % 60;

    marcarTick(elDias, dias, "dias");
    marcarTick(elHoras, horas, "horas");
    marcarTick(elMinutos, minutos, "minutos");
    marcarTick(elSegundos, segundos, "segundos");
  }

  let intervalo = null;
  actualizar();
  if (FECHA_BODA - new Date() > 0) {
    intervalo = setInterval(actualizar, 1000);
  }
})();

/* -----------------------------------------------------------
   8. LIGHTBOX — ver foto en grande con navegación
   (la función imgFallback() para fotos faltantes vive en el
   <head> de index.html, así está lista antes de que carguen las fotos)
   ----------------------------------------------------------- */
(function inicializarLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const cerrar = document.getElementById("lightbox-close");
  const btnPrev = document.getElementById("lightbox-prev");
  const btnNext = document.getElementById("lightbox-next");
  const galeria = document.getElementById("gallery-grid");

  if (!lightbox || !galeria) return;

  function obtenerFotos() {
    return Array.from(galeria.querySelectorAll(".gallery__item img"));
  }

  let indiceActual = 0;

  function mostrarFoto(indice) {
    const fotos = obtenerFotos();
    if (!fotos.length) return;
    indiceActual = (indice + fotos.length) % fotos.length;
    const img = fotos[indiceActual];
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || "Foto de Diego & Liz";
    lightbox.classList.add("is-active");
  }

  galeria.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    const fotos = obtenerFotos();
    const idx = fotos.indexOf(img);
    mostrarFoto(idx >= 0 ? idx : 0);
  });

  function cerrarLightbox() {
    lightbox.classList.remove("is-active");
    setTimeout(() => {
      if (!lightbox.classList.contains("is-active")) {
        lightboxImg.src = "";
      }
    }, 300);
  }

  cerrar?.addEventListener("click", (e) => {
    e.stopPropagation();
    cerrarLightbox();
  });

  btnPrev?.addEventListener("click", (e) => {
    e.stopPropagation();
    mostrarFoto(indiceActual - 1);
  });

  btnNext?.addEventListener("click", (e) => {
    e.stopPropagation();
    mostrarFoto(indiceActual + 1);
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target.classList.contains("lightbox__content")) {
      cerrarLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-active")) return;
    if (e.key === "Escape") {
      cerrarLightbox();
    } else if (e.key === "ArrowLeft") {
      mostrarFoto(indiceActual - 1);
    } else if (e.key === "ArrowRight") {
      mostrarFoto(indiceActual + 1);
    }
  });

  // Soporte de gesto de deslizamiento (swipe) táctil en móviles
  let touchInicioX = 0;
  let touchInicioY = 0;
  lightbox.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      touchInicioX = e.touches[0].clientX;
      touchInicioY = e.touches[0].clientY;
    }
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    if (e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchInicioX;
      const deltaY = e.changedTouches[0].clientY - touchInicioY;
      // Solo actuar si es un deslizamiento horizontal marcado
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX > 0) {
          mostrarFoto(indiceActual - 1);
        } else {
          mostrarFoto(indiceActual + 1);
        }
      }
    }
  }, { passive: true });
})();

/* -----------------------------------------------------------
   9. REGALOS — evita abrir enlaces pendientes
   ----------------------------------------------------------- */
(function inicializarRegalos() {
  document.querySelectorAll(".btn.is-disabled").forEach((boton) => {
    boton.addEventListener("click", (e) => {
      e.preventDefault();
    });
  });
})();

/* -----------------------------------------------------------
   10. CONFIRMACIÓN DE ASISTENCIA (RSVP)
   ----------------------------------------------------------- */
(function inicializarRSVP() {
  const form = document.getElementById("rsvp-form");
  const submitBtn = document.getElementById("rsvp-submit");
  const estadoExito = document.getElementById("rsvp-success");
  const estadoError = document.getElementById("rsvp-error");
  const rsvpIntro = document.getElementById("rsvp-intro");
  const rsvpNote = document.querySelector(".rsvp-note");
  const reintentar = document.getElementById("rsvp-retry");
  const campoNombre = document.getElementById("nombre");
  const campoApellido = document.getElementById("apellido");
  const patronTexto = /^\p{L}+(?: \p{L}+)*$/u;

  if (!form) return;

  function normalizarTexto(valor) {
    return String(valor || "")
      .replace(/[^\p{L} ]/gu, "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function formatearNombrePropio(valor) {
    return normalizarTexto(valor)
      .toLowerCase()
      .replace(/(^|\s)\p{L}/gu, (letra) => letra.toUpperCase());
  }

  function validarCampoTexto(campo) {
    if (!campo) return true;
    const valor = normalizarTexto(campo.value);
    const valido = valor.length >= 2 && valor.length <= 40 && patronTexto.test(valor);
    campo.setCustomValidity(
      valido ? "" : "Usa solo letras, espacios y acentos. No uses números ni símbolos."
    );
    return valido;
  }

  [campoNombre, campoApellido].forEach((campo) => {
    campo?.addEventListener("input", () => {
      campo.value = campo.value
        .replace(/[^\p{L} ]/gu, "")
        .replace(/\s{2,}/g, " ");
      validarCampoTexto(campo);
    });

    campo?.addEventListener("blur", () => {
      if (campo.value.trim()) {
        campo.value = formatearNombrePropio(campo.value);
        validarCampoTexto(campo);
      }
    });
  });

  function mostrarEstado(nodo) {
    form.style.display = "none";
    estadoExito.classList.remove("is-visible");
    estadoError.classList.remove("is-visible");

    if (nodo === estadoExito) {
      if (rsvpIntro) rsvpIntro.style.display = "none";
      if (rsvpNote) rsvpNote.style.display = "none";
    } else {
      if (rsvpIntro) rsvpIntro.style.display = "";
      if (rsvpNote) rsvpNote.style.display = "";
    }

    if (nodo) nodo.classList.add("is-visible");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombreValido = validarCampoTexto(campoNombre);
    const apellidoValido = validarCampoTexto(campoApellido);
    if (!nombreValido || !apellidoValido) {
      form.reportValidity();
      return;
    }

    campoNombre.value = formatearNombrePropio(campoNombre.value);
    campoApellido.value = formatearNombrePropio(campoApellido.value);

    if (!RSVP_SCRIPT_URL || RSVP_SCRIPT_URL.includes("PEGA_AQUI")) {
      console.warn(
        "RSVP_SCRIPT_URL no está configurada todavía. Revisa app.js y code.gs."
      );
      mostrarEstado(estadoError);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const datos = new FormData(form);

    try {
      const esAppsScript =
        RSVP_SCRIPT_URL.includes("script.google.com") ||
        RSVP_SCRIPT_URL.includes("script.googleusercontent.com");

      const respuesta = await fetch(RSVP_SCRIPT_URL, {
        method: "POST",
        body: datos,
        mode: esAppsScript ? "no-cors" : "cors",
      });

      function actualizarMensajeExito() {
        const asisVal = datos.get("asistencia");
        const successTitle = document.getElementById("rsvp-success-title");
        const successText = document.getElementById("rsvp-success-text");
        if (asisVal === "No podré acompañarlos") {
          if (successTitle) successTitle.textContent = "¡Gracias por avisarnos!";
          if (successText) successText.textContent = "Lamentamos que no puedas acompañarnos, ¡te tendremos presente en nuestro gran día!";
        } else {
          if (successTitle) successTitle.textContent = "¡Gracias por confirmar!";
          if (successText) successText.textContent = "Nos hace muy felices saber que serás parte de nuestro gran día.";
        }
      }

      if (esAppsScript) {
        actualizarMensajeExito();
        mostrarEstado(estadoExito);
        return;
      }

      if (!respuesta.ok) throw new Error("Respuesta HTTP no exitosa");

      const resultado = await respuesta.json().catch(() => null);
      if (resultado && resultado.resultado && resultado.resultado !== "ok") {
        throw new Error(resultado.mensaje || "Apps Script devolvió error");
      }

      actualizarMensajeExito();
      mostrarEstado(estadoExito);
    } catch (error) {
      console.error("Error enviando RSVP:", error);
      mostrarEstado(estadoError);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmar asistencia";
    }
  });

  reintentar?.addEventListener("click", () => {
    estadoError.classList.remove("is-visible");
    form.style.display = "block";
    if (rsvpIntro) rsvpIntro.style.display = "";
    if (rsvpNote) rsvpNote.style.display = "";
  });
})();


/* -----------------------------------------------------------
   11. BARRA DE PROGRESO DE LECTURA — hilo dorado arriba de la página
   ----------------------------------------------------------- */
(function inicializarProgresoScroll() {
  const barra = document.getElementById("progreso-scroll");
  if (!barra) return;

  let pendiente = false;

  function actualizar() {
    pendiente = false;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progreso = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    barra.style.transform = `scaleX(${progreso})`;
  }

  window.addEventListener("scroll", () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(actualizar);
  }, { passive: true });

  window.addEventListener("resize", actualizar);
  actualizar();
})();


/* -----------------------------------------------------------
   12. DATOS DE TRANSFERENCIA — desplegable y copiado rápido de Alias / CBU
   ----------------------------------------------------------- */
(function inicializarTransferencia() {
  const toggleBtn = document.getElementById("toggle-transfer-btn");
  const collapse = document.getElementById("transfer-details");

  if (toggleBtn && collapse) {
    toggleBtn.addEventListener("click", () => {
      const estaAbierto = collapse.classList.toggle("is-open");
      toggleBtn.setAttribute("aria-expanded", String(estaAbierto));
      const span = toggleBtn.querySelector("span");
      if (span) {
        span.textContent = estaAbierto
          ? "Ocultar datos de transferencia"
          : "Ver datos para transferencia";
      }
    });
  }

  const botonesCopiar = document.querySelectorAll(".btn-copy");
  botonesCopiar.forEach((btn) => {
    btn.addEventListener("click", () => {
      const strongTexto = btn.previousElementSibling?.querySelector("strong")?.textContent?.trim();
      const texto = btn.getAttribute("data-copy") || strongTexto || "";
      if (!texto) return;

      copiarAlPortapapeles(texto).then(() => {
        btn.classList.add("is-copied");
        const span = btn.querySelector(".btn-copy__text");
        const original = span ? span.textContent : "";
        if (span) span.textContent = "¡Copiado!";

        setTimeout(() => {
          btn.classList.remove("is-copied");
          if (span) span.textContent = original;
        }, 2000);
      }).catch((err) => {
        console.warn("No se pudo copiar el texto:", err);
      });
    });
  });

  function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto);
    }
    return new Promise((resolve, reject) => {
      try {
        const area = document.createElement("textarea");
        area.value = texto;
        area.style.position = "fixed";
        area.style.top = "-9999px";
        area.style.left = "-9999px";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();
        const exito = document.execCommand("copy");
        document.body.removeChild(area);
        if (exito) resolve();
        else reject(new Error("execCommand copy falló"));
      } catch (err) {
        reject(err);
      }
    });
  }
})();

