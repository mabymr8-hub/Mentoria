/* ═══════════════════════════════════════════════
   MABY MENTORÍAS — app.js
   Frontend + Supabase integration
   Autor: generado para Maby Mereles
═══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   MENSAJE DE PRIMER CONTACTO — Texto predeterminado
   Se precarga en cada nuevo registro.
   La mentora puede editarlo por caso sin perder el original.
────────────────────────────────────────────── */
const MENSAJE_BIENVENIDA_DEFAULT = `¡Hola! 👋 Mi nombre es Maby Mereles, soy Counselor egresada de Holos Capital Counseling.
Me pongo en contacto porque en esta etapa voy a acompañarte como tu mentora. 🌱
La mentoría es un espacio pensado para vos: para compartir dudas, orientarte en el camino y acompañarte desde la experiencia de haber transitado este mismo recorrido.
Estoy disponible para lo que necesites, ya sea consultas académicas, orientación sobre la carrera o simplemente charlar sobre el proceso. No dudes en escribirme cuando quieras.
¡Bienvenido/a a esta etapa! Estoy muy contenta de acompañarte. 😊
Maby Mereles
Counselor — Holos Capital Counseling`;

/* ──────────────────────────────────────────────
   CONFIGURACIÓN SUPABASE
   → Reemplazá estos valores con los de tu proyecto
────────────────────────────────────────────── */
const SUPABASE_URL = 'https://qhawykutieqkxcexlrco.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYXd5a3V0aWVxa3hjZXhscmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgxMTUsImV4cCI6MjA5MDk5NDExNX0.HU6FOExbXguVuKm2lOR6RXddXD75nqjxXVAH29faN0E';

// Inicialización del cliente Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ──────────────────────────────────────────────
   ESTADO GLOBAL
────────────────────────────────────────────── */
let allMentorias = [];
let currentFilter = 'all';
let searchTerm    = '';
let editingId     = null;
let currentDetailId = null;
let mensajeGlobal = MENSAJE_BIENVENIDA_DEFAULT;
let currentSort   = 'reciente';   // orden activo
let compactView   = false;        // vista compacta
// Caché offline en localStorage
const CACHE_KEY   = 'maby_mentorias_cache';

/* ──────────────────────────────────────────────
   ELEMENTOS DEL DOM
────────────────────────────────────────────── */
const loginScreen    = document.getElementById('login-screen');
const appScreen      = document.getElementById('app-screen');
const loginEmail     = document.getElementById('login-email');
const loginPassword  = document.getElementById('login-password');
const loginError     = document.getElementById('login-error');
const btnLogin       = document.getElementById('btn-login');
const btnLogout      = document.getElementById('btn-logout');
const btnNew         = document.getElementById('btn-new');
const btnSave        = document.getElementById('btn-save');
const btnCancel      = document.getElementById('btn-cancel');
const modalForm      = document.getElementById('modal-form');
const modalClose     = document.getElementById('modal-close');
const modalTitle     = document.getElementById('modal-title');
const modalDetail    = document.getElementById('modal-detail');
const detailClose    = document.getElementById('detail-close');
const detailBtnEdit  = document.getElementById('detail-btn-edit');
const detailBtnDel   = document.getElementById('detail-btn-delete');
const cardsGrid      = document.getElementById('cards-grid');
const loadingState   = document.getElementById('loading-state');
const emptyState     = document.getElementById('empty-state');
const searchInput    = document.getElementById('search-input');
const filterChips    = document.querySelectorAll('.chip');
const toast          = document.getElementById('toast');
const sortSelect     = document.getElementById('sort-select');
const btnViewToggle  = document.getElementById('btn-view-toggle');
// Modal configuración mensaje global
const btnConfig      = document.getElementById('btn-config');
const modalConfig    = document.getElementById('modal-config');
const configClose    = document.getElementById('config-close');
const configCancel   = document.getElementById('config-cancel');
const configSave     = document.getElementById('config-save');
const configMensaje  = document.getElementById('config-mensaje');
const btnConfigReset = document.getElementById('btn-config-reset');
// Modal seguimiento rápido
const modalSeg       = document.getElementById('modal-seguimiento');
const segClose       = document.getElementById('seg-close');
const segCancel      = document.getElementById('seg-cancel');
const segSave        = document.getElementById('seg-save');
const segNota        = document.getElementById('seg-nota');

// Estadísticas
const statTotal      = document.getElementById('stat-total');
const statActiva     = document.getElementById('stat-activa');
const statAlerta     = document.getElementById('stat-alerta');
const statCierre     = document.getElementById('stat-cierre');

/* ══════════════════════════════════════════════
   AUTENTICACIÓN
══════════════════════════════════════════════ */

/**
 * Al cargar la página, verificamos si ya hay sesión activa.
 * Supabase mantiene la sesión en localStorage automáticamente.
 */
async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    showApp();
    loadMentorias();
  } else {
    showLogin();
  }
}

/** Intenta hacer login con email y contraseña */
btnLogin.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;

  if (!email || !pass) {
    showLoginError('Completá email y contraseña.');
    return;
  }

  btnLogin.textContent = 'Ingresando...';
  btnLogin.disabled = true;
  loginError.classList.add('hidden');

  const { error } = await db.auth.signInWithPassword({ email, password: pass });

  btnLogin.textContent = 'Ingresar';
  btnLogin.disabled = false;

  if (error) {
    showLoginError('Email o contraseña incorrectos.');
    return;
  }

  showApp();
  await loadMensajeGlobal();
  loadMentorias();
});

/** Permite login con Enter */
[loginEmail, loginPassword].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') btnLogin.click(); });
});

/** Cierra sesión */
btnLogout.addEventListener('click', async () => {
  await db.auth.signOut();
  showLogin();
});

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

function showLogin() {
  loginScreen.classList.add('active');
  appScreen.classList.remove('active');
}

function showApp() {
  loginScreen.classList.remove('active');
  appScreen.classList.add('active');
}

/* ══════════════════════════════════════════════
   CARGA DE DATOS
══════════════════════════════════════════════ */

