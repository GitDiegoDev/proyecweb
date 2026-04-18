function getData() {
  try { return JSON.parse(localStorage.getItem('deposito_data') || '{"productos":[],"movimientos":[]}'); }
  catch { return { productos: [], movimientos: [] }; }
}
function saveData(d) { localStorage.setItem('deposito_data', JSON.stringify(d)); }

let tipoMov = 'entrada', filtroMov = 'todos', filtrocat = 'todas', editId = null;

const subcategorias = {
  'Sillones': ['Sillones individuales'],
  'Mesas': ['Mesas ratonas o de centro', 'Mesa de apoyo'],
  'Muebles Artely': ['Mesas ratonas o de centro', 'Mesa de apoyo']
};

function updateSubcats() {
  const cat = document.getElementById('np-cat').value;
  const subcatGroup = document.getElementById('subcat-group');
  const subcatSelect = document.getElementById('np-subcat');

  if (subcategorias[cat]) {
    subcatSelect.innerHTML = '<option value="">(Ninguna)</option>' +
      subcategorias[cat].map(s => `<option value="${s}">${s}</option>`).join('');
    subcatGroup.style.display = 'block';
  } else {
    subcatSelect.innerHTML = '';
    subcatGroup.style.display = 'none';
  }
}

function normalizeText(text) {
  if (!text) return '';
  const map = {
    'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
    'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10'
  };
  let n = text.toLowerCase().trim();
  for (let word in map) {
    n = n.replace(new RegExp(`\\b${word}\\b`, 'g'), map[word]);
  }
  return n;
}

