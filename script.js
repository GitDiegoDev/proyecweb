// ==========================================
// CONFIGURACIÓN Y UTILIDADES
// ==========================================
const CONFIG = {
  DEBOUNCE_DELAY: 300,
  BACKUP_INTERVAL: 300000, // 5 minutos
  MAX_PRODUCTOS: 10000,
  MAX_MOVIMIENTOS: 50000,
  ITEMS_PER_PAGE: 50
};

const ICONS = {
  'Sillones':'🛋️','Mesas':'🪵','Sillas':'🪑','Espejos':'🪞','Cuadros':'🖼️',
  'Recibidores':'🚪','Muebles Artely':'🏢','Plantas':'🪴','Cristalería':'🍷',
  'Flores':'💐','Navidad':'🎄','Pascua':'🐰','Macetas':'🏺','Decoración':'🏺',
  'Individuales':'🍽️','Mesas Ratonas':'🛋️','Otro':'📦'
};

// ==========================================
// CAPA DE DATOS (Data Layer)
// ==========================================
const DataLayer = {
  get() {
    try {
      const raw = localStorage.getItem('deposito_data');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.productos) && Array.isArray(parsed.movimientos)) {
        return parsed;
      }
    } catch (e) {
      console.error('Error leyendo datos:', e);
    }
    return { productos: [], movimientos: [] };
  },

  save(data) {
    try {
      localStorage.setItem('deposito_data', JSON.stringify(data));
      EventBus.emit('data:changed', data);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast('⚠️ Almacenamiento lleno. Exportá y limpiá datos.', 'error');
      }
      return false;
    }
  },

  getProductById(id) {
    return this.get().productos.find(p => p.id === id);
  },

  getMovementsByProduct(id) {
    return this.get().movimientos.filter(m => m.productoId === id);
  },

  getStats() {
    const data = this.get();
    const totalProductos = data.productos.length;
    const totalUnidades = data.productos.reduce((a, p) => a + p.stock, 0);
    const critico = data.productos.filter(p => p.stock === 0).length;
    const bajo = data.productos.filter(p => p.stock > 0 && p.stock <= 2).length;
    return { totalProductos, totalUnidades, critico, bajo };
  }
};

// Event Bus simple
const EventBus = {
  events: {},
  on(event, cb) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(cb);
  },
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
};

// ==========================================
// UTILIDADES
// ==========================================
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