/** Carga todas las mentorías de la BD con caché offline */
async function loadMentorias() {
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  cardsGrid.querySelectorAll('.mentoria-card').forEach(c => c.remove());

  // Mostrar caché mientras carga (modo offline-first)
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      allMentorias = JSON.parse(cached);
      renderAll();
    } catch {}
  }

  const { data, error } = await db
    .from('mentorias')
    .select('id, created_at, nombre, apellido, telefono, fecha_primer_contacto, respondio, tipo_contacto, fecha_ultimo_contacto, mentoria_activa, videollamada_realizada, dado_de_baja, fecha_baja, inquietudes, seguimiento_mentor')
    .order('created_at', { ascending: false });

  loadingState.classList.add('hidden');

  if (error) {
    if (!cached) showToast('Sin conexión — mostrando datos guardados localmente.');
    console.error(error);
    return;
  }

  allMentorias = data || [];
  // Guardar en caché local
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(allMentorias)); } catch {}
  renderAll();
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */

/** Días entre una fecha ISO y hoy */
function diasDesde(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / 86400000);
}

/** Etapa del proceso según días desde primer contacto y estado activo */
function getEtapa(m) {
  const dias = diasDesde(m.fecha_primer_contacto);
  if (dias === null) return null;
  if (dias <= 7)  return { label: 'Presentación',        color: '#A8C5E8', dias };
  if (dias <= 14) return { label: 'Videollamada pendiente', color: '#C5A8E8', dias };
  if (dias <= 60) return { label: 'En proceso',           color: '#8FAF8A', dias };
  return           { label: 'Cierre final',               color: '#C4825A', dias };
}

/** Tiene alerta: más de 14 días sin contacto */
function tieneAlerta(m) {
  const dias = diasDesde(m.fecha_ultimo_contacto || m.fecha_primer_contacto);
  return dias !== null && dias > 14;
}

/** Está en etapa cierre (más de 60 días) */
function esCierre(m) {
  return diasDesde(m.fecha_primer_contacto) > 60;
}

/* ══════════════════════════════════════════════
   RENDERIZADO
══════════════════════════════════════════════ */

/** Aplica filtros + búsqueda + orden y renderiza */
function renderAll() {
  // 1. Filtrar
  let list = allMentorias.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      (m.nombre + ' ' + m.apellido).toLowerCase().includes(term) ||
      (m.telefono || '').includes(term) ||
      (m.inquietudes || '').toLowerCase().includes(term) ||
      (m.seguimiento_mentor || '').toLowerCase().includes(term);

    let matchFilter = true;
    if (currentFilter === 'activa')       matchFilter = m.mentoria_activa === true && !m.dado_de_baja;
    if (currentFilter === 'respondio-si') matchFilter = m.respondio === 'Sí';
    if (currentFilter === 'respondio-no') matchFilter = m.respondio === 'No' || !m.respondio;
    if (currentFilter === 'alerta')       matchFilter = tieneAlerta(m) && !m.dado_de_baja;
    if (currentFilter === 'cierre')       matchFilter = esCierre(m) && !m.dado_de_baja;
    if (currentFilter === 'baja')         matchFilter = m.dado_de_baja === true;

    return matchFilter && matchSearch;
  });

  // 2. Ordenar
  list = sortList(list);

  cardsGrid.querySelectorAll('.mentoria-card, .mentoria-row').forEach(c => c.remove());
  updateStats();

  if (list.length === 0) { emptyState.classList.remove('hidden'); return; }
  emptyState.classList.add('hidden');

  // 3. Renderizar según vista
  list.forEach(m => cardsGrid.appendChild(compactView ? buildRow(m) : buildCard(m)));
}

