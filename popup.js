let alarmasGlobales = [];
let notasGlobales = [];
let proxiesGuardados = [];

// ========== RELOJ ==========
function actualizarReloj() {
  const ahora = new Date();
  document.getElementById('clock').textContent = ahora.toLocaleTimeString('es-ES');
  document.getElementById('date').textContent = ahora.toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short'
  }).toUpperCase();
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

// ========== IP Y UBICACIÓN ==========
async function obtenerMiIPyUbicacion() {
  try {
    const resIP = await fetch('https://api.ipify.org?format=json');
    const dataIP = await resIP.json();
    const miIP = dataIP.ip;
    document.getElementById('myIp').textContent = miIP;
    
    const resGeo = await fetch(`http://ip-api.com/json/${miIP}?fields=status,country,countryCode,city,lat,lon`);
    const dataGeo = await resGeo.json();
    
    if (dataGeo.status === 'success') {
      const countryCode = dataGeo.countryCode?.toLowerCase() || '';
      const flag = countryCode ? getFlagEmoji(countryCode) : '🏳️';
      document.getElementById('myFlag').textContent = flag;
      document.getElementById('myLocation').textContent = `📍 ${dataGeo.city || 'Desconocida'}, ${dataGeo.country || 'Desconocido'}`;
    } else {
      document.getElementById('myFlag').textContent = '🏳️';
      document.getElementById('myLocation').textContent = '📍 Ubicación no disponible';
    }
  } catch (error) {
    document.getElementById('myIp').textContent = 'Error';
    document.getElementById('myFlag').textContent = '🏳️';
    document.getElementById('myLocation').textContent = '📍 Error de conexión';
  }
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// ========== BUSCAR IP ==========
async function buscarIP() {
  const ipInput = document.getElementById('searchIpInput').value.trim();
  if (!ipInput) {
    mostrarMensaje('❌ Ingresa una IP para buscar', 'error');
    return;
  }
  
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ipInput)) {
    mostrarMensaje('❌ IP no válida', 'error');
    return;
  }
  
  mostrarMensaje('🔍 Buscando...', 'info');
  
  try {
    const res = await fetch(`http://ip-api.com/json/${ipInput}?fields=status,country,countryCode,city,regionName,isp,lat,lon,query`);
    const data = await res.json();
    
    if (data.status === 'success') {
      const flag = data.countryCode ? getFlagEmoji(data.countryCode) : '🏳️';
      
      document.getElementById('resultIp').textContent = data.query || ipInput;
      document.getElementById('resultCountry').textContent = `${flag} ${data.country || 'Desconocido'}`;
      document.getElementById('resultCity').textContent = `${data.city || 'Desconocida'}, ${data.regionName || ''}`;
      document.getElementById('resultIsp').textContent = data.isp || 'Desconocido';
      
      document.getElementById('searchResult').classList.add('show');
      mostrarMensaje(`✅ IP pertenece a ${data.country}`, 'success');
    } else {
      mostrarMensaje('❌ IP no encontrada o inválida', 'error');
      document.getElementById('searchResult').classList.remove('show');
    }
  } catch (error) {
    mostrarMensaje('❌ Error al buscar la IP', 'error');
  }
}

// ========== ALARMAS ==========
function cargarAlarmas() {
  chrome.storage.local.get(['alarmas'], (resultado) => {
    alarmasGlobales = resultado.alarmas || [];
    renderizarAlarmas();
  });
}

function guardarAlarmas() {
  chrome.storage.local.set({ alarmas: alarmasGlobales });
}

function agregarAlarma() {
  const horaInput = document.getElementById('alarmTime').value;
  const mensajeInput = document.getElementById('alarmMsg').value.trim();
  
  if (!horaInput || !mensajeInput) {
    mostrarMensaje('❌ Completa hora y mensaje', 'error');
    return;
  }
  
  const [horas, minutos] = horaInput.split(':');
  const fechaAlarma = new Date();
  fechaAlarma.setHours(horas, minutos, 0, 0);
  
  if (fechaAlarma <= new Date()) {
    fechaAlarma.setDate(fechaAlarma.getDate() + 1);
  }
  
  const nuevoId = Date.now() + Math.floor(Math.random() * 10000);
  
  const nuevaAlarma = {
    id: nuevoId,
    hora: horaInput,
    mensaje: mensajeInput,
    timestamp: fechaAlarma.getTime()
  };
  
  alarmasGlobales.push(nuevaAlarma);
  alarmasGlobales.sort((a, b) => a.timestamp - b.timestamp);
  
  chrome.storage.local.set({ alarmas: alarmasGlobales }, () => {
    chrome.alarms.create(`alarma_${nuevoId}`, { when: nuevaAlarma.timestamp });
    renderizarAlarmas();
  });
  
  document.getElementById('alarmTime').value = '';
  document.getElementById('alarmMsg').value = '';
  mostrarMensaje(`✅ Alarma a las ${fechaAlarma.toLocaleTimeString()}`, 'success');
}