function normalizeText(text) {
  if (!text) return '';
  const map = {
    'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
    'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10'
  };
  let n = text.toLowerCase().trim();
  n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (let word in map) {
    n = n.replace(new RegExp(`\\b${word}\\b`, 'g'), map[word]);
  }
  return n.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function validateProducto(nombre, stock) {
  if (!nombre || nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres';
  if (nombre.length > 100) return 'El nombre es demasiado largo (máx 100)';
  if (isNaN(stock) || stock < 0) return 'El stock no puede ser negativo';
  if (stock > 99999) return 'Stock demasiado alto';
  return null;
}

function getStockStatus(stock) {
  if (stock === 0) return { class: 'qty-zero', label: 'Sin stock', color: 'var(--red)' };
  if (stock <= 2) return { class: 'qty-low', label: 'Stock crítico', color: '#f59e0b' };
  if (stock <= 5) return { class: 'qty-medium', label: 'Stock bajo', color: 'var(--blue)' };
  return { class: 'qty-good', label: 'OK', color: 'var(--green)' };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function toggleExpand(el) {
  el.classList.toggle('expanded');
}

// Debounce para búsqueda
let searchTimeout;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(renderStock, CONFIG.DEBOUNCE_DELAY);
}

// ==========================================
// AUDITORÍA
// ==========================================
function logAudit(action, details = {}) {
  try {
    const audit = JSON.parse(localStorage.getItem('deposito_audit') || '[]');
    audit.push({
      timestamp: new Date().toISOString(),
      action,
      details,
      userAgent: navigator.userAgent.substring(0, 50)
    });
    localStorage.setItem('deposito_audit', JSON.stringify(audit.slice(-500)));
  } catch (e) {}
}

// ==========================================
// BACKUP AUTOMÁTICO
// ==========================================
function createBackup() {
  const data = DataLayer.get();
  data._backupDate = new Date().toISOString();
  data._version = '2.0';
  localStorage.setItem('deposito_backup', JSON.stringify(data));
}

setInterval(createBackup, CONFIG.BACKUP_INTERVAL);
window.addEventListener('beforeunload', createBackup);

// ==========================================
// ESTADO GLOBAL
// ==========================================
let tipoMov = 'entrada';
let filtroMov = 'todos';
let filtrocat = 'todas';
let editId = null;
let currentPage = 0;

// ==========================================
// NAVEGACIÓN
// ==========================================
function showSection(name, el) {
  ['stock','movimientos','reportes','nuevo-producto'].forEach(s => {
    const section = document.getElementById('sec-'+s);
    if (s === name) {
      section.classList.remove('hidden');
      section.style.animation = 'fadeIn 0.4s ease';
    } else {
      section.classList.add('hidden');
    }
  });

  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  const fab = document.getElementById('fab-btn');
  fab.style.display = (name === 'nuevo-producto' || name === 'reportes') ? 'none' : 'flex';
  setTimeout(() => fab.classList.remove('hidden-fab'), 10);

  if (name !== 'nuevo-producto') resetForm();
  if (name === 'stock') { currentPage = 0; renderStock(); }
  if (name === 'movimientos') renderMovimientos();
  if (name === 'reportes') initFechas();
}

function resetForm() {
  editId = null;
  document.getElementById('np-nombre').value = '';
  document.getElementById('np-qty').value = '0';
  document.getElementById('np-qty').disabled = false;
  document.getElementById('np-notas').value = '';
  document.getElementById('np-cat').selectedIndex = 0;
  document.querySelector('#sec-nuevo-producto .btn-primary').textContent = '✓ Guardar Producto';
  document.querySelector('#sec-nuevo-producto .section-title').innerHTML = '<div class="dot"></div>Nuevo Producto';
}

// ==========================================
// TOASTS MEJORADOS
// ==========================================
function showToast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;

  const icons = { error: '❌', success: '✓', info: 'ℹ️', default: '' };
  t.innerHTML = `${icons[type] || ''} ${msg}`;

  setTimeout(() => t.classList.remove('show'), 3000);
}

// ==========================================
// RENDERIZADO DE STOCK
// ==========================================
function renderStock() {
  const data = DataLayer.get();
  const search = normalizeText(document.getElementById('search-stock').value || '');
  const list = document.getElementById('stock-list');

  // Actualizar stats
  const stats = DataLayer.getStats();
  document.getElementById('stat-productos').textContent = stats.totalProductos;
  document.getElementById('stat-unidades').textContent = stats.totalUnidades;
  document.getElementById('stat-critico').textContent = stats.critico;
  document.getElementById('stat-bajo').textContent = stats.bajo;

  // Filtros de categoría
  const cats = ['todas', ...new Set(data.productos.map(p => p.categoria))];
  document.getElementById('cat-filters').innerHTML = cats.map((c, i) => `
    <button class="filter-chip ${c === filtrocat ? 'active' : ''}"
      onclick="filtrocat='${c}';renderStock()" style="animation: fadeIn 0.3s ${i*0.05}s both">
      ${c === 'todas' ? 'Todas' : c}</button>`).join('');

  // Filtrar productos
  let prods = data.productos.filter(p => {
    const nameNorm = normalizeText(p.nombre);
    const notesNorm = normalizeText(p.notas || '');
    return (nameNorm.includes(search) || notesNorm.includes(search)) &&
           (filtrocat === 'todas' || p.categoria === filtrocat);
  });

  if (!prods.length) {
    list.innerHTML = `<div class="empty">
      <div class="empty-icon">📭</div>
      Sin productos${search ? ' para esta búsqueda' : ''}.<br>
      ${!search ? 'Usá "+ Producto" para agregar.' : ''}
    </div>`;
    return;
  }

  // Paginación virtual para rendimiento
  const start = currentPage * CONFIG.ITEMS_PER_PAGE;
  const end = start + CONFIG.ITEMS_PER_PAGE;
  const visible = prods.slice(start, end);

  if (filtrocat === 'todas' && !search) {
    // Agrupar por categoría
    const grouped = {};
    visible.forEach(p => {
      if (!grouped[p.categoria]) grouped[p.categoria] = [];
      grouped[p.categoria].push(p);
    });

    list.innerHTML = Object.keys(grouped).map(cat => `
      <div class="cat-group-title">${ICONS[cat] || ''} ${cat}</div>
      ${grouped[cat].map((p, i) => renderStockItem(p, i)).join('')}
    `).join('');
  } else {
    list.innerHTML = visible.map((p, i) => renderStockItem(p, i)).join('');
  }

  // Indicador de más páginas
  if (prods.length > end) {
    list.innerHTML += `<div style="text-align:center;padding:20px;">
      <button class="btn btn-ghost btn-sm" onclick="currentPage++;renderStock()">Ver más (${prods.length - end} restantes)</button>
    </div>`;
  }
}

function renderStockItem(p, i) {
  const status = getStockStatus(p.stock);
  return `
    <div class="stock-item" style="animation-delay: ${i*0.03}s" onclick="toggleExpand(this)">
      <div class="stock-icon">${ICONS[p.categoria] || '📦'}</div>
      <div class="stock-info">
        <div class="stock-name">${p.nombre}</div>
        <div class="stock-cat">${p.categoria}</div>
        <div class="stock-notes">${p.notas || ''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px" onclick="event.stopPropagation()">
        <div class="stock-qty" title="${status.label}">
          <div class="qty-num ${status.class}">${p.stock}</div>
          <div class="qty-label">uds</div>
        </div>
        <button class="delete-btn edit" onclick="prepararEdicion('${p.id}')" title="Editar">✏️</button>
        <button class="delete-btn" onclick="eliminarProducto('${p.id}')" title="Eliminar">🗑</button>
      </div>
    </div>`;
}

// ==========================================
// RENDERIZADO DE MOVIMIENTOS
// ==========================================
function renderMovimientos() {
  const data = DataLayer.get();
  const list = document.getElementById('mov-list');
  let movs = [...data.movimientos];

  if (filtroMov !== 'todos') {
    if (filtroMov === 'entrada' || filtroMov === 'salida') {
      movs = movs.filter(m => m.tipo === filtroMov);
    } else {
      movs = movs.filter(m => m.sucursal === filtroMov);
    }
  }

  movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (!movs.length) {
    list.innerHTML = `<div class="empty">
      <div class="empty-icon">🕒</div>
      Sin movimientos registrados.
    </div>`;
    return;
  }

  list.innerHTML = movs.slice(0, 100).map((m, i) => `
    <div class="move-item" style="animation-delay: ${i*0.02}s">
      <div class="move-header">
        <div class="move-product">${m.productoNombre}</div>
        <div class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↓ Entrada' : '↑ Salida'}</div>
      </div>
      <div class="move-detail">
        <span>📅 ${formatDate(m.fecha)}</span>
        <span>🔢 Cant: ${m.cantidad}</span>
        ${m.tipo === 'salida' ? `<span>📍 ${m.sucursal}</span>` : ''}
        ${m.nota ? `<span>📝 ${m.nota}</span>` : ''}
      </div>
    </div>
  `).join('');

  if (movs.length > 100) {
    list.innerHTML += `<div style="text-align:center;padding:20px;color:var(--muted);font-family:Space Mono;font-size:12px;">
      Mostrando últimos 100 de ${movs.length} movimientos
    </div>`;
  }
}

function filterMov(f, el) {
  filtroMov = f;
  document.querySelectorAll('#mov-filters .filter-chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderMovimientos();
}

// ==========================================
// FORMULARIOS
// ==========================================
function initFechas() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('rango-hasta').value = hoy;
  const mesPasado = new Date();
  mesPasado.setMonth(mesPasado.getMonth() - 1);
  document.getElementById('rango-desde').value = mesPasado.toISOString().split('T')[0];

  const data = DataLayer.get();
  const cats = [...new Set(data.productos.map(p => p.categoria))].sort();
  const select = document.getElementById('reporte-stock-cat');
  const currentVal = select.value;
  select.innerHTML = '<option value="Todas">Todas las categorías</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if ([...select.options].some(o => o.value === currentVal)) {
    select.value = currentVal;
  }
}