/** Ordena la lista según currentSort */
function sortList(list) {
  return [...list].sort((a, b) => {
    switch (currentSort) {
      case 'nombre':
        return (a.nombre + a.apellido).localeCompare(b.nombre + b.apellido);
      case 'ultimo':
        return (b.fecha_ultimo_contacto || '').localeCompare(a.fecha_ultimo_contacto || '');
      case 'dias':
        return (diasDesde(a.fecha_primer_contacto) || 0) > (diasDesde(b.fecha_primer_contacto) || 0) ? -1 : 1;
      case 'activa':
        return (b.mentoria_activa === true ? 1 : 0) - (a.mentoria_activa === true ? 1 : 0);
      default: // reciente
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });
}

/** Devuelve el SVG del ícono de crecimiento según el nivel del proceso */
function getIconoCrecimiento(m) {
  // Baja — planta seca
  if (m.dado_de_baja) {
    return `<div class="crecimiento-icon nivel-baja" title="Dado de baja">
      <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- tronco seco -->
        <path d="M20 52 Q20 38 20 28" stroke="#A89080" stroke-width="2.5" stroke-linecap="round"/>
        <!-- rama izquierda caída -->
        <path d="M20 38 Q13 36 10 40" stroke="#A89080" stroke-width="2" stroke-linecap="round"/>
        <!-- rama derecha caída -->
        <path d="M20 32 Q27 30 29 34" stroke="#A89080" stroke-width="2" stroke-linecap="round"/>
        <!-- hoja marchita izquierda -->
        <path d="M10 40 Q8 44 11 46 Q12 42 10 40Z" fill="#C4B8A8" opacity=".7"/>
        <!-- hoja marchita derecha -->
        <path d="M29 34 Q32 37 30 40 Q28 37 29 34Z" fill="#C4B8A8" opacity=".7"/>
        <!-- hoja caída en suelo -->
        <ellipse cx="16" cy="50" rx="4" ry="2" fill="#C4B8A8" opacity=".5" transform="rotate(-15 16 50)"/>
        <!-- tierra -->
        <ellipse cx="20" cy="52" rx="9" ry="3" fill="#BBA990" opacity=".4"/>
      </svg>
    </div>`;
  }
  // Nivel 3 — Árbol: videollamada realizada (campo booleano explícito)
  if (m.videollamada_realizada) {
    return `<div class="crecimiento-icon nivel-3" title="Videollamada realizada">
      <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="17" y="34" width="6" height="18" rx="2" fill="#8B6340"/>
        <ellipse cx="20" cy="34" rx="13" ry="10" fill="#4A8F3F"/>
        <ellipse cx="20" cy="24" rx="10" ry="8" fill="#5AA64D"/>
        <ellipse cx="20" cy="16" rx="7" ry="7" fill="#6BBF5E"/>
        <ellipse cx="17" cy="13" rx="2.5" ry="2" fill="#8FD97F" opacity=".6"/>
      </svg>
    </div>`;
  }
  // Nivel 2 — Tallo: respondió
  if (m.respondio === 'Sí') {
    return `<div class="crecimiento-icon nivel-2" title="El estudiante respondió">
      <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 52 Q20 30 20 18" stroke="#6B9A64" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M20 32 Q10 26 11 18 Q18 22 20 32Z" fill="#8FBF84"/>
        <path d="M20 26 Q30 20 29 12 Q22 16 20 26Z" fill="#6B9A64"/>
        <circle cx="20" cy="16" r="3.5" fill="#A8D49E"/>
      </svg>
    </div>`;
  }
  // Nivel 1 — Semilla: primer contacto enviado
  if (m.fecha_primer_contacto) {
    return `<div class="crecimiento-icon nivel-1" title="Primer contacto enviado">
      <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="20" cy="46" rx="10" ry="4" fill="#C4A882" opacity=".5"/>
        <ellipse cx="20" cy="38" rx="7" ry="9" fill="#8B6340"/>
        <path d="M20 30 Q24 35 20 40 Q16 35 20 30Z" fill="#C4925A" opacity=".7"/>
        <path d="M20 29 Q20 24 20 22" stroke="#6B9A64" stroke-width="2" stroke-linecap="round"/>
        <path d="M20 25 Q16 22 15 19" stroke="#6B9A64" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>`;
  }
  return `<div class="crecimiento-icon nivel-0" title="Sin contacto iniciado">
    <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="46" rx="10" ry="4" fill="#D8D2C9" opacity=".4"/>
      <ellipse cx="20" cy="40" rx="6" ry="7" fill="#D8D2C9" opacity=".5"/>
    </svg>
  </div>`;
}

/** Tarjeta completa (vista normal) */
function buildCard(m) {
  const card = document.createElement('div');
  card.className = `mentoria-card${m.dado_de_baja ? ' card-baja' : ''}`;
  card.dataset.id = m.id;

  const initials   = `${(m.nombre || '?')[0]}${(m.apellido || '?')[0]}`.toUpperCase();
  const activa     = m.mentoria_activa === true;
  const alerta     = tieneAlerta(m);
  const etapa      = getEtapa(m);
  const diasUltimo = diasDesde(m.fecha_ultimo_contacto);
  const seg = (m.seguimiento_mentor || '').trim();
  const seguimientoPreview = seg.length > 0
    ? seg.replace(/\n+/g, ' · ').slice(0, 100) + (seg.length > 100 ? '…' : '')
    : null;

  card.innerHTML = `
    ${alerta ? `<div class="card-alerta-banner">⚠️ Sin contacto hace ${diasUltimo} días</div>` : ''}
    <div class="card-top">
      <div class="card-avatar" style="${etapa ? `background:linear-gradient(135deg,${etapa.color},${etapa.color}99)` : ''}">${initials}</div>
      <div class="card-info">
        <div class="card-name">${m.nombre} ${m.apellido}</div>
        <div class="card-email">${m.telefono || '—'}</div>
        ${etapa ? `<div class="card-etapa" style="color:${etapa.color === '#8FAF8A' ? 'var(--accent-dark)' : etapa.color}">${etapa.label} · ${etapa.dias}d</div>` : ''}
      </div>
      <div class="card-right">
        ${getIconoCrecimiento(m)}
        <span class="card-badge-activa ${m.dado_de_baja ? 'activa-baja' : activa ? 'activa-si' : 'activa-no'}">
          ${m.dado_de_baja
            ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Baja`
            : activa
              ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Activa`
              : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg> Inactiva`}
        </span>
      </div>
    </div>
    <div class="card-meta">
      ${m.tipo_contacto ? `<span class="card-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45c.9.374 1.852.63 2.82.7A2 2 0 0 1 21.5 15.09v3-.17z"/></svg>${m.tipo_contacto}</span>` : ''}
      ${m.respondio ? `<span class="card-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>Respondió: ${m.respondio}</span>` : ''}
      ${m.fecha_ultimo_contacto ? `<span class="card-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${formatDate(m.fecha_ultimo_contacto)}</span>` : ''}
    </div>
    ${seguimientoPreview ? `<div class="card-seguimiento-preview">${seguimientoPreview}</div>` : ''}
    <div class="card-spacer"></div>
    <button class="btn-contactar-hoy" data-id="${m.id}" title="Registrar contacto hoy">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45c.9.374 1.852.63 2.82.7A2 2 0 0 1 21.5 15.09z"/></svg>
      Contactar hoy
    </button>
  `;

  card.querySelector('.btn-contactar-hoy').addEventListener('click', e => {
    e.stopPropagation();
    abrirModalSeguimiento(m.id);
  });

  card.addEventListener('click', () => openDetail(m.id));
  return card;
}

/** Fila compacta (vista lista) */
function buildRow(m) {
  const row = document.createElement('div');
  row.className = 'mentoria-row';
  row.dataset.id = m.id;

  const activa  = m.mentoria_activa === true;
  const alerta  = tieneAlerta(m);
  const etapa   = getEtapa(m);

  row.innerHTML = `
    <div class="row-dot ${activa ? 'activa-si' : 'activa-no'}"></div>
    <div class="row-nombre">
      ${alerta ? '<span class="row-alerta-dot" title="Sin contacto reciente"></span>' : ''}
      ${m.nombre} ${m.apellido}
    </div>
    <div class="row-tel">${m.telefono || '—'}</div>
    <div class="row-etapa">${etapa ? etapa.label : '—'}</div>
    <div class="row-fecha">${m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : '—'}</div>
    <button class="btn-contactar-hoy row-btn" data-id="${m.id}">Hoy</button>
  `;

  row.querySelector('.btn-contactar-hoy').addEventListener('click', e => {
    e.stopPropagation();
    abrirModalSeguimiento(m.id);
  });
  row.addEventListener('click', () => openDetail(m.id));
  return row;
}

/** Actualiza los números del dashboard */
function updateStats() {
  statTotal.textContent  = allMentorias.length;
  statActiva.textContent = allMentorias.filter(m => m.mentoria_activa === true && !m.dado_de_baja).length;
  // Sin contacto = inactivas + las que tienen más de 14 días sin contacto (sin contar bajas)
  statAlerta.textContent = allMentorias.filter(m => !m.dado_de_baja && (!m.mentoria_activa || tieneAlerta(m))).length;
  document.getElementById('stat-baja').textContent = allMentorias.filter(m => m.dado_de_baja === true).length;
}

/* ══════════════════════════════════════════════
   FILTROS Y BÚSQUEDA
══════════════════════════════════════════════ */
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    renderAll();
  });
});

searchInput.addEventListener('input', e => {
  searchTerm = e.target.value;
  renderAll();
});

/** Orden */
sortSelect.addEventListener('change', e => {
  currentSort = e.target.value;
  renderAll();
});

/** Toggle vista compacta / tarjetas */
btnViewToggle.addEventListener('click', () => {
  compactView = !compactView;
  document.getElementById('icon-view-cards').style.display = compactView ? 'none'  : 'block';
  document.getElementById('icon-view-list').style.display  = compactView ? 'block' : 'none';
  cardsGrid.classList.toggle('compact-view', compactView);
  renderAll();
});

/* ══════════════════════════════════════════════
   MODAL SEGUIMIENTO RÁPIDO
══════════════════════════════════════════════ */

let segTargetId = null;

function abrirModalSeguimiento(id) {
  segTargetId = id;
  const m = allMentorias.find(x => x.id === id);
  segNota.value = '';
  segNota.placeholder = `Nota de seguimiento para ${m ? m.nombre : ''}...`;
  modalSeg.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => segNota.focus(), 100);
}

[segClose, segCancel].forEach(el => {
  el.addEventListener('click', () => {
    modalSeg.classList.add('hidden');
    document.body.style.overflow = '';
    segTargetId = null;
  });
});

modalSeg.addEventListener('click', e => {
  if (e.target === modalSeg) {
    modalSeg.classList.add('hidden');
    document.body.style.overflow = '';
    segTargetId = null;
  }
});

segSave.addEventListener('click', async () => {
  const nota = segNota.value.trim();
  if (!nota) { showToast('Escribí una nota antes de guardar.'); return; }

  const m = allMentorias.find(x => x.id === segTargetId);
  if (!m) return;

  // Construir nueva entrada con fecha/hora automática
  const ahora = new Date();
  const fechaStr = `${ahora.getDate().toString().padStart(2,'0')}/${(ahora.getMonth()+1).toString().padStart(2,'0')}/${ahora.getFullYear()} ${ahora.getHours().toString().padStart(2,'0')}:${ahora.getMinutes().toString().padStart(2,'0')}`;
  const nuevaEntrada = `[${fechaStr}] ${nota}`;

  // Acumular sobre el historial existente
  const historialActual = (m.seguimiento_mentor || '').trim();
  const nuevoHistorial = historialActual
    ? `${nuevaEntrada}\n\n${historialActual}`
    : nuevaEntrada;

  segSave.textContent = 'Guardando...';
  segSave.disabled = true;

  const { error } = await db
    .from('mentorias')
    .update({
      seguimiento_mentor: nuevoHistorial,
      fecha_ultimo_contacto: ahora.toISOString().slice(0, 10)
    })
    .eq('id', segTargetId);

  segSave.textContent = 'Guardar nota';
  segSave.disabled = false;

  if (error) { showToast('Error al guardar.'); console.error(error); return; }

  modalSeg.classList.add('hidden');
  document.body.style.overflow = '';
  segTargetId = null;
  showToast('✓ Nota y fecha de contacto actualizadas');
  await loadMentorias();
});

/* ══════════════════════════════════════════════
   MODAL FORMULARIO (Crear / Editar)
══════════════════════════════════════════════ */

/** Abre el modal vacío para crear */
btnNew.addEventListener('click', () => openFormModal(null));

/** Cierra el modal */
[btnCancel, modalClose].forEach(el => {
  el.addEventListener('click', closeFormModal);
});

modalForm.addEventListener('click', e => {
  if (e.target === modalForm) closeFormModal();
});

/** Abre el formulario. Si id=null es creación, si id=string es edición */
function openFormModal(id) {
  editingId = id;
  modalTitle.textContent = id ? 'Editar Mentoría' : 'Nueva Mentoría';
  clearForm();

  if (id) {
    const m = allMentorias.find(x => x.id === id);
    if (m) fillForm(m);
  }

  modalForm.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeFormModal() {
  modalForm.classList.add('hidden');
  document.body.style.overflow = '';
  editingId = null;
}

/** Limpia todos los campos del formulario */
function clearForm() {
  ['form-id','form-nombre','form-apellido','form-telefono',
   'form-fecha-primer','form-fecha-ultimo','form-respondio','form-tipo-contacto',
   'form-inquietudes','form-seguimiento']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  document.getElementById('form-activa').checked        = false;
  document.getElementById('form-videollamada').checked  = false;
}

/** Rellena el formulario con los datos de una mentoría */
function fillForm(m) {
  document.getElementById('form-id').value            = m.id;
  document.getElementById('form-nombre').value        = m.nombre || '';
  document.getElementById('form-apellido').value      = m.apellido || '';
  document.getElementById('form-telefono').value      = m.telefono || '';
  document.getElementById('form-fecha-primer').value  = m.fecha_primer_contacto || '';
  document.getElementById('form-fecha-ultimo').value  = m.fecha_ultimo_contacto || '';
  document.getElementById('form-respondio').value     = m.respondio || '';
  document.getElementById('form-tipo-contacto').value = m.tipo_contacto || '';
  document.getElementById('form-activa').checked               = m.mentoria_activa === true;
  document.getElementById('form-videollamada').checked          = m.videollamada_realizada === true;
  document.getElementById('form-inquietudes').value             = m.inquietudes || '';
  document.getElementById('form-seguimiento').value   = m.seguimiento_mentor || '';
}

/** Lee los valores del formulario y devuelve un objeto */
function readForm() {
  return {
    nombre:               document.getElementById('form-nombre').value.trim(),
    apellido:             document.getElementById('form-apellido').value.trim(),
    telefono:             document.getElementById('form-telefono').value.trim(),
    fecha_primer_contacto:document.getElementById('form-fecha-primer').value || null,
    fecha_ultimo_contacto:document.getElementById('form-fecha-ultimo').value || null,
    respondio:            document.getElementById('form-respondio').value || null,
    tipo_contacto:        document.getElementById('form-tipo-contacto').value || null,
    mentoria_activa:           document.getElementById('form-activa').checked,
    videollamada_realizada:    document.getElementById('form-videollamada').checked,
    inquietudes:               document.getElementById('form-inquietudes').value.trim() || null,
    seguimiento_mentor:   document.getElementById('form-seguimiento').value.trim() || null,
  };
}

/** Guarda (crea o actualiza) */
btnSave.addEventListener('click', async () => {
  const data = readForm();

  if (!data.nombre || !data.apellido) {
    showToast('Nombre y apellido son obligatorios.');
    return;
  }

  btnSave.textContent = 'Guardando...';
  btnSave.disabled = true;

  let error;

  if (editingId) {
    // UPDATE
    ({ error } = await db
      .from('mentorias')
      .update(data)
      .eq('id', editingId));
  } else {
    // INSERT
    ({ error } = await db
      .from('mentorias')
      .insert([data]));
  }

  btnSave.textContent = 'Guardar';
  btnSave.disabled = false;

  if (error) {
    showToast('Error al guardar. Revisá la consola.');
    console.error(error);
    return;
  }

  closeFormModal();
  showToast(editingId ? '✓ Registro actualizado' : '✓ Mentoría creada');
  await loadMentorias();
});

/* ══════════════════════════════════════════════
   MINI CALENDARIO
══════════════════════════════════════════════ */

/**
 * Construye el HTML del mini calendario del mes actual.
 * Marca los contactos pasados y calcula el próximo contacto sugerido.
 * @param {object} m - registro de mentoría
 */
function buildMiniCalendario(m) {
  const hoy     = new Date();
  const año     = hoy.getFullYear();
  const mes     = hoy.getMonth();
  const meses   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dias    = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

  // Fechas de contacto registradas (pasadas)
  const fechasContacto = new Set();
  if (m.fecha_primer_contacto) {
    const f = new Date(m.fecha_primer_contacto + 'T12:00:00');
    if (f.getFullYear() === año && f.getMonth() === mes)
      fechasContacto.add(f.getDate());
  }
  if (m.fecha_ultimo_contacto && m.fecha_ultimo_contacto !== m.fecha_primer_contacto) {
    const f = new Date(m.fecha_ultimo_contacto + 'T12:00:00');
    if (f.getFullYear() === año && f.getMonth() === mes)
      fechasContacto.add(f.getDate());
  }
  // Entradas del historial de seguimiento con fecha [dd/mm/yyyy ...]
  const regexEntrada = /\[(\d{2})\/(\d{2})\/(\d{4})/g;
  let match;
  while ((match = regexEntrada.exec(m.seguimiento_mentor || '')) !== null) {
    const d = parseInt(match[1]), mo = parseInt(match[2]) - 1, y = parseInt(match[3]);
    if (y === año && mo === mes) fechasContacto.add(d);
  }

  // Próximo contacto sugerido: 7 días después del último contacto
  let proximoContacto = null;
  const refFecha = m.fecha_ultimo_contacto || m.fecha_primer_contacto;
  if (refFecha) {
    const proximo = new Date(refFecha + 'T12:00:00');
    proximo.setDate(proximo.getDate() + 7);
    if (proximo.getFullYear() === año && proximo.getMonth() === mes && proximo > hoy)
      proximoContacto = proximo.getDate();
  }

  // Primer día del mes y total de días
  const primerDia = new Date(año, mes, 1).getDay();
  const totalDias = new Date(año, mes + 1, 0).getDate();

  // Construir grilla
  let celdas = '';
  for (let i = 0; i < primerDia; i++) celdas += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= totalDias; d++) {
    const esHoy      = d === hoy.getDate();
    const esContacto = fechasContacto.has(d);
    const esProximo  = d === proximoContacto;
    let cls = 'cal-cell';
    if (esHoy)      cls += ' cal-hoy';
    if (esContacto) cls += ' cal-contacto';
    if (esProximo)  cls += ' cal-proximo';
    const title = esContacto ? 'Contacto realizado' : esProximo ? 'Próximo contacto sugerido' : '';
    celdas += `<div class="${cls}" title="${title}">${d}</div>`;
  }

  const leyenda = `
    <div class="cal-leyenda">
      <span class="cal-ley-item"><span class="cal-dot cal-dot-contacto"></span>Contacto</span>
      <span class="cal-ley-item"><span class="cal-dot cal-dot-proximo"></span>Próximo sugerido</span>
      <span class="cal-ley-item"><span class="cal-dot cal-dot-hoy"></span>Hoy</span>
    </div>`;

  return `
    <div class="mini-calendario">
      <div class="cal-header">
        <span class="cal-mes">${meses[mes]} ${año}</span>
      </div>
      <div class="cal-grid-header">${dias.map(d => `<div class="cal-day-name">${d}</div>`).join('')}</div>
      <div class="cal-grid">${celdas}</div>
      ${leyenda}
      ${proximoContacto ? `<p class="cal-sugerencia">💬 Próximo contacto sugerido: día ${proximoContacto}</p>` : ''}
    </div>`;
}

/* ══════════════════════════════════════════════
   MODAL DETALLE
══════════════════════════════════════════════ */

/** Abre el modal de detalle con los datos de la mentoría */
function openDetail(id) {
  const m = allMentorias.find(x => x.id === id);
  if (!m) return;

  currentDetailId = id;
  document.getElementById('detail-nombre').textContent = `${m.nombre} ${m.apellido}`;

  const body = document.getElementById('detail-body');
  const val = (v) => v ? `<span>${v}</span>` : `<span class="empty-val">—</span>`;
  const activa = m.mentoria_activa === true;

  body.innerHTML = `

    <!-- Crecimiento + Estado -->
    <div class="detail-crecimiento-row">
      <div class="detail-crecimiento-visual">
        ${getIconoCrecimiento(m)}
        <div class="detail-crecimiento-label">
          ${m.dado_de_baja ? 'Planta seca · Dado de baja'
          : m.videollamada_realizada ? 'Árbol · Videollamada realizada'
          : m.respondio === 'Sí' ? 'Tallo · Respondió'
          : m.fecha_primer_contacto ? 'Semilla · Primer contacto enviado'
          : 'Sin contacto aún'}
        </div>
      </div>
      <div class="detail-activa-badge ${activa ? 'activa-si' : 'activa-no'}">
        ${activa
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Activa`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Inactiva`}
      </div>
    </div>

    <!-- Mini Calendario -->
    <div class="detail-section">
      <div class="detail-section-title">Calendario de contactos</div>
      ${buildMiniCalendario(m)}
    </div>

    <!-- Mensaje WhatsApp -->
    <div class="detail-section">
      <div class="detail-section-title-row">
        <span class="detail-section-title" style="margin-bottom:0;border:none">Mensaje de primer contacto</span>
        <button class="btn-copy-msg" id="btn-copy-msg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copiar
        </button>
      </div>
      <div class="detail-item" style="margin-top:8px">
        <div class="detail-text-block" id="detail-msg-text">${mensajeGlobal}</div>
      </div>
      ${m.telefono
        ? `<button class="btn-whatsapp" id="btn-whatsapp" data-phone="${formatPhone(m.telefono)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Enviar por WhatsApp
           </button>`
        : `<div class="btn-whatsapp-disabled">Sin número de teléfono cargado</div>`
      }
    </div>

    <!-- Contacto -->
    <div class="detail-section">
      <div class="detail-section-title">Contacto</div>
      <div class="detail-row">
        <div class="detail-item"><label>Teléfono</label>${val(m.telefono)}</div>
        <div class="detail-item"><label>Respondió</label>${val(m.respondio)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-item"><label>Primer contacto</label>${val(m.fecha_primer_contacto ? formatDate(m.fecha_primer_contacto) : null)}</div>
        <div class="detail-item"><label>Último contacto</label>${val(m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : null)}</div>
      </div>
      <div class="detail-item"><label>Tipo de contacto</label>${val(m.tipo_contacto)}</div>
    </div>

    <!-- Inquietudes -->
    <div class="detail-section">
      <div class="detail-section-title">Inquietudes del estudiante</div>
      ${(m.inquietudes || '').trim()
        ? `<div class="detail-text-block">${m.inquietudes.trim()}</div>`
        : `<span class="empty-val">Sin registrar</span>`}
    </div>

    <!-- Seguimiento -->
    <div class="detail-section">
      <div class="detail-section-title">Seguimiento del mentor</div>
      ${(m.seguimiento_mentor || '').trim()
        ? `<div class="detail-text-block detail-seguimiento">${m.seguimiento_mentor.trim()}</div>`
        : `<span class="empty-val">Sin registrar</span>`}
    </div>
  `;

  modalDetail.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Actualizar botón baja según estado actual
  const btnBaja = document.getElementById('detail-btn-baja');
  if (m.dado_de_baja) {
    btnBaja.textContent = '↩ Reactivar';
    btnBaja.classList.add('btn-baja-reactivar');
    btnBaja.classList.remove('btn-baja');
  } else {
    btnBaja.textContent = 'Dar de baja';
    btnBaja.classList.add('btn-baja');
    btnBaja.classList.remove('btn-baja-reactivar');
  }

  document.getElementById('btn-copy-msg').addEventListener('click', async () => {
    const texto = document.getElementById('detail-msg-text').innerText;
    try {
      await navigator.clipboard.writeText(texto);
      const btn = document.getElementById('btn-copy-msg');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> ¡Copiado!`;
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = 'var(--accent)';
      setTimeout(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar`;
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2000);
    } catch { showToast('No se pudo copiar.'); }
  });

  const btnWA = document.getElementById('btn-whatsapp');
  if (btnWA) {
    btnWA.addEventListener('click', () => {
      const url = `https://wa.me/${btnWA.dataset.phone}?text=${encodeForWhatsApp(mensajeGlobal)}`;
      window.open(url, '_blank', 'noopener');
    });
  }
}