function eliminarAlarma(idAlarma) {
  alarmasGlobales = alarmasGlobales.filter(a => a.id !== idAlarma);
  
  chrome.storage.local.set({ alarmas: alarmasGlobales }, () => {
    chrome.alarms.clear(`alarma_${idAlarma}`);
    renderizarAlarmas();
  });
  
  mostrarMensaje('🗑️ Alarma eliminada', 'success');
}

function renderizarAlarmas() {
  const contenedor = document.getElementById('alarmsContainer');
  if (!contenedor) return;
  
  if (alarmasGlobales.length === 0) {
    contenedor.innerHTML = '<div style="text-align:center; color:#64748b; padding:15px;">Sin alarmas</div>';
    return;
  }
  
  contenedor.innerHTML = '';
  alarmasGlobales.forEach(alarma => {
    const fechaAlarma = new Date(alarma.timestamp);
    const esManana = fechaAlarma.toDateString() !== new Date().toDateString();
    const horaStr = fechaAlarma.toLocaleTimeString();
    
    const elemento = document.createElement('div');
    elemento.className = 'alarm-item';
    elemento.innerHTML = `
      <div class="alarm-info">
        <div class="alarm-time">⏰ ${horaStr} ${esManana ? '📅' : ''}</div>
        <div class="alarm-msg">📝 ${escapeHtml(alarma.mensaje)}</div>
      </div>
      <button class="delete-btn" data-id="${alarma.id}">✖</button>
    `;
    contenedor.appendChild(elemento);
  });
  
  document.querySelectorAll('.delete-btn').forEach(boton => {
    boton.addEventListener('click', (e) => {
      const id = parseInt(boton.getAttribute('data-id'));
      eliminarAlarma(id);
    });
  });
}

// ========== BLOC DE NOTAS ==========
function cargarNotas() {
  chrome.storage.local.get(['notas'], (resultado) => {
    notasGlobales = resultado.notas || [];
    renderizarNotas();
  });
}

function guardarNotas() {
  chrome.storage.local.set({ notas: notasGlobales });
}

function agregarNota() {
  const textoInput = document.getElementById('noteInput').value.trim();
  if (!textoInput) {
    mostrarMensaje('❌ Escribe un texto para guardar', 'error');
    return;
  }
  
  const nuevaNota = { id: Date.now(), texto: textoInput };
  notasGlobales.push(nuevaNota);
  guardarNotas();
  renderizarNotas();
  document.getElementById('noteInput').value = '';
  mostrarMensaje('✅ Plantilla guardada', 'success');
}

function eliminarNota(idNota) {
  notasGlobales = notasGlobales.filter(n => n.id !== idNota);
  guardarNotas();
  renderizarNotas();
  mostrarMensaje('🗑️ Plantilla eliminada', 'success');
}

function copiarTexto(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    mostrarMensaje('📋 Texto copiado', 'success');
  });
}

function renderizarNotas() {
  const contenedor = document.getElementById('notesContainer');
  if (!contenedor) return;
  
  if (notasGlobales.length === 0) {
    contenedor.innerHTML = '<div style="text-align:center; color:#64748b; padding:15px;">📭 Sin plantillas</div>';
    return;
  }
  
  contenedor.innerHTML = '';
  notasGlobales.forEach(nota => {
    const elemento = document.createElement('div');
    elemento.className = 'note-item';
    elemento.innerHTML = `
      <div class="note-text" data-texto="${escapeHtml(nota.texto)}">📄 ${escapeHtml(nota.texto.length > 35 ? nota.texto.substring(0, 35) + '...' : nota.texto)}</div>
      <div class="note-actions">
        <button class="btn-copy" data-id="${nota.id}">📋</button>
        <button class="btn-delete-note" data-id="${nota.id}">✖</button>
      </div>
    `;
    contenedor.appendChild(elemento);
  });
  
  document.querySelectorAll('.note-text').forEach(el => {
    el.addEventListener('click', () => copiarTexto(el.getAttribute('data-texto')));
  });
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-id'));
      const nota = notasGlobales.find(n => n.id === id);
      if (nota) copiarTexto(nota.texto);
    });
  });
  document.querySelectorAll('.btn-delete-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-id'));
      eliminarNota(id);
    });
  });
}

