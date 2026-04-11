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
let allMentorias = [];       // Todos los registros cargados
let currentFilter = 'all';   // Filtro activo
let searchTerm = '';         // Término de búsqueda
let editingId = null;        // ID del registro en edición
let currentDetailId = null;  // ID del registro en vista detalle
let mensajeGlobal = MENSAJE_BIENVENIDA_DEFAULT; // Mensaje global editable

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
// Modal configuración mensaje global
const btnConfig      = document.getElementById('btn-config');
const modalConfig    = document.getElementById('modal-config');
const configClose    = document.getElementById('config-close');
const configCancel   = document.getElementById('config-cancel');
const configSave     = document.getElementById('config-save');
const configMensaje  = document.getElementById('config-mensaje');
const btnConfigReset = document.getElementById('btn-config-reset');

// Estadísticas
const statTotal      = document.getElementById('stat-total');
const statActiva     = document.getElementById('stat-activa');
const statRespondio  = document.getElementById('stat-respondio');
const statSinResp    = document.getElementById('stat-sin-resp');

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

/** Carga todas las mentorías de la BD */
async function loadMentorias() {
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');

  // Limpiamos tarjetas anteriores (sin los estados)
  const oldCards = cardsGrid.querySelectorAll('.mentoria-card');
  oldCards.forEach(c => c.remove());

  const { data, error } = await db
    .from('mentorias')
    .select('id, created_at, nombre, apellido, telefono, fecha_primer_contacto, respondio, tipo_contacto, fecha_ultimo_contacto, mentoria_activa, inquietudes, seguimiento_mentor')
    .order('created_at', { ascending: false });

  loadingState.classList.add('hidden');

  if (error) {
    showToast('Error al cargar datos.');
    console.error(error);
    return;
  }

  allMentorias = data || [];
  renderAll();
}

/* ══════════════════════════════════════════════
   RENDERIZADO
══════════════════════════════════════════════ */

/** Aplica filtros + búsqueda y renderiza las tarjetas */
function renderAll() {
  let list = allMentorias.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      (m.nombre + ' ' + m.apellido).toLowerCase().includes(term) ||
      (m.telefono || '').includes(term);
    let matchFilter = true;
    if (currentFilter === 'activa')       matchFilter = m.mentoria_activa === true;
    if (currentFilter === 'respondio-si') matchFilter = m.respondio === 'Sí';
    if (currentFilter === 'respondio-no') matchFilter = m.respondio === 'No' || !m.respondio;
    return matchFilter && matchSearch;
  });

  cardsGrid.querySelectorAll('.mentoria-card').forEach(c => c.remove());
  updateStats();

  if (list.length === 0) { emptyState.classList.remove('hidden'); return; }
  emptyState.classList.add('hidden');
  list.forEach(m => cardsGrid.appendChild(buildCard(m)));
}

/** Construye el elemento DOM de una tarjeta */
function buildCard(m) {
  const card = document.createElement('div');
  card.className = 'mentoria-card';
  card.dataset.id = m.id;

  const initials = `${(m.nombre || '?')[0]}${(m.apellido || '?')[0]}`.toUpperCase();
  const activa = m.mentoria_activa === true;
  const fechaUltimo = m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : null;

  // Preview de seguimiento: primeras 100 letras, limpiando saltos de línea
  const seg = (m.seguimiento_mentor || '').trim();
  const seguimientoPreview = seg.length > 0
    ? seg.replace(/\n+/g, ' · ').slice(0, 100) + (seg.length > 100 ? '…' : '')
    : null;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-avatar">${initials}</div>
      <div class="card-info">
        <div class="card-name">${m.nombre} ${m.apellido}</div>
        <div class="card-email">${m.telefono || '—'}</div>
      </div>
      <span class="card-badge-activa ${activa ? 'activa-si' : 'activa-no'}">
        ${activa
          ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Activa`
          : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg> Inactiva`}
      </span>
    </div>
    <div class="card-meta">
      ${m.tipo_contacto ? `
      <span class="card-meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.91-1.91a2 2 0 0 1 2.11-.45c.9.374 1.852.63 2.82.7A2 2 0 0 1 21.5 15.09v3-.17z"/></svg>
        ${m.tipo_contacto}
      </span>` : ''}
      ${m.respondio ? `
      <span class="card-meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>
        Respondió: ${m.respondio}
      </span>` : ''}
      ${fechaUltimo ? `
      <span class="card-meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${fechaUltimo}
      </span>` : ''}
    </div>
    ${seguimientoPreview ? `<div class="card-seguimiento-preview">${seguimientoPreview}</div>` : ''}
  `;

  card.addEventListener('click', () => openDetail(m.id));
  return card;
}

/** Actualiza los números del dashboard */
function updateStats() {
  statTotal.textContent = allMentorias.length;
  statActiva.textContent = allMentorias.filter(m => m.mentoria_activa === true).length;
  statRespondio.textContent = allMentorias.filter(m => m.respondio === 'Sí').length;
  statSinResp.textContent = allMentorias.filter(m => m.respondio === 'No' || !m.respondio).length;
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
  document.getElementById('form-activa').checked = false;
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
  document.getElementById('form-activa').checked      = m.mentoria_activa === true;
  document.getElementById('form-inquietudes').value   = m.inquietudes || '';
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
    mentoria_activa:      document.getElementById('form-activa').checked,
    inquietudes:          document.getElementById('form-inquietudes').value.trim() || null,
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
    <div class="detail-section">
      <div class="detail-section-title-row">
        <span class="detail-section-title" style="margin-bottom:0;border:none">Mensaje de primer contacto</span>
        <div style="display:flex;gap:6px">
          <button class="btn-copy-msg" id="btn-copy-msg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copiar
          </button>
        </div>
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

    <div class="detail-section">
      <div class="detail-section-title">Estado de mentoría</div>
      <div class="detail-activa-badge ${activa ? 'activa-si' : 'activa-no'}">
        ${activa
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Mentoría activa`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Mentoría inactiva`}
      </div>
    </div>

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

    <div class="detail-section">
      <div class="detail-section-title">Inquietudes del estudiante</div>
      ${(m.inquietudes || '').trim()
        ? `<div class="detail-text-block">${m.inquietudes.trim()}</div>`
        : `<span class="empty-val">Sin registrar</span>`}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Seguimiento del mentor</div>
      ${(m.seguimiento_mentor || '').trim()
        ? `<div class="detail-text-block detail-seguimiento">${m.seguimiento_mentor.trim()}</div>`
        : `<span class="empty-val">Sin registrar</span>`}
    </div>
  `;

  modalDetail.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

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
    'Último contacto', 'Mentoría activa',
    'Inquietudes del estudiante', 'Seguimiento del mentor'
  ];

  const rows = allMentorias.map(m => [
    m.nombre, m.apellido, m.telefono || '—',
    m.fecha_primer_contacto ? formatDate(m.fecha_primer_contacto) : '—',
    m.respondio || '—',
    m.tipo_contacto || '—',
    m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : '—',
    m.mentoria_activa ? 'Sí' : 'No',
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

    // Badge mentoría activa — sin caracteres especiales para evitar encoding issues
    const badgeLabel = activa ? 'ACTIVA' : 'INACTIVA';
    const badgeColor = activa ? [144, 196, 138] : [180, 170, 160];
    const badgeW = activa ? 16 : 20;
    const badgeX = ML + CW - badgeW - 2;
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
