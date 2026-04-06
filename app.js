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
const statSeguimiento= document.getElementById('stat-seguimiento');
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
    .select('*')
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
  // Filtrar
  let list = allMentorias.filter(m => {
    const matchFilter = currentFilter === 'all' || m.estado === currentFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      (m.nombre + ' ' + m.apellido).toLowerCase().includes(term) ||
      (m.email || '').toLowerCase().includes(term) ||
      (m.telefono || '').includes(term);
    return matchFilter && matchSearch;
  });

  // Limpiar tarjetas
  cardsGrid.querySelectorAll('.mentoria-card').forEach(c => c.remove());

  // Actualizar stats (siempre sobre el total completo)
  updateStats();

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Renderizar cada tarjeta
  list.forEach(m => cardsGrid.appendChild(buildCard(m)));
}

/** Construye el elemento DOM de una tarjeta */
function buildCard(m) {
  const card = document.createElement('div');
  card.className = 'mentoria-card';
  card.dataset.id = m.id;

  const initials = `${(m.nombre || '?')[0]}${(m.apellido || '?')[0]}`.toUpperCase();
  const statusClass = `status-${m.estado}`;
  const statusLabel = m.estado || '—';

  // Formatear fechas legibles
  const fechaUltimo = m.fecha_ultimo_contacto
    ? formatDate(m.fecha_ultimo_contacto)
    : null;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-avatar">${initials}</div>
      <div class="card-info">
        <div class="card-name">${m.nombre} ${m.apellido}</div>
        <div class="card-email">${m.email || m.telefono || '—'}</div>
      </div>
      <span class="card-status ${statusClass}">${statusLabel}</span>
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
    ${m.oficio ? `<div class="card-oficio">💼 ${m.oficio}</div>` : ''}
  `;

  card.addEventListener('click', () => openDetail(m.id));
  return card;
}

/** Actualiza los números del dashboard */
function updateStats() {
  statTotal.textContent = allMentorias.length;
  statActiva.textContent = allMentorias.filter(m => m.estado === 'Mentoría activa').length;
  statSeguimiento.textContent = allMentorias.filter(m => m.estado === 'Seguimiento').length;
  statSinResp.textContent = allMentorias.filter(m => m.estado === 'Sin respuesta').length;
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
  ['form-id','form-nombre','form-apellido','form-telefono','form-email',
   'form-fecha-primer','form-fecha-ultimo','form-respondio','form-tipo-contacto',
   'form-oficio','form-inquietudes','form-respuesta','form-observaciones','form-estado']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  document.getElementById('form-estado').value = 'Sin respuesta';
}

/** Rellena el formulario con los datos de una mentoría */
function fillForm(m) {
  document.getElementById('form-id').value = m.id;
  document.getElementById('form-nombre').value = m.nombre || '';
  document.getElementById('form-apellido').value = m.apellido || '';
  document.getElementById('form-telefono').value = m.telefono || '';
  document.getElementById('form-email').value = m.email || '';
  document.getElementById('form-fecha-primer').value = m.fecha_primer_contacto || '';
  document.getElementById('form-fecha-ultimo').value = m.fecha_ultimo_contacto || '';
  document.getElementById('form-respondio').value = m.respondio || '';
  document.getElementById('form-tipo-contacto').value = m.tipo_contacto || '';
  document.getElementById('form-oficio').value = m.oficio || '';
  document.getElementById('form-inquietudes').value = m.inquietudes || '';
  document.getElementById('form-respuesta').value = m.respuesta_mentor || '';
  document.getElementById('form-observaciones').value = m.observaciones || '';
  document.getElementById('form-estado').value = m.estado || 'Sin respuesta';
}

/** Lee los valores del formulario y devuelve un objeto */
function readForm() {
  return {
    nombre:               document.getElementById('form-nombre').value.trim(),
    apellido:             document.getElementById('form-apellido').value.trim(),
    telefono:             document.getElementById('form-telefono').value.trim(),
    email:                document.getElementById('form-email').value.trim(),
    fecha_primer_contacto:document.getElementById('form-fecha-primer').value || null,
    fecha_ultimo_contacto:document.getElementById('form-fecha-ultimo').value || null,
    respondio:            document.getElementById('form-respondio').value || null,
    tipo_contacto:        document.getElementById('form-tipo-contacto').value || null,
    oficio:               document.getElementById('form-oficio').value.trim() || null,
    inquietudes:          document.getElementById('form-inquietudes').value.trim() || null,
    respuesta_mentor:     document.getElementById('form-respuesta').value.trim() || null,
    observaciones:        document.getElementById('form-observaciones').value.trim() || null,
    estado:               document.getElementById('form-estado').value,
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
  const val = (v) => v
    ? `<span>${v}</span>`
    : `<span class="empty-val">—</span>`;

  body.innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Estado</div>
      <span class="card-status status-${m.estado}" style="display:inline-block;margin-bottom:6px">${m.estado || '—'}</span>
    </div>

    <div class="detail-section">
      <div class="detail-section-title-row">
        <span class="detail-section-title" style="margin-bottom:0;border:none">Mensaje de primer contacto</span>
        <div style="display:flex;gap:6px">
          <button class="btn-copy-msg" id="btn-copy-msg" title="Copiar mensaje">
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
        : `<div class="btn-whatsapp-disabled">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="opacity:.4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Sin número de teléfono cargado
           </div>`
      }
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Datos de contacto</div>
      <div class="detail-row">
        <div class="detail-item"><label>Teléfono</label>${val(m.telefono)}</div>
        <div class="detail-item"><label>Email</label>${val(m.email)}</div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Historial de contacto</div>
      <div class="detail-row">
        <div class="detail-item"><label>Primer contacto</label>${val(m.fecha_primer_contacto ? formatDate(m.fecha_primer_contacto) : null)}</div>
        <div class="detail-item"><label>Último contacto</label>${val(m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : null)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-item"><label>¿Respondió?</label>${val(m.respondio)}</div>
        <div class="detail-item"><label>Tipo de contacto</label>${val(m.tipo_contacto)}</div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Información de la persona</div>
      <div class="detail-item" style="margin-bottom:10px"><label>Oficio / Profesión</label>${val(m.oficio)}</div>
      <div class="detail-item">
        <label>Inquietudes</label>
        ${m.inquietudes
          ? `<div class="detail-text-block">${m.inquietudes}</div>`
          : `<span class="empty-val">—</span>`}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Seguimiento del mentor</div>
      <div class="detail-item" style="margin-bottom:10px">
        <label>Respuesta dada</label>
        ${m.respuesta_mentor
          ? `<div class="detail-text-block">${m.respuesta_mentor}</div>`
          : `<span class="empty-val">—</span>`}
      </div>
      <div class="detail-item">
        <label>Observaciones</label>
        ${m.observaciones
          ? `<div class="detail-text-block">${m.observaciones}</div>`
          : `<span class="empty-val">—</span>`}
      </div>
    </div>
  `;

  modalDetail.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Botón copiar mensaje
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
    } catch {
      showToast('No se pudo copiar. Seleccioná el texto manualmente.');
    }
  });

  // Botón WhatsApp: lee mensajeGlobal EN EL MOMENTO del click
  // así siempre usa el mensaje actualizado, sin importar cuándo se abrió el modal
  const btnWA = document.getElementById('btn-whatsapp');
  if (btnWA) {
    btnWA.addEventListener('click', () => {
      const phone = btnWA.dataset.phone;
      const url = `https://wa.me/${phone}?text=${encodeForWhatsApp(mensajeGlobal)}`;
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
   EXPORTACIÓN
══════════════════════════════════════════════ */

/** Exporta a Excel (.xlsx) usando SheetJS */
document.getElementById('btn-export-excel').addEventListener('click', () => {
  if (!allMentorias.length) { showToast('No hay datos para exportar.'); return; }

  const headers = [
    'Nombre','Apellido','Teléfono','Email',
    'Fecha 1er contacto','Respondió','Tipo de contacto',
    'Fecha último contacto','Oficio','Inquietudes',
    'Respuesta del mentor','Observaciones','Estado'
  ];

  const rows = allMentorias.map(m => [
    m.nombre, m.apellido, m.telefono, m.email,
    m.fecha_primer_contacto, m.respondio, m.tipo_contacto,
    m.fecha_ultimo_contacto, m.oficio, m.inquietudes,
    m.respuesta_mentor, m.observaciones, m.estado
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Ancho de columnas
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mentorías');
  XLSX.writeFile(wb, `Mentorias_${today()}.xlsx`);
  showToast('Excel exportado ✓');
});

/** Exporta a PDF usando jsPDF + autotable */
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  if (!allMentorias.length) { showToast('No hay datos para exportar.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Registro de Mentorías — Maby Mereles', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Exportado: ${new Date().toLocaleDateString('es-AR')}`, 14, 22);

  const columns = [
    'Nombre','Apellido','Teléfono','Email',
    'Primer contacto','Respondió','Tipo contacto',
    'Último contacto','Oficio','Estado'
  ];

  const rows = allMentorias.map(m => [
    m.nombre, m.apellido, m.telefono || '—', m.email || '—',
    m.fecha_primer_contacto ? formatDate(m.fecha_primer_contacto) : '—',
    m.respondio || '—', m.tipo_contacto || '—',
    m.fecha_ultimo_contacto ? formatDate(m.fecha_ultimo_contacto) : '—',
    m.oficio || '—', m.estado
  ]);

  doc.autoTable({
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [107, 154, 100], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 241, 235] },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 22 } },
  });

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
