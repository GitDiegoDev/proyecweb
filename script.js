function getData() {
  try { return JSON.parse(localStorage.getItem('deposito_data') || '{"productos":[],"movimientos":[]}'); }
  catch { return { productos: [], movimientos: [] }; }
}
function saveData(d) { localStorage.setItem('deposito_data', JSON.stringify(d)); }

let tipoMov = 'entrada', filtroMov = 'todos', filtrocat = 'todas';

function showSection(name, el) {
  ['stock','movimientos','reportes','nuevo-producto'].forEach(s =>
    document.getElementById('sec-'+s).classList.add('hidden'));
  document.getElementById('sec-'+name).classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('fab-btn').style.display =
    (name==='nuevo-producto'||name==='reportes') ? 'none' : 'flex';
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
  const search = (document.getElementById('search-stock').value||'').toLowerCase();
  const list = document.getElementById('stock-list');
  const icons = {'Sillones':'🛋️','Mesas':'🪵','Sillas':'🪑','Macetas':'🪴','Decoración':'🏺','Otro':'📦'};

  const cats = ['todas',...new Set(data.productos.map(p=>p.categoria))];
  document.getElementById('cat-filters').innerHTML = cats.map(c=>`
    <button class="filter-chip ${c===filtrocat?'active':''}"
      onclick="filtrocat='${c}';renderStock()">
      ${c==='todas'?'Todas':c}</button>`).join('');

  let prods = data.productos.filter(p=>
    p.nombre.toLowerCase().includes(search)&&(filtrocat==='todas'||p.categoria===filtrocat));

  document.getElementById('stat-productos').textContent = data.productos.length;
  document.getElementById('stat-unidades').textContent = data.productos.reduce((a,p)=>a+p.stock,0);

  if (!prods.length) { list.innerHTML=`<div class="empty"><div class="empty-icon">📭</div>Sin productos.<br>Usá "+ Producto" para agregar.</div>`; return; }

  list.innerHTML = prods.map(p=>`
    <div class="stock-item">
      <div class="stock-icon">${icons[p.categoria]||'📦'}</div>
      <div class="stock-info">
        <div class="stock-name">${p.nombre}</div>
        <div class="stock-cat">${p.categoria}${p.notas?' · '+p.notas.substring(0,30):''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="stock-qty">
          <div class="qty-num ${p.stock<=2?'qty-low':''}">${p.stock}</div>
          <div class="qty-label">uds</div>
        </div>
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
  const stock = parseInt(document.getElementById('np-qty').value) || 0;
  const notas = document.getElementById('np-notas').value.trim();

  if (!nombre) { showToast('El nombre es obligatorio'); return; }

  const data = getData();
  const nuevo = {
    id: Date.now().toString(),
    nombre, categoria, stock, notas, fechaCreado: new Date().toISOString()
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

  saveData(data);
  showToast('Producto guardado');
  document.getElementById('np-nombre').value = '';
  document.getElementById('np-qty').value = '0';
  document.getElementById('np-notas').value = '';
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

  const sRows = data.productos.map(p => ({ ID: p.id, Producto: p.nombre, Categoria: p.categoria, Stock: p.stock }));
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