// ========== PROXY ACTIVO ==========
function actualizarEstadoProxy() {
  chrome.proxy.settings.get({}, (config) => {
    const activo = config.value && config.value.mode === 'fixed_servers';
    document.getElementById('proxyStatus').textContent = activo ? 'ON' : 'OFF';
  });
}

function aplicarProxy(tipo, host, puerto, bypassList) {
  if (tipo === 'none') {
    desactivarProxy();
    return;
  }
  
  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: { scheme: tipo, host, port: parseInt(puerto) },
      bypassList: bypassList || ['localhost', '127.0.0.1']
    }
  };
  
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      mostrarMensaje(`❌ ${chrome.runtime.lastError.message}`, 'error');
    } else {
      mostrarMensaje(`✅ Proxy ${tipo.toUpperCase()} en ${host}:${puerto}`, 'success');
      actualizarEstadoProxy();
    }
  });
}

function aplicarProxyDesdeFormulario() {
  const tipo = document.getElementById('proxyType').value;
  const host = document.getElementById('proxyHost').value.trim();
  const puerto = document.getElementById('proxyPort').value.trim();
  const bypassRaw = document.getElementById('proxyBypass').value;
  const bypassList = bypassRaw ? bypassRaw.split(',').map(s => s.trim()) : ['localhost', '127.0.0.1'];
  
  if (tipo !== 'none' && (!host || !puerto)) {
    mostrarMensaje('❌ Host y puerto requeridos', 'error');
    return;
  }
  aplicarProxy(tipo, host, puerto, bypassList);
}

function probarProxyActivo() {
  mostrarMensaje('🔍 Probando proxy...', 'info');
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(data => mostrarMensaje(`✅ Proxy funciona - IP: ${data.ip}`, 'success'))
    .catch(() => mostrarMensaje('❌ Proxy no responde', 'error'));
}

function desactivarProxy() {
  chrome.proxy.settings.clear({ scope: 'regular' }, () => {
    mostrarMensaje('✅ Proxy desactivado - Conexión normal', 'success');
    actualizarEstadoProxy();
    // Limpiar campos del formulario de proxy activo
    document.getElementById('proxyType').value = 'none';
    document.getElementById('proxyHost').value = '';
    document.getElementById('proxyPort').value = '';
  });
}

// ========== PROXIES GUARDADOS ==========
function cargarProxiesGuardados() {
  chrome.storage.local.get(['proxiesGuardados'], (resultado) => {
    proxiesGuardados = resultado.proxiesGuardados || [];
    renderizarProxiesGuardados();
  });
}

function guardarProxiesGuardados() {
  chrome.storage.local.set({ proxiesGuardados: proxiesGuardados });
}

function agregarProxyGuardado() {
  const nombre = document.getElementById('savedProxyName').value.trim();
  const host = document.getElementById('savedProxyHost').value.trim();
  const puerto = document.getElementById('savedProxyPort').value.trim();
  const tipo = document.getElementById('savedProxyType').value;
  const pais = document.getElementById('savedProxyCountry').value;
  
  if (!nombre || !host || !puerto) {
    mostrarMensaje('❌ Completa nombre, host y puerto', 'error');
    return;
  }
  
  const nuevoProxy = {
    id: Date.now(),
    nombre: nombre,
    host: host,
    puerto: parseInt(puerto),
    tipo: tipo,
    pais: pais
  };
  
  proxiesGuardados.push(nuevoProxy);
  guardarProxiesGuardados();
  renderizarProxiesGuardados();
  
  document.getElementById('savedProxyName').value = '';
  document.getElementById('savedProxyHost').value = '';
  document.getElementById('savedProxyPort').value = '';
  mostrarMensaje(`✅ Proxy "${nombre}" guardado`, 'success');
}

function eliminarProxyGuardado(id) {
  proxiesGuardados = proxiesGuardados.filter(p => p.id !== id);
  guardarProxiesGuardados();
  renderizarProxiesGuardados();
  mostrarMensaje('🗑️ Proxy eliminado', 'success');
}

function usarProxyGuardado(proxy) {
  document.getElementById('proxyType').value = proxy.tipo;
  document.getElementById('proxyHost').value = proxy.host;
  document.getElementById('proxyPort').value = proxy.puerto;
  aplicarProxy(proxy.tipo, proxy.host, proxy.puerto);
}