// ==========================================
// CRUD PRODUCTOS
// ==========================================
function agregarProducto() {
  const nombre = sanitizeInput(document.getElementById('np-nombre').value);
  const categoria = document.getElementById('np-cat').value;
  const stock = parseInt(document.getElementById('np-qty').value) || 0;
  const notas = sanitizeInput(document.getElementById('np-notas').value);

  const error = validateProducto(nombre, stock);
  if (error) { showToast(error, 'error'); return; }

  const data = DataLayer.get();

  if (editId) {
    const p = data.productos.find(prod => prod.id === editId);
    if (p) {
      const oldName = p.nombre;
      p.nombre = nombre;
      p.categoria = categoria;
      p.notas = notas;
      logAudit('edit_producto', { id: editId, oldName, newName: nombre });
    }
    showToast('✓ Producto actualizado', 'success');
  } else {
    if (data.productos.length >= CONFIG.MAX_PRODUCTOS) {
      showToast('Límite de productos alcanzado', 'error');
      return;
    }

    const nuevo = {
      id: generateId(),
      nombre, categoria, stock, notas,
      fechaCreado: new Date().toISOString()
    };
    data.productos.push(nuevo);

    if (stock > 0) {
      data.movimientos.push({
        id: generateId(),
        productoId: nuevo.id,
        productoNombre: nuevo.nombre,
        tipo: 'entrada',
        cantidad: stock,
        fecha: new Date().toISOString(),
        nota: 'Carga inicial'
      });
    }

    logAudit('create_producto', { id: nuevo.id, nombre });
    showToast('✓ Producto guardado', 'success');
  }

  DataLayer.save(data);
  showSection('stock', document.querySelector('nav button:first-child'));
}