[detailClose].forEach(el => {
  el.addEventListener('click', closeDetailModal);
});
modalDetail.addEventListener('click', e => {
  if (e.target === modalDetail) closeDetailModal();
});

function closeDetailModal() {
  modalDetail.classList.add('hidden');
  document.body.style.overflow = '';
  currentDetailId = null;
}

/** Botón Editar en el modal de detalle */
detailBtnEdit.addEventListener('click', () => {
  const id = currentDetailId;
  closeDetailModal();
  openFormModal(id);
});

/** Botón Dar de baja / Reactivar */
document.getElementById('detail-btn-baja').addEventListener('click', async () => {
  const m = allMentorias.find(x => x.id === currentDetailId);
  if (!m) return;

  const esBaja = m.dado_de_baja === true;

  if (esBaja) {
    // Reactivar
    if (!confirm(`¿Reactivar la mentoría de ${m.nombre} ${m.apellido}?`)) return;
    const { error } = await db
      .from('mentorias')
      .update({ dado_de_baja: false, fecha_baja: null })
      .eq('id', currentDetailId);
    if (error) { showToast('Error al reactivar.'); return; }
    closeDetailModal();
    showToast(`✓ ${m.nombre} reactivada`);
  } else {
    // Dar de baja
    if (!confirm(`¿Dar de baja a ${m.nombre} ${m.apellido}?\nSe quitará de las activas y se marcará con planta seca.`)) return;
    const { error } = await db
      .from('mentorias')
      .update({
        dado_de_baja: true,
        mentoria_activa: false,
        fecha_baja: new Date().toISOString().slice(0, 10)
      })
      .eq('id', currentDetailId);
    if (error) { showToast('Error al dar de baja.'); return; }
    closeDetailModal();
    showToast(`${m.nombre} dada de baja`);
  }
  await loadMentorias();
});