function testProxyGuardado(proxy) {
  mostrarMensaje(`🔍 Probando ${proxy.nombre}...`, 'info');
  
  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: { scheme: proxy.tipo, host: proxy.host, port: proxy.puerto },
      bypassList: ['localhost', '127.0.0.1']
    }
  };
  
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      mostrarMensaje(`❌ ${chrome.runtime.lastError.message}`, 'error');
      return;
    }
    
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(data => {
        mostrarMensaje(`✅ ${proxy.nombre} funciona - IP: ${data.ip}`, 'success');
        desactivarProxy();
      })
      .catch(() => {
        mostrarMensaje(`❌ ${proxy.nombre} no responde`, 'error');
        desactivarProxy();
      });
  });
}

function renderizarProxiesGuardados() {
  const contenedor = document.getElementById('savedProxiesContainer');
  if (!contenedor) return;
  
  if (proxiesGuardados.length === 0) {
    contenedor.innerHTML = '<div style="text-align:center; color:#64748b; padding:15px;">📭 No hay proxies guardados</div>';
    return;
  }
  
  contenedor.innerHTML = '';
  proxiesGuardados.forEach(proxy => {
    const elemento = document.createElement('div');
    elemento.className = 'saved-proxy-item';
    elemento.innerHTML = `
      <div class="saved-proxy-header">
        <span class="saved-proxy-name">${escapeHtml(proxy.nombre)}</span>
        <span class="saved-proxy-country">${proxy.pais}</span>
      </div>
      <div class="saved-proxy-details">${proxy.tipo.toUpperCase()}://${proxy.host}:${proxy.puerto}</div>
      <div class="saved-proxy-actions">
        <button class="btn-use-proxy" data-id="${proxy.id}">🔌 Usar</button>
        <button class="btn-test-proxy" data-id="${proxy.id}">🔍 Test</button>
        <button class="btn-delete-proxy" data-id="${proxy.id}">🗑️</button>
      </div>
    `;
    contenedor.appendChild(elemento);
  });
  
  document.querySelectorAll('.btn-use-proxy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.getAttribute('data-id'));
      const proxy = proxiesGuardados.find(p => p.id === id);
      if (proxy) usarProxyGuardado(proxy);
    });
  });
  document.querySelectorAll('.btn-test-proxy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.getAttribute('data-id'));
      const proxy = proxiesGuardados.find(p => p.id === id);
      if (proxy) testProxyGuardado(proxy);
    });
  });
  document.querySelectorAll('.btn-delete-proxy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(btn.getAttribute('data-id'));
      eliminarProxyGuardado(id);
    });
  });
}

// ========== UTILIDADES ==========
function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function mostrarMensaje(mensaje, tipo) {
  const el = document.getElementById('statusMsg');
  el.textContent = mensaje;
  el.className = `status ${tipo}`;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, 2500);
}

function abrirVentanaFlotante() {
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: 490,
    height: 900,
    focused: true
  });
}

// ========== EVENTOS ==========
document.getElementById('addAlarmBtn').addEventListener('click', agregarAlarma);
document.getElementById('applyProxyBtn').addEventListener('click', aplicarProxyDesdeFormulario);
document.getElementById('testProxyBtn').addEventListener('click', probarProxyActivo);
document.getElementById('disableProxyBtn').addEventListener('click', desactivarProxy);
document.getElementById('quickDisableProxyBtn').addEventListener('click', desactivarProxy);
document.getElementById('disableProxyFromListBtn').addEventListener('click', desactivarProxy);
document.getElementById('pinBtn').addEventListener('click', abrirVentanaFlotante);
document.getElementById('searchIpBtn').addEventListener('click', buscarIP);
document.getElementById('addNoteBtn').addEventListener('click', agregarNota);
document.getElementById('addSavedProxyBtn').addEventListener('click', agregarProxyGuardado);

document.getElementById('alarmMsg').addEventListener('keypress', (e) => e.key === 'Enter' && agregarAlarma());
document.getElementById('searchIpInput').addEventListener('keypress', (e) => e.key === 'Enter' && buscarIP());
document.getElementById('noteInput').addEventListener('keypress', (e) => e.key === 'Enter' && agregarNota());

// Inicializar
cargarAlarmas();
cargarNotas();
cargarProxiesGuardados();
actualizarEstadoProxy();
obtenerMiIPyUbicacion();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.alarmas) {
    alarmasGlobales = changes.alarmas.newValue || [];
    renderizarAlarmas();
  }
  if (changes.notas) {
    notasGlobales = changes.notas.newValue || [];
    renderizarNotas();
  }
  if (changes.proxiesGuardados) {
    proxiesGuardados = changes.proxiesGuardados.newValue || [];
    renderizarProxiesGuardados();
  }
});