function eliminarProducto(id) {
  const data = DataLayer.get();
  const p = data.productos.find(prod => prod.id === id);
  if (!p) return;

  if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;

  data.productos = data.productos.filter(prod => prod.id !== id);
  DataLayer.save(data);
  logAudit('delete_producto', { id, nombre: p.nombre });
  renderStock();
  showToast('🗑 Producto eliminado', 'info');
}

function prepararEdicion(id) {
  const p = DataLayer.getProductById(id);
  if (!p) return;

  editId = id;
  document.getElementById('np-nombre').value = p.nombre;
  document.getElementById('np-cat').value = p.categoria;
  document.getElementById('np-qty').value = p.stock;
  document.getElementById('np-qty').disabled = true;
  document.getElementById('np-notas').value = p.notas || '';

  const btn = document.querySelector('#sec-nuevo-producto .btn-primary');
  btn.textContent = '✓ Guardar Cambios';
  document.querySelector('#sec-nuevo-producto .section-title').innerHTML = '<div class="dot"></div>Editar Producto';

  showSection('nuevo-producto');
}

// ==========================================
// MODAL MOVIMIENTOS
// ==========================================
function openModal() {
  const data = DataLayer.get();
  const select = document.getElementById('mov-producto');
  if (!data.productos.length) { showToast('No hay productos registrados', 'error'); return; }

  // Solo mostrar productos con stock para salidas
  const opciones = data.productos.map(p =>
    `<option value="${p.id}">${p.nombre} (${p.stock} uds)</option>`
  ).join('');

  select.innerHTML = opciones;
  updateMovDesc();
  document.getElementById('modal-mov').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function updateMovDesc() {
  const prodId = document.getElementById('mov-producto').value;
  const prod = DataLayer.getProductById(prodId);
  const descEl = document.getElementById('mov-desc');
  if (prod) {
    descEl.textContent = prod.notas || 'Sin descripción';
  } else {
    descEl.textContent = '';
  }
}

function closeModal() {
  document.getElementById('modal-mov').classList.remove('open');
  document.body.style.overflow = '';
}

function setTipoMov(t) {
  tipoMov = t;
  document.getElementById('tab-entrada').classList.toggle('active-entrada', t === 'entrada');
  document.getElementById('tab-salida').classList.toggle('active-salida', t === 'salida');
  document.getElementById('grupo-sucursal').style.display = t === 'salida' ? 'block' : 'none';

  const btn = document.getElementById('btn-confirmar-mov');
  btn.className = t === 'entrada' ? 'btn btn-entrada' : 'btn btn-salida';
  btn.textContent = t === 'entrada' ? '✓ Confirmar Entrada' : '✓ Confirmar Salida';
}

function confirmarMovimiento() {
  const prodId = document.getElementById('mov-producto').value;
  const cantidad = parseInt(document.getElementById('mov-qty').value);
  const sucursal = document.getElementById('mov-sucursal').value;
  const nota = sanitizeInput(document.getElementById('mov-nota').value);

  if (isNaN(cantidad) || cantidad <= 0) { showToast('Cantidad inválida', 'error'); return; }
  if (cantidad > 99999) { showToast('Cantidad demasiado alta', 'error'); return; }

  const data = DataLayer.get();
  const prod = data.productos.find(p => p.id === prodId);
  if (!prod) { showToast('Producto no encontrado', 'error'); return; }

  if (tipoMov === 'salida') {
    if (prod.stock < cantidad) {
      showToast(`Stock insuficiente. Disponible: ${prod.stock}`, 'error');
      return;
    }
    // Confirmación para salidas grandes
    if (cantidad > prod.stock * 0.5 && prod.stock > 5) {
      if (!confirm(`⚠️ Estás sacando ${cantidad} de ${prod.stock} unidades de "${prod.nombre}". ¿Confirmar?`)) {
        return;
      }
    }
  }

  prod.stock += (tipoMov === 'entrada' ? cantidad : -cantidad);

  data.movimientos.push({
    id: generateId(),
    productoId: prodId,
    productoNombre: prod.nombre,
    tipo: tipoMov,
    cantidad: cantidad,
    sucursal: tipoMov === 'salida' ? sucursal : null,
    nota: nota,
    fecha: new Date().toISOString()
  });

  DataLayer.save(data);
  logAudit(tipoMov, { productoId: prodId, cantidad, sucursal });

  closeModal();
  renderStock();
  renderMovimientos();
  showToast(`✓ ${tipoMov === 'entrada' ? 'Entrada' : 'Salida'} registrada`, 'success');

  document.getElementById('mov-qty').value = '1';
  document.getElementById('mov-nota').value = '';
}

// ==========================================
// EXPORTACIONES
// ==========================================
function exportarStockActual() {
  const data = DataLayer.get();
  const cat = document.getElementById('reporte-stock-cat').value;

  let filteredProds = data.productos;
  let filename = "Stock_Actual.xlsx";

  if (cat !== 'Todas') {
    filteredProds = data.productos.filter(p => p.categoria === cat);
    filename = `Stock_${cat}.xlsx`;
  }

  const rows = filteredProds.map(p => ({
    Producto: p.nombre,
    Cantidad: p.stock
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  XLSX.writeFile(wb, filename);
  showToast('📊 Stock exportado', 'success');
}

function exportarMovimientos() {
  const data = DataLayer.get();
  const desde = new Date(document.getElementById('rango-desde').value);
  const hasta = new Date(document.getElementById('rango-hasta').value);
  hasta.setHours(23,59,59);

  if (isNaN(desde) || isNaN(hasta)) {
    showToast('Fechas inválidas', 'error');
    return;
  }

  const filtrados = data.movimientos.filter(m => {
    const d = new Date(m.fecha);
    return d >= desde && d <= hasta;
  });

  const rows = filtrados.map(m => ({
    Fecha: formatDate(m.fecha),
    Tipo: m.tipo.toUpperCase(),
    Producto: m.productoNombre,
    Cantidad: m.cantidad,
    Destino: m.sucursal || '-',
    Nota: m.nota || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
  XLSX.writeFile(wb, `Movimientos_${document.getElementById('rango-desde').value}_al_${document.getElementById('rango-hasta').value}.xlsx`);
  showToast('📊 Movimientos exportados', 'success');
}

function exportarCompleto() {
  const data = DataLayer.get();
  const wb = XLSX.utils.book_new();

  const sRows = data.productos.map(p => ({
    Producto: p.nombre, Cantidad: p.stock
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sRows), "Stock Actual");

  const mRows = data.movimientos.map(m => ({
    Fecha: formatDate(m.fecha), Tipo: m.tipo, Producto: m.productoNombre,
    Cantidad: m.cantidad, Destino: m.sucursal || '-'
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mRows), "Todos los Movimientos");

  // Resumen por sucursal
  const sucursales = ['Aristóbulo', 'Oberá', 'San Vicente'];
  const resumen = sucursales.map(s => {
    const total = data.movimientos
      .filter(m => m.sucursal === s && m.tipo === 'salida')
      .reduce((a, m) => a + m.cantidad, 0);
    return { Sucursal: s, 'Total Enviado': total };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen Sucursales");

  XLSX.writeFile(wb, "Reporte_Completo_Deposito.xlsx");
  showToast('📊 Reporte completo exportado', 'success');
}

function exportarSucursales() {
  const data = DataLayer.get();
  const wb = XLSX.utils.book_new();
  const sucursales = ['Aristóbulo', 'Oberá', 'San Vicente'];

  sucursales.forEach(s => {
    const filtrados = data.movimientos.filter(m => m.sucursal === s);
    const rows = filtrados.map(m => ({
      Fecha: formatDate(m.fecha),
      Producto: m.productoNombre,
      Cantidad: m.cantidad,
      Nota: m.nota || ''
    }));
    if (rows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), s);
    }
  });

  if (wb.SheetNames.length === 0) {
    showToast('No hay envíos a sucursales todavía', 'info');
    return;
  }
  XLSX.writeFile(wb, "Envios_a_Sucursales.xlsx");
  showToast('📊 Sucursales exportadas', 'success');
}

// ==========================================
// BACKUP Y RESTAURACIÓN
// ==========================================
function exportarBackup() {
  const data = DataLayer.get();
  const backup = {
    version: '2.0',
    fecha: new Date().toISOString(),
    datos: data
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deposito_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Respaldo descargado', 'success');
}

function importarBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.datos || !Array.isArray(backup.datos.productos)) {
          throw new Error('Formato inválido');
        }

        if (confirm(`¿Restaurar respaldo del ${new Date(backup.fecha).toLocaleDateString()}? Esto reemplazará todos los datos actuales.`)) {
          DataLayer.save(backup.datos);
          renderStock();
          showToast('✓ Datos restaurados', 'success');
          logAudit('restore_backup', { fecha: backup.fecha });
        }
      } catch (err) {
        showToast('❌ Archivo inválido', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-ES', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Prevenir zoom en inputs en iOS
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Render inicial
renderStock();

// Log de inicio
logAudit('app_start');