/** Botón Eliminar en el modal de detalle */
detailBtnDel.addEventListener('click', async () => {
  if (!confirm('¿Eliminás esta mentoría? Esta acción no se puede deshacer.')) return;

  const { error } = await db
    .from('mentorias')
    .delete()
    .eq('id', currentDetailId);

  if (error) {
    showToast('Error al eliminar.');
    console.error(error);
    return;
  }

  closeDetailModal();
  showToast('Registro eliminado.');
  await loadMentorias();
});

/* ══════════════════════════════════════════════
   MENSAJE GLOBAL DE BIENVENIDA
   Se guarda en Supabase tabla "configuracion"
   key = 'mensaje_bienvenida'
══════════════════════════════════════════════ */

/** Carga el mensaje global desde Supabase */
async function loadMensajeGlobal() {
  const { data } = await db
    .from('configuracion')
    .select('valor')
    .eq('clave', 'mensaje_bienvenida')
    .single();
  if (data?.valor) mensajeGlobal = data.valor;
}

/** Abre el modal de configuración */
btnConfig.addEventListener('click', () => {
  configMensaje.value = mensajeGlobal;
  modalConfig.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

/** Cierra el modal de configuración */
[configClose, configCancel].forEach(el => {
  el.addEventListener('click', () => {
    modalConfig.classList.add('hidden');
    document.body.style.overflow = '';
  });
});
modalConfig.addEventListener('click', e => {
  if (e.target === modalConfig) {
    modalConfig.classList.add('hidden');
    document.body.style.overflow = '';
  }
});

/** Restaura el texto original */
btnConfigReset.addEventListener('click', () => {
  configMensaje.value = MENSAJE_BIENVENIDA_DEFAULT;
});

/** Guarda el mensaje global en Supabase */
configSave.addEventListener('click', async () => {
  const nuevoMensaje = configMensaje.value.trim();
  if (!nuevoMensaje) { showToast('El mensaje no puede estar vacío.'); return; }

  configSave.textContent = 'Guardando...';
  configSave.disabled = true;

  // upsert: si existe lo actualiza, si no lo crea
  const { error } = await db
    .from('configuracion')
    .upsert({ clave: 'mensaje_bienvenida', valor: nuevoMensaje }, { onConflict: 'clave' });

  configSave.textContent = 'Guardar mensaje';
  configSave.disabled = false;

  if (error) {
    showToast('Error al guardar. Revisá la consola.');
    console.error(error);
    return;
  }

  mensajeGlobal = nuevoMensaje;
  modalConfig.classList.add('hidden');
  document.body.style.overflow = '';
  // Si hay un detalle abierto, actualizar el texto visible ahí también
  const msgVisible = document.getElementById('detail-msg-text');
  if (msgVisible) msgVisible.textContent = nuevoMensaje;
  showToast('✓ Mensaje actualizado para todos los contactos');
});

/* ══════════════════════════════════════════════
   BACKUP / RESTORE JSON
══════════════════════════════════════════════ */

/** Exporta todos los registros como archivo JSON */
document.getElementById('btn-export-json').addEventListener('click', async () => {
  // Traer siempre los datos más frescos desde Supabase
  const { data, error } = await db
    .from('mentorias')
    .select('id, created_at, nombre, apellido, telefono, fecha_primer_contacto, respondio, tipo_contacto, fecha_ultimo_contacto, mentoria_activa, inquietudes, seguimiento_mentor')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error al obtener datos para backup.'); return; }
  if (!data.length) { showToast('No hay datos para exportar.'); return; }

  const backup = {
    version: '1.0',
    exportado: new Date().toISOString(),
    total: data.length,
    mentorias: data
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `MentoriasBackup_${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✓ Backup exportado (${data.length} registros)`);
});

/** Importa registros desde un archivo JSON exportado previamente */
document.getElementById('input-import-json').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const importStatus = document.getElementById('import-status');
  importStatus.className = 'import-status';
  importStatus.textContent = 'Leyendo archivo...';

  const reader = new FileReader();
  reader.onload = async (ev) => {
    let backup;

    // Parsear JSON
    try {
      backup = JSON.parse(ev.target.result);
    } catch {
      importStatus.className = 'import-status import-error';
      importStatus.textContent = '❌ El archivo no es un JSON válido.';
      return;
    }

    // Validar estructura
    if (!backup.mentorias || !Array.isArray(backup.mentorias)) {
      importStatus.className = 'import-status import-error';
      importStatus.textContent = '❌ El JSON no tiene el formato correcto de backup.';
      return;
    }

    const total = backup.mentorias.length;
    importStatus.textContent = `Importando ${total} registros...`;

    // Confirmar con el usuario
    const confirmar = confirm(
      `¿Importar ${total} registros desde "${file.name}"?\n\n` +
      `⚠️ Los registros con el mismo ID se actualizarán. Los nuevos se agregarán. No se elimina nada.`
    );
    if (!confirmar) {
      importStatus.className = 'import-status import-error';
      importStatus.textContent = 'Importación cancelada.';
      e.target.value = '';
      return;
    }

    // Preparar registros: limpiar campos que Supabase maneja solo
    const registros = backup.mentorias.map(m => ({
      id:                    m.id,
      nombre:                m.nombre,
      apellido:              m.apellido,
      telefono:              m.telefono || null,
      fecha_primer_contacto: m.fecha_primer_contacto || null,
      respondio:             m.respondio || null,
      tipo_contacto:         m.tipo_contacto || null,
      fecha_ultimo_contacto: m.fecha_ultimo_contacto || null,
      mentoria_activa:       m.mentoria_activa === true,
      inquietudes:           m.inquietudes || null,
      seguimiento_mentor:    m.seguimiento_mentor || null,
    }));

    // Upsert — inserta nuevos y actualiza existentes por ID
    const { error } = await db
      .from('mentorias')
      .upsert(registros, { onConflict: 'id' });

    if (error) {
      importStatus.className = 'import-status import-error';
      importStatus.textContent = `❌ Error al importar: ${error.message}`;
      console.error(error);
      e.target.value = '';
      return;
    }

    importStatus.className = 'import-status import-ok';
    importStatus.textContent = `✓ ${total} registros importados correctamente.`;
    e.target.value = '';

    // Recargar los datos en la app
    await loadMentorias();
    showToast(`✓ Backup restaurado — ${total} registros`);
  };

  reader.readAsText(file);
});