function showSection(name, el) {
  ['stock','movimientos','reportes','nuevo-producto'].forEach(s =>
    document.getElementById('sec-'+s).classList.add('hidden'));
  document.getElementById('sec-'+name).classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('fab-btn').style.display =
    (name==='nuevo-producto'||name==='reportes') ? 'none' : 'flex';

  if (name !== 'nuevo-producto') {
    editId = null;
    document.getElementById('np-nombre').value = '';
    document.getElementById('np-qty').value = '0';
    document.getElementById('np-qty').disabled = false;
    document.getElementById('np-notas').value = '';
    document.getElementById('np-cat').selectedIndex = 0;
    updateSubcats();
    document.querySelector('#sec-nuevo-producto .btn-primary').textContent = '✓ Guardar Producto';
    document.querySelector('#sec-nuevo-producto .section-title').innerHTML = '<div class="dot"></div>Nuevo Producto';
  }

  if (name==='stock') renderStock();
  if (name==='movimientos') renderMovimientos();
  if (name==='reportes') initFechas();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function renderStock() {
  const data = getData();
  const search = normalizeText(document.getElementById('search-stock').value || '');
  const list = document.getElementById('stock-list');
  const icons = {
    'Sillones':'🛋️','Mesas':'🪵','Sillas':'🪑','Espejos':'🪞','Cuadros':'🖼️',
    'Recibidores':'🚪','Muebles Artely':'🏢','Plantas':'🪴','Cristalería':'🍷',
    'Flores':'💐','Navidad':'🎄','Pascua':'🐰','Macetas':'🏺','Decoración':'🏺',
    'Otro':'📦'
  };

  const cats = ['todas',...new Set(data.productos.map(p=>p.categoria))];
  document.getElementById('cat-filters').innerHTML = cats.map(c=>`
    <button class="filter-chip ${c===filtrocat?'active':''}"
      onclick="filtrocat='${c}';renderStock()">
      ${c==='todas'?'Todas':c}</button>`).join('');

  let prods = data.productos.filter(p=> {
    const nameNorm = normalizeText(p.nombre);
    const notesNorm = normalizeText(p.notas || '');
    const matchesSearch = nameNorm.includes(search) || notesNorm.includes(search);
    return matchesSearch && (filtrocat === 'todas' || p.categoria === filtrocat);
  });

  document.getElementById('stat-productos').textContent = data.productos.length;
  document.getElementById('stat-unidades').textContent = data.productos.reduce((a,p)=>a+p.stock,0);

  if (!prods.length) { list.innerHTML=`<div class="empty"><div class="empty-icon">📭</div>Sin productos.<br>Usá "+ Producto" para agregar.</div>`; return; }

  list.innerHTML = prods.map(p=>`
    <div class="stock-item">
      <div class="stock-icon">${icons[p.categoria]||'📦'}</div>
      <div class="stock-info">
        <div class="stock-name">${p.nombre}</div>
        <div class="stock-cat">${p.categoria}${p.subcategoria?' ('+p.subcategoria+')':''}${p.notas?' · '+p.notas.substring(0,30):''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="stock-qty">
          <div class="qty-num ${p.stock<=2?'qty-low':''}">${p.stock}</div>
          <div class="qty-label">uds</div>
        </div>
        <button class="delete-btn" style="color:var(--blue)" onclick="prepararEdicion('${p.id}')">✏️</button>
        <button class="delete-btn" onclick="eliminarProducto('${p.id}')">🗑</button>
      </div>
    </div>`).join('');
}

function renderMovimientos() {
  const data = getData();
  const list = document.getElementById('mov-list');
  let movs = data.movimientos;

  if (filtroMov !== 'todos') {
    if (filtroMov === 'entrada' || filtroMov === 'salida') {
      movs = movs.filter(m => m.tipo === filtroMov);
    } else {
      movs = movs.filter(m => m.sucursal === filtroMov);
    }
  }

  movs.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

  if (!movs.length) { list.innerHTML = `<div class="empty"><div class="empty-icon">🕒</div>Sin movimientos registrados.</div>`; return; }

  list.innerHTML = movs.map(m => `
    <div class="move-item">
      <div class="move-header">
        <div class="move-product">${m.productoNombre}</div>
        <div class="badge badge-${m.tipo}">${m.tipo === 'entrada' ? '↓ Entrada' : '↑ Salida'}</div>
      </div>
      <div class="move-detail">
        <span>📅 ${new Date(m.fecha).toLocaleString()}</span>
        <span>🔢 Cant: ${m.cantidad}</span>
        ${m.tipo === 'salida' ? `<span>📍 ${m.sucursal}</span>` : ''}
        ${m.nota ? `<span>📝 ${m.nota}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function filterMov(f, el) {
  filtroMov = f;
  document.querySelectorAll('#mov-filters .filter-chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderMovimientos();
}

function initFechas() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('rango-hasta').value = hoy;
  const mesPasado = new Date();
  mesPasado.setMonth(mesPasado.getMonth() - 1);
  document.getElementById('rango-desde').value = mesPasado.toISOString().split('T')[0];
}

function agregarProducto() {
  const nombre = document.getElementById('np-nombre').value.trim();
  const categoria = document.getElementById('np-cat').value;
  const subcategoriaValue = document.getElementById('np-subcat').value;
  const stock = parseInt(document.getElementById('np-qty').value) || 0;
  const notas = document.getElementById('np-notas').value.trim();

  if (!nombre) { showToast('El nombre es obligatorio'); return; }

  const data = getData();
  const subcategoria = subcategorias[categoria] ? subcategoriaValue : null;

  if (editId) {
    const p = data.productos.find(prod => prod.id === editId);
    if (p) {
      p.nombre = nombre;
      p.categoria = categoria;
      p.subcategoria = subcategoria;
      p.notas = notas;
      // No editamos stock acá
    }
    showToast('Producto actualizado');
  } else {
    const nuevo = {
      id: Date.now().toString(),
      nombre, categoria, subcategoria, stock, notas, fechaCreado: new Date().toISOString()
    };
    data.productos.push(nuevo);

    if (stock > 0) {
      data.movimientos.push({
        id: Date.now() + 1,
        productoId: nuevo.id,
        productoNombre: nuevo.nombre,
        tipo: 'entrada',
        cantidad: stock,
        fecha: new Date().toISOString(),
        nota: 'Carga inicial'
      });
    }
    showToast('Producto guardado');
  }

  saveData(data);
  showSection('stock', document.querySelector('nav button:first-child'));
}

function eliminarProducto(id) {
  if (!confirm('¿Seguro quieres eliminar este producto?')) return;
  const data = getData();
  data.productos = data.productos.filter(p => p.id !== id);
  saveData(data);
  renderStock();
  showToast('Producto eliminado');
}

function prepararEdicion(id) {
  const data = getData();
  const p = data.productos.find(prod => prod.id === id);
  if (!p) return;

  editId = id;
  document.getElementById('np-nombre').value = p.nombre;
  document.getElementById('np-cat').value = p.categoria;
  updateSubcats();
  if (p.subcategoria) {
    document.getElementById('np-subcat').value = p.subcategoria;
  }
  document.getElementById('np-qty').value = p.stock;
  document.getElementById('np-qty').disabled = true; // No permitir editar stock desde acá para no romper historial
  document.getElementById('np-notas').value = p.notas || '';

  const btn = document.querySelector('#sec-nuevo-producto .btn-primary');
  btn.textContent = '✓ Guardar Cambios';
  document.querySelector('#sec-nuevo-producto .section-title').innerHTML = '<div class="dot"></div>Editar Producto';

  showSection('nuevo-producto');
}

function openModal() {
  const data = getData();
  const select = document.getElementById('mov-producto');
  if (!data.productos.length) { showToast('No hay productos registrados'); return; }

  select.innerHTML = data.productos.map(p => `<option value="${p.id}">${p.nombre} (${p.stock} uds)</option>`).join('');
  document.getElementById('modal-mov').classList.add('open');
}

function closeModal() { document.getElementById('modal-mov').classList.remove('open'); }

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
  const nota = document.getElementById('mov-nota').value.trim();

  if (isNaN(cantidad) || cantidad <= 0) { showToast('Cantidad inválida'); return; }

  const data = getData();
  const prod = data.productos.find(p => p.id === prodId);

  if (tipoMov === 'salida' && prod.stock < cantidad) {
    showToast('Stock insuficiente');
    return;
  }

  prod.stock += (tipoMov === 'entrada' ? cantidad : -cantidad);

  data.movimientos.push({
    id: Date.now(),
    productoId: prodId,
    productoNombre: prod.nombre,
    tipo: tipoMov,
    cantidad: cantidad,
    sucursal: tipoMov === 'salida' ? sucursal : null,
    nota: nota,
    fecha: new Date().toISOString()
  });

  saveData(data);
  closeModal();
  renderStock();
  renderMovimientos();
  showToast('Movimiento registrado');
  document.getElementById('mov-qty').value = '1';
  document.getElementById('mov-nota').value = '';
}

// EXPORTACION
function exportarStockActual() {
  const data = getData();
  const rows = data.productos.map(p => ({
    ID: p.id,
    Producto: p.nombre,
    Categoría: p.categoria,
    Subcategoría: p.subcategoria || '',
    Stock: p.stock,
    Notas: p.notas || ''
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  XLSX.writeFile(wb, "Stock_Actual.xlsx");
}

function exportarMovimientos() {
  const data = getData();
  const desde = new Date(document.getElementById('rango-desde').value);
  const hasta = new Date(document.getElementById('rango-hasta').value);
  hasta.setHours(23,59,59);

  const filtrados = data.movimientos.filter(m => {
    const d = new Date(m.fecha);
    return d >= desde && d <= hasta;
  });

  const rows = filtrados.map(m => ({
    Fecha: new Date(m.fecha).toLocaleString(),
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
}

function exportarCompleto() {
  const data = getData();
  const wb = XLSX.utils.book_new();

  const sRows = data.productos.map(p => ({ ID: p.id, Producto: p.nombre, Categoria: p.categoria, Subcategoria: p.subcategoria || '', Stock: p.stock }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sRows), "Stock Actual");

  const mRows = data.movimientos.map(m => ({ Fecha: new Date(m.fecha).toLocaleString(), Tipo: m.tipo, Producto: m.productoNombre, Cantidad: m.cantidad, Destino: m.sucursal || '-' }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mRows), "Todos los Movimientos");

  XLSX.writeFile(wb, "Reporte_Completo_Deposito.xlsx");
}

function exportarSucursales() {
  const data = getData();
  const wb = XLSX.utils.book_new();
  const sucursales = ['Aristóbulo', 'Oberá', 'San Vicente'];

  sucursales.forEach(s => {
    const filtrados = data.movimientos.filter(m => m.sucursal === s);
    const rows = filtrados.map(m => ({
      Fecha: new Date(m.fecha).toLocaleString(),
      Producto: m.productoNombre,
      Cantidad: m.cantidad,
      Nota: m.nota || ''
    }));
    if (rows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), s);
    }
  });

  if (wb.SheetNames.length === 0) {
    showToast('No hay envíos a sucursales todavía');
    return;
  }
  XLSX.writeFile(wb, "Envios_a_Sucursales.xlsx");
}

document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
renderStock();