/* ══════════════════════════════════════════════
   EXPORTACIÓN
══════════════════════════════════════════════ */

/** Exporta a Excel (.xlsx) usando SheetJS */
document.getElementById('btn-export-excel').addEventListener('click', () => {
  if (!allMentorias.length) { showToast('No hay datos para exportar.'); return; }

  const headers = [
    'Nombre', 'Apellido', 'Teléfono',
    'Primer contacto', 'Respondió', 'Tipo de contacto',
    'Último contacto', 'Estado',
    'Inquietudes del estudiante', 'Seguimiento del mentor'
  ];

  const rows = allMentorias.map(m => [
    m.nombre, m.apellido, m.telefono || '—',
    m.fecha_primer_contacto ? formatDate(m.fecha_primer_contacto) : '—',
    m.respondio || '—',
    m.tipo_contacto || '—',
    m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : '—',
    m.dado_de_baja ? 'Baja' : m.mentoria_activa ? 'Activa' : 'Inactiva',
    m.inquietudes || '—',
    m.seguimiento_mentor || '—'
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Anchos de columna
  ws['!cols'] = [
    { wch: 16 }, { wch: 18 }, { wch: 16 },
    { wch: 14 }, { wch: 10 }, { wch: 18 },
    { wch: 14 }, { wch: 14 },
    { wch: 40 }, { wch: 50 }
  ];

  // Wrap text en las celdas de inquietudes y seguimiento
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 1; R <= range.e.r; R++) {
    ['I','J'].forEach(col => {
      const cell = ws[`${col}${R + 1}`];
      if (cell) cell.s = { alignment: { wrapText: true, vertical: 'top' } };
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mentorías');
  XLSX.writeFile(wb, `Mentorias_${today()}.xlsx`);
  showToast('Excel exportado ✓');
});

/** Exporta a PDF usando jsPDF + autotable
 *  Formato: orientación portrait, una ficha por persona.
 *  Cada persona tiene: datos de contacto + inquietudes + seguimiento.
 */
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  if (!allMentorias.length) { showToast('No hay datos para exportar.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210; // ancho A4
  const ML = 14;  // margen izquierdo
  const CW = PW - ML * 2; // ancho de contenido

  // ── Paleta ──
  const COLOR_VERDE   = [107, 154, 100];
  const COLOR_VERDE_L = [239, 246, 238];
  const COLOR_GRIS    = [245, 241, 235];
  const COLOR_TEXTO   = [44,  36,  23];
  const COLOR_MUTED   = [122, 110, 98];

  // ── Título ──
  doc.setFillColor(...COLOR_VERDE);
  doc.rect(0, 0, PW, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Registro de Mentorías — Maby Mereles', ML, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Exportado: ${new Date().toLocaleDateString('es-AR')}  ·  Total: ${allMentorias.length} registros`, ML, 19);

  let y = 30; // cursor vertical

  allMentorias.forEach((m, idx) => {
    const activa = m.mentoria_activa === true;

    // Estimamos altura mínima de esta ficha para ver si cabe en la página
    // Si no cabe, agregamos página nueva
    if (y > 240) {
      doc.addPage();
      y = 16;
    }

    // ── Cabecera de persona ──
    doc.setFillColor(...COLOR_VERDE);
    doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${m.nombre} ${m.apellido}`.toUpperCase(), ML + 3, y + 6.2);

    // Badge estado — BAJA tiene prioridad sobre INACTIVA
    const esBaja   = m.dado_de_baja === true;
    const badgeLabel = esBaja ? 'BAJA' : activa ? 'ACTIVA' : 'INACTIVA';
    const badgeColor = esBaja ? [196, 148, 100] : activa ? [144, 196, 138] : [180, 170, 160];
    const badgeW     = esBaja ? 14 : activa ? 16 : 20;
    const badgeX     = ML + CW - badgeW - 2;
    doc.setFillColor(...badgeColor);
    doc.roundedRect(badgeX, y + 1.5, badgeW, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(badgeLabel, badgeX + badgeW / 2, y + 5.8, { align: 'center' });

    y += 11;

    // ── Fila de datos de contacto ──
    doc.setFillColor(...COLOR_GRIS);
    doc.rect(ML, y, CW, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_MUTED);

    const col1 = ML + 2;
    const col2 = ML + 45;
    const col3 = ML + 90;
    const col4 = ML + 130;

    doc.text('TELÉFONO', col1, y + 3);
    doc.text('PRIMER CONTACTO', col2, y + 3);
    doc.text('ÚLTIMO CONTACTO', col3, y + 3);
    doc.text('RESPONDIÓ / TIPO', col4, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXTO);

    doc.text(m.telefono || '—', col1, y + 7);
    doc.text(m.fecha_primer_contacto ? formatDate(m.fecha_primer_contacto) : '—', col2, y + 7);
    doc.text(m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : '—', col3, y + 7);

    const respTipo = [m.respondio, m.tipo_contacto].filter(Boolean).join(' · ') || '—';
    doc.text(respTipo, col4, y + 7);

    y += 10;

    // ── Sección Inquietudes ──
    const inquietudes = m.inquietudes || '—';
    const inquLines = doc.splitTextToSize(inquietudes, CW - 6);
    const inquH = Math.max(10, inquLines.length * 4.2 + 7);

    // Verificar salto de página
    if (y + inquH + 30 > 285) { doc.addPage(); y = 16; }

    doc.setFillColor(...COLOR_VERDE_L);
    doc.rect(ML, y, CW, inquH, 'F');
    // Borde izquierdo verde
    doc.setFillColor(...COLOR_VERDE);
    doc.rect(ML, y, 2.5, inquH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_VERDE);
    doc.text('INQUIETUDES DEL ESTUDIANTE', ML + 5, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXTO);
    doc.text(inquLines, ML + 5, y + 8.5);

    y += inquH + 2;

    // ── Sección Seguimiento ──
    const seguimiento = m.seguimiento_mentor || '—';
    const segLines = doc.splitTextToSize(seguimiento, CW - 6);
    const segH = Math.max(10, segLines.length * 4.2 + 7);

    // Verificar salto de página
    if (y + segH > 285) { doc.addPage(); y = 16; }

    doc.setFillColor(250, 247, 242);
    doc.rect(ML, y, CW, segH, 'F');
    doc.setFillColor(...COLOR_MUTED);
    doc.rect(ML, y, 2.5, segH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_MUTED);
    doc.text('SEGUIMIENTO DEL MENTOR', ML + 5, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXTO);
    doc.text(segLines, ML + 5, y + 8.5);

    y += segH + 6; // espacio entre personas

    // Línea separadora (excepto la última)
    if (idx < allMentorias.length - 1) {
      doc.setDrawColor(232, 226, 217);
      doc.setLineWidth(0.3);
      doc.line(ML, y - 3, ML + CW, y - 3);
    }
  });

  // ── Pie de página en cada página ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`Maby Mereles · Counselor — Holos Capital Counseling`, ML, 293);
    doc.text(`Página ${i} / ${totalPages}`, PW - ML, 293, { align: 'right' });
  }

  doc.save(`Mentorias_${today()}.pdf`);
  showToast('PDF exportado ✓');
});

/* ══════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════ */

/** Muestra un toast temporario */
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2800);
}

/** Codifica texto para URL de WhatsApp preservando emojis correctamente.
 *  encodeURIComponent sola rompe algunos emojis en WhatsApp Web.
 *  Esta función convierte el texto a UTF-8 manualmente.
 */
function encodeForWhatsApp(text) {
  return encodeURIComponent(text);
}

/** Formatea un número de teléfono para el enlace de WhatsApp
 *  Elimina espacios, guiones, paréntesis y el + inicial
 *  Ejemplo: "+54 11 4523-7891" → "541145237891"
 */
function formatPhone(phone) {
  return (phone || '').replace(/[\s\-\(\)\+]/g, '');
}

/** Formatea una fecha ISO a formato legible en español */
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Devuelve la fecha actual como string YYYYMMDD para nombres de archivo */
function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/* ══════════════════════════════════════════════
   INICIALIZACIÓN
══════════════════════════════════════════════ */
checkSession();
