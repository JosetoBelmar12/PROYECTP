// === CRUD de Materiales (Maestros) ===

async function addMaterial() {
    const name = document.getElementById('newMaterialName').value.trim();
    if (!name) return alert('Ingresa el nombre del material');
    try {
        const res = await apiRequest('/materials/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error(res.data?.detail || 'Error agregando material');
        document.getElementById('newMaterialName').value = '';
        await loadMaterialsFromBackend();
        renderMaterialsList();
        refreshMaterialsTableMasters();
    } catch (err) {
        alert('Error: ' + (err.message || err));
    }
}

async function renderMaterialsList() {
    const list = (window.MASTERS && window.MASTERS.materials) || [];
    const container = document.getElementById('materialsList');
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = '<p class="loading">No hay materiales.</p>';
        return;
    }
    container.innerHTML = list.map(mat => `
        <div class="item-badge">
            <span>${mat.name}</span>
            <button class="btn-delete-maestro" data-id="${mat.id}" data-type="material" title="Eliminar">🗑️</button>
        </div>
    `).join('');
    // Handler para eliminar
    container.querySelectorAll('.btn-delete-maestro').forEach(btn => {
        btn.onclick = async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            try {
                const res = await apiRequest(`/materials/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error(res.data?.detail || 'Error eliminando material');
                await loadMaterialsFromBackend();
                renderMaterialsList();
                refreshMaterialsTableMasters();
            } catch (err) {
                alert('Error: ' + (err.message || err));
            }
        };
    });
}
// Cargar materiales desde backend y actualizar window.MASTERS.materials
async function loadMaterialsFromBackend() {
    try {
        const res = await apiRequest('/materials/', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && Array.isArray(res.data)) {
            if (!window.MASTERS) window.MASTERS = {};
            window.MASTERS.materials = res.data;
        } else {
            window.MASTERS.materials = [];
        }
    } catch (err) {
        window.MASTERS.materials = [];
    }
}

// Llamar renderMaterialsList al cargar maestros
// --- Autocomplete repuestos para mantención rápida de planta ---
let sparePartsAutocompleteState = { selected: [] };
function setupSparePartsAutocomplete() {
    const input = document.getElementById('nrMaintenanceSparePartsInput');
    const dropdown = document.getElementById('nrSparePartsDropdown');
    const selectedDiv = document.getElementById('nrSelectedSpareParts');
    const qtyModal = document.getElementById('sparePartQtyModal');
    const modalName = document.getElementById('modalSparePartName');
    const modalQty = document.getElementById('modalSparePartQty');
    const modalCancel = document.getElementById('modalCancelBtn');
    const modalAdd = document.getElementById('modalAddBtn');
    if (!input || !dropdown || !selectedDiv) return;
    let pendingSparePart = null;
    // Only set up event handlers once
    if (!input._autocompleteInitialized) {
        input.oninput = function() {
            const val = input.value.toLowerCase();
            if (!val || !window.MASTERS || !window.MASTERS.spare_parts) { dropdown.style.display = 'none'; return; }
            const options = window.MASTERS.spare_parts.filter(sp => sp.name.toLowerCase().includes(val) && !sparePartsAutocompleteState.selected.some(sel => sel.id === sp.id));
            if (options.length === 0) { dropdown.style.display = 'none'; return; }
            dropdown.innerHTML = options.map(sp => `<div class="dropdown-item" data-id="${sp.id}">${sp.name}</div>`).join('');
            dropdown.style.display = 'block';
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.onclick = () => {
                    const id = parseInt(item.getAttribute('data-id'));
                    const sp = window.MASTERS.spare_parts.find(s => s.id === id);
                    if (sp && !sparePartsAutocompleteState.selected.some(sel => sel.id === sp.id)) {
                        // Mostrar modal para cantidad
                        pendingSparePart = sp;
                        if (modalName && modalQty && qtyModal) {
                            modalName.textContent = sp.name;
                            modalQty.value = 1;
                            qtyModal.style.display = 'flex';
                            modalQty.focus();
                        }
                    }
                    input.value = '';
                    dropdown.style.display = 'none';
                };
            });
        };
        input.onblur = function() { setTimeout(() => { dropdown.style.display = 'none'; }, 200); };
        input._autocompleteInitialized = true;
        // Modal handlers
        if (modalCancel && qtyModal) {
            modalCancel.onclick = () => {
                qtyModal.style.display = 'none';
                pendingSparePart = null;
            };
        }
        if (modalAdd && modalQty && qtyModal) {
            modalAdd.onclick = () => {
                if (pendingSparePart) {
                    let qty = parseInt(modalQty.value);
                    if (isNaN(qty) || qty < 1) qty = 1;
                    sparePartsAutocompleteState.selected.push({ ...pendingSparePart, qty });
                    renderSelected();
                }
                qtyModal.style.display = 'none';
                pendingSparePart = null;
            };
        }
    }
    function renderSelected() {
        selectedDiv.innerHTML = sparePartsAutocompleteState.selected.map(sp => `<span class="part-badge">${sp.name} <span class="qty-badge">x${sp.qty || 1}</span> <button type="button" class="remove-part" data-id="${sp.id}">x</button></span>`).join(' ');
        // Remove handler
        selectedDiv.querySelectorAll('.remove-part').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.getAttribute('data-id'));
                sparePartsAutocompleteState.selected = sparePartsAutocompleteState.selected.filter(sp => sp.id !== id);
                renderSelected();
            };
        });
    }
    // Expose selected for registerQuickMaintenance
    window.getSelectedSpareParts = () => sparePartsAutocompleteState.selected.map(sp => ({ id: sp.id, qty: sp.qty || 1 }));
    renderSelected();
}

function refreshSparePartsAutocomplete() {
    // Remove any selected parts that no longer exist in master data
    if (!window.MASTERS || !window.MASTERS.spare_parts) return;
    sparePartsAutocompleteState.selected = sparePartsAutocompleteState.selected.filter(sel => window.MASTERS.spare_parts.some(sp => sp.id === sel.id));
    setupSparePartsAutocomplete();
}
// Estado global
let token = localStorage.getItem('token');
let currentUsername = localStorage.getItem('username');

// Función auxiliar para obtener token fresco
function getAuthToken() {
    const freshToken = localStorage.getItem('token');
    console.log('[AUTH] Token obtenido de localStorage:', freshToken ? 'PRESENTE (' + freshToken.substring(0, 20) + '...)' : 'NULL');
    return freshToken;
}

// API base URL
const API_BASE = window.location.origin; // http://127.0.0.1:8000

// Helper para hacer requests de forma segura
async function apiRequest(endpoint, options = {}) {
    try {
        const url = API_BASE + endpoint;
        console.log('API Request:', url, options);
        
        const response = await fetch(url, options);
        
        // Intentar parsear JSON
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else if (contentType && contentType.includes('text/html')) {
            // Es HTML — probablemente un error del servidor
            const text = await response.text();
            console.error('Respuesta HTML (error del servidor):', text);
            throw new Error('El servidor devolvió error. Verifica los logs del servidor.');
        } else {
            data = await response.text();
        }
        
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error('Error en apiRequest:', error);
        throw error;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Limpiar localStorage si viene de un servidor reiniciado (tokens inválidos)
    // Esto asegura que cada reinicio del servidor requiera un nuevo login
    const lastServerCheck = localStorage.getItem('lastServerCheck');
    const now = Date.now();
    if (!lastServerCheck || (now - parseInt(lastServerCheck)) > 60000) {
        // Si pasó más de 1 minuto, limpiar tokens antiguos
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        localStorage.setItem('lastServerCheck', now.toString());
    }
    
    // Establecer fecha actual en el input de fecha
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reportDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Actualizar variables globales desde localStorage
    token = localStorage.getItem('token');
    currentUsername = localStorage.getItem('username');
    
    // Mostrar pantalla adecuada
    if (token && currentUsername) {
        showHomeScreen();
        loadReports();
    } else {
        showLoginScreen();
    }

    // Event listeners
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('createUserForm')?.addEventListener('submit', handleCreateUser);
    document.getElementById('reportForm')?.addEventListener('submit', handleCreateReport);
    document.getElementById('fillLastHorometerBtn')?.addEventListener('click', async () => {
        // Fetch last horometer only for the selected plant
        const plantSel = document.getElementById('reportPlant');
        if (!plantSel || !plantSel.value) return alert('Selecciona la planta para obtener el último horómetro');
        const itemId = parseInt(plantSel.value);
        const h = await fetchLastReportHorometer('plant', itemId);
        if (h != null) {
            document.getElementById('reportHorometerStart').value = h;
            alert('Horómetro cargado: ' + h);
        } else {
            alert('No se encontró horómetro en últimos reportes para ese elemento');
        }
    });

    // Maestros actions
    if (document.getElementById('masters')) {
        loadMasters();
    }
    
    // Inicializar tabla de materiales
    setupMaterialsTable();
    
    // Quick register (Nuevo Reporte) - update selected plant display
    const nrSelected = document.getElementById('nrSelectedPlant');
    const reportPlantSel = document.getElementById('reportPlant');
    if (nrSelected && reportPlantSel) {
        const updateSelectedPlant = () => {
            const opt = reportPlantSel.selectedOptions && reportPlantSel.selectedOptions[0];
            nrSelected.textContent = opt && opt.value ? opt.textContent : '--';
        };
        reportPlantSel.addEventListener('change', updateSelectedPlant);
        updateSelectedPlant();
    }
    
    // Populate spare parts in quick maintenance
    setupSparePartsAutocomplete();
    document.getElementById('nrAddMaintenanceBtn')?.addEventListener('click', registerQuickMaintenance);
    document.getElementById('nrViewHistoryBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const plantId = parseInt(document.getElementById('reportPlant').value || 0);
        if (!plantId) return alert('Selecciona primero la planta en el reporte');
        await loadNrMaintenanceHistory(plantId);
        await loadNrLastMaintenance(plantId);
    });
    
    // Cargar maestros al iniciar
    console.log('[INIT] Cargando maestros...');
    loadMasters().then(() => {
        console.log('[INIT] ✓ Maestros cargados');
        // Poblador de bono se hace cuando se abre la pestaña
    });
    
    // Event listeners para Usuarios Modal
    document.getElementById('modalRolGuardarBtn')?.addEventListener('click', guardarCambioRol);
    document.getElementById('modalPasswordResetBtn')?.addEventListener('click', resetearPassword);
    
    // Test de conexión
    testConnection();
});

async function testConnection() {
    try {
        const result = await apiRequest('/api/health');
        console.log('Health check:', result);
        if (!result.ok) {
            console.warn('Health check falló:', result.status);
        }
    } catch (error) {
        console.error('No se puede conectar al servidor:', error);
    }
}

// ===== FUNCIONES DE NAVEGACIÓN =====
function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('homeScreen').classList.remove('active');
}

function showHomeScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('homeScreen').classList.add('active');
    const username = localStorage.getItem('username') || 'Usuario';
    const role = localStorage.getItem('userRole') || 'registrador';
    const roleDisplay = role === 'admin' ? '👤 Administrador' : '📝 Registrador';
    document.getElementById('currentUser').textContent = `Usuario: ${username}`;
    document.getElementById('currentRole').textContent = roleDisplay;
}

function switchTab(tabName, evt) {
        // Guardar pestaña activa en localStorage
        localStorage.setItem('activeTab', tabName);
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar tab seleccionado
    const tabContent = document.getElementById(tabName);
    if (tabContent) {
        tabContent.classList.add('active');
    } else {
        console.error('No se encontró el tab:', tabName);
    }
    // Activar el botón
    if (evt && evt.target) {
        evt.target.classList.add('active');
    } else {
        // fallback: activar el botón correspondiente por tabName
        const btns = document.querySelectorAll('.tab-btn');
        btns.forEach(btn => {
            if (btn.textContent && btn.textContent.replace(/\s+/g, '').toLowerCase().includes(tabName.replace(/-/g, '').toLowerCase())) {
                btn.classList.add('active');
            }
        });
    }
    
    // Si se abre tab de bonos guardados, cargar la lista
    if (tabName === 'bonos-guardados') {
        setTimeout(() => listarBonosGuardados(), 100);
    }
    
    // Si es el tab de reportes, recargar
    if (tabName === 'list-reports') {
        loadReports();
    }
    // Si es el tab de Nuevo Reporte, forzar recarga de maestros y refrescar UI SIEMPRE
    if (tabName === 'new-report') {
        loadMasters().then(() => {
            refreshSparePartsAutocomplete();
            refreshMaterialsTableMasters();
            populateSelect('reportTrucks', window.MASTERS?.trucks || [], false);
            populateSelect('reportMachinery', window.MASTERS?.machinery || [], false);
            populateSelect('reportOperator', window.MASTERS?.operators || [], false);
        });
    }
    // Si es el tab de Bono Producción, asegurar MASTERS cargados y poblar dropdown
    if (tabName === 'bono-produccion') {
        console.log('[BONO-TAB] Abierto, MASTERS:', window.MASTERS);
        console.log('[BONO-TAB] plantas disponibles:', window.MASTERS?.plants?.length || 0);
        
        if (!window.MASTERS || !window.MASTERS.plants || window.MASTERS.plants.length === 0) {
            console.log('[BONO-TAB] ⏳ Maestros no disponibles, cargando...');
            loadMasters().then(() => {
                console.log('[BONO-TAB] ✓ Maestros cargados:', window.MASTERS.plants.length, 'plantas');
                populateBonoProduccionSelects();
            }).catch((err) => {
                console.error('[BONO-TAB] ❌ Error cargando maestros:', err);
            });
        } else {
            console.log('[BONO-TAB] ✓ Maestros ya presentes');
            populateBonoProduccionSelects();
        }
    }
    // Si es el tab de vitrina, renderizar y comenzar polling
    if (tabName === 'vitrina') {
        // ensure masters are loaded
        if (!window.MASTERS) awaitLoadMastersAndRenderVitrina();
        renderVitrina();
        // start polling every 60s
        if (!window.vitrinaIntervalId) {
            window.vitrinaIntervalId = setInterval(renderVitrina, 60000);
        }
    } else {
        // leaving vitrina: stop polling
        if (window.vitrinaIntervalId) {
            clearInterval(window.vitrinaIntervalId);
            window.vitrinaIntervalId = null;
        }
    }
}

function toggleRegisterForm() {
    const form = document.getElementById('registerForm');
    form.classList.toggle('hidden');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    token = null;
    currentUsername = null;
    document.getElementById('loginForm').reset();
    document.getElementById('createUserForm').reset();
    document.getElementById('reportForm').reset();
    document.getElementById('registerForm').classList.add('hidden');
    console.log('[AUTH] Sesión cerrada');
    showLoginScreen();
}
// ===== AUTENTICACIÓN =====
async function handleLogin(e) {
    e.preventDefault();
    console.log('[LOGIN] Iniciando login...');
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    console.log('[LOGIN] Usuario:', username, 'Endpoint:', `${API_BASE}/auth/token`);

    try {
        errorDiv.classList.add('hidden');
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        console.log('[LOGIN] Enviando POST a /auth/token');
        const response = await fetch(`${API_BASE}/auth/token`, {
            method: 'POST',
            body: formData
        });

        console.log('[LOGIN] Response status:', response.status);

        if (response.status === 400) {
            const data = await response.json();
            console.log('[LOGIN] Error 400:', data);
            errorDiv.textContent = data.detail || 'Usuario o contraseña incorrectos';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (!response.ok) {
            console.log('[LOGIN] Error:', response.status);
            throw new Error('Error en login - status: ' + response.status);
        }

        const data = await response.json();
        console.log('[LOGIN] Respuesta:', data);
        
        token = data.access_token;
        currentUsername = username;
        const userRole = data.role || 'registrador';

        console.log('[LOGIN] Guardando en localStorage...');
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        localStorage.setItem('userRole', userRole);
        
        console.log('[AUTH] Login exitoso:', {username, role: userRole, token: token.substring(0, 20) + '...'});
        
        // Aplicar restricciones de acceso basadas en rol
        console.log('[LOGIN] Aplicando restricciones de rol...');
        applyRoleRestrictions(userRole);

        console.log('[LOGIN] Limpiando formulario y mostrando home...');
        document.getElementById('loginForm').reset();
        showHomeScreen();
        
        console.log('[LOGIN] Cargando reportes...');
        loadReports();
        
        console.log('[LOGIN] ✓ Login completado exitosamente');
    } catch (error) {
        console.error('[AUTH] Error en login:', error);
        errorDiv.textContent = 'Error de conexión: ' + error.message;
        errorDiv.classList.remove('hidden');
    }
}

// Función para aplicar restricciones de acceso por rol
function applyRoleRestrictions(role) {
    const tabs = {
        'new-report': role !== 'admin' ? true : false,
        'list-reports': role !== 'admin' ? true : false,
        'masters': role !== 'admin' ? true : false,
        'bono-produccion': role === 'admin' ? false : true,
        'vitrina': role === 'admin' ? false : true,
        'nuevo-mantenimiento': role === 'admin' ? false : true,
        'usuarios': role === 'admin' ? false : true,
    };
    
    // Obtener todos los botones de pestaña
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    // Mostrar/ocultar tabs basados en el rol
    tabButtons.forEach(btn => {
        const tabName = btn.getAttribute('onclick');
        if (tabName && tabName.includes('switchTab')) {
            // Extraer el nombre de la pestaña
            const match = tabName.match(/switchTab\('([^']+)'/);
            if (match) {
                const extractedTabName = match[1];
                // Ocultar tabs no permitidos para registrador
                if (role === 'registrador' && (extractedTabName === 'bono-produccion' || extractedTabName === 'vitrina' || extractedTabName === 'nuevo-mantenimiento' || extractedTabName === 'usuarios')) {
                    btn.style.display = 'none';
                }
            }
        }
    });
    
    // También ocultar las pestañas por ID
    const tabsToHide = role === 'registrador' ? ['bono-produccion', 'vitrina', 'nuevo-mantenimiento', 'usuarios'] : [];
    tabsToHide.forEach(tabId => {
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.style.display = 'none';
        }
    });
    
    console.log('[AUTH] Restricciones de acceso aplicadas para:', role);
}

async function handleCreateUser(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!username || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    if (password.length < 4) {
        alert('La contraseña debe tener al menos 4 caracteres');
        return;
    }

    try {
        console.log('Intentando crear usuario:', username);
        
        const result = await apiRequest('/auth/register', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password, role: 'registrador' })
        });

        console.log('Resultado:', result);

        if (!result.ok) {
            const errorMsg = result.data?.detail || result.data?.message || JSON.stringify(result.data) || 'Error desconocido';
            alert('Error: ' + errorMsg);
            return;
        }

        alert('Usuario creado exitosamente. Por favor inicia sesión.');
        toggleRegisterForm();
        document.getElementById('createUserForm').reset();
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginUsername').focus();
    } catch (error) {
        console.error('Error completo:', error);
        alert('Error: ' + error.message + '\n\nVerifica F12 (Consola) para más detalles.');
    }
}

// ===== REPORTES =====
// --- Tabla dinámica de materiales en Nuevo Reporte ---
let materialsTableState = [];

function setupMaterialsTable() {
    const tableBody = document.querySelector('#materialsTable tbody');
    const addBtn = document.getElementById('addMaterialRowBtn');
    if (!tableBody || !addBtn) return;

    function updateTotalM3FromMaterials() {
        const total = materialsTableState.reduce((sum, row) => {
            const val = parseFloat(row.m3);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
        const totalInput = document.getElementById('reportTotalM3');
        if (totalInput) totalInput.value = total > 0 ? total.toFixed(2) : '';
    }

    function renderTable() {
        tableBody.innerHTML = materialsTableState.map((row, idx) => {
            const materialOptions = (window.MASTERS?.materials || []).map(mat =>
                `<option value="${mat.id}"${row.material_id == mat.id ? ' selected' : ''}>${mat.name}</option>`
            ).join('');
            return `<tr>
                <td><select class="material-select" data-idx="${idx}"><option value="">-- Seleccionar --</option>${materialOptions}</select></td>
                <td><input type="number" class="material-m3" data-idx="${idx}" min="0" step="0.1" value="${row.m3 ?? ''}"></td>
                <td><button type="button" class="remove-material-btn" data-idx="${idx}">✕</button></td>
            </tr>`;
        }).join('');
        updateTotalM3FromMaterials();
    }

    addBtn.onclick = () => {
        materialsTableState.push({ material_id: '', m3: '' });
        renderTable();
    };

    // Event delegation para todos los eventos
    tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('material-select')) {
            const idx = e.target.getAttribute('data-idx');
            materialsTableState[idx].material_id = parseInt(e.target.value) || '';
        }
    });

    tableBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('material-m3')) {
            const idx = e.target.getAttribute('data-idx');
            materialsTableState[idx].m3 = parseFloat(e.target.value) || '';
            updateTotalM3FromMaterials();
        }
    });

    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-material-btn')) {
            const idx = e.target.getAttribute('data-idx');
            materialsTableState.splice(idx, 1);
            renderTable();
            updateTotalM3FromMaterials();
        }
    });

    renderTable();
}

function refreshMaterialsTableMasters() {
    // Llamar esto después de cargar masters para refrescar materiales
    if (!window.MASTERS) return;
    if (!window.MASTERS.materials) {
        // Si no existe, inicializar como vacío
        window.MASTERS.materials = [];
    }
    setupMaterialsTable();
    // Asegura que el total se actualice al refrescar maestros
    if (typeof updateTotalM3FromMaterials === 'function') updateTotalM3FromMaterials();
}

function getMaterialsTableData() {
    // Devuelve array de objetos {material_id, m3}
    return materialsTableState
        .filter(row => row.material_id && row.m3)
        .map(row => ({ material_id: row.material_id, m3: row.m3 }));
}
async function handleCreateReport(e) {
    e.preventDefault();
    const form = document.getElementById('reportForm');
    const formData = new FormData(form);
    
    // Obtener token fresco
    const authToken = getAuthToken();
    
    if (!authToken) {
        alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
    }
    
    // Convert multi-select values to arrays of ints
    const data = {
        date: formData.get('date'),
        plant_id: formData.get('plant_id') ? parseInt(formData.get('plant_id')) : null,
        horometer_start: formData.get('horometer_start') ? parseFloat(formData.get('horometer_start')) : null,
        horometer_end: formData.get('horometer_end') ? parseFloat(formData.get('horometer_end')) : null,
        truck_id: formData.get('truck_id') ? parseInt(formData.get('truck_id')) : null,
        machinery_id: formData.get('machinery_id') ? parseInt(formData.get('machinery_id')) : null,
        operator_id: formData.get('operator_id') ? parseInt(formData.get('operator_id')) : null,
        materials: getMaterialsTableData(),
        total_m3: formData.get('total_m3') ? parseFloat(formData.get('total_m3')) : null,
        downtime_min: formData.get('downtime_min') ? parseInt(formData.get('downtime_min')) : null,
        maintenances: formData.get('maintenances') || null
    };
    
    // If editing, use PUT instead of POST
    let method = 'POST';
    let url = `${API_BASE}/reports/`;
    if (window.editingReportId) {
        method = 'PUT';
        url = `${API_BASE}/reports/${window.editingReportId}`;
    }
    
    const errorDiv = document.getElementById('reportError');
    const successDiv = document.getElementById('reportSuccess');
    try {
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');
        
        console.log('[REPORT] Enviando reporte con método:', method);
        console.log('[REPORT] URL:', url);
        console.log('[REPORT] Token presente:', !!authToken);
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        console.log('[REPORT] Response status:', response.status);
        
        if (!response.ok) {
            const errData = await response.json();
            console.log('[REPORT] Error response:', errData);
            throw new Error(errData.detail || 'Error creando reporte');
        }
        
        const responseData = await response.json();
        console.log('[REPORT] Reporte guardado:', responseData);
        
        successDiv.textContent = 'Reporte guardado exitosamente!';
        successDiv.classList.remove('hidden');
        document.getElementById('reportForm').reset();
        // Limpiar edición
        window.editingReportId = null;
        // Establecer fecha actual nuevamente
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reportDate').value = today;
        setTimeout(() => {
            loadReports();
            switchTab('list-reports');
        }, 1500);
    } catch (error) {
        console.error('[REPORT] Error:', error);
        errorDiv.textContent = error.message || 'Error guardando reporte';
        errorDiv.classList.remove('hidden');
    }
}

// ===== MAESTROS =====
// === BONO PRODUCCIÓN ===
function populateBonoProduccionSelects() {
    console.log('[POPULATE] Iniciando populateBonoProduccionSelects');
    
    // Plantas
    const plantSel = document.getElementById('bonoPlanta');
    console.log('[POPULATE] Elemento bonoPlanta:', plantSel);
    console.log('[POPULATE] window.MASTERS:', window.MASTERS);
    console.log('[POPULATE] window.MASTERS.plants:', window.MASTERS?.plants);
    
    if (plantSel && window.MASTERS && window.MASTERS.plants && window.MASTERS.plants.length > 0) {
        console.log('[POPULATE] Poblando dropdown con', window.MASTERS.plants.length, 'plantas');
        const options = '<option value="">Todas</option>' + window.MASTERS.plants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        plantSel.innerHTML = options;
        console.log('[POPULATE] ✓ Dropdown poblado exitosamente');
    } else {
        console.error('[POPULATE] ❌ Faltan datos - plantSel:', !!plantSel, 'MASTERS:', !!window.MASTERS, 'plants:', window.MASTERS?.plants?.length || 0);
    }
}

// Inicializar tabla de trabajadores para Bono Producción
window.bonoTrabajadoresState = [];
window.bonoHorasExtraProduccion = 0;

function renderBonoTrabajadoresTabla() {
    const tbody = document.querySelector('#bonoTrabajadoresTabla tbody');
    if (!tbody) return;
    
    // Obtener producción total del mes calculada
    let produccionTotal = window.bonoProduccionUltimo?.cantidadFinal || 0;
    
    // Restar horas extras si existen
    const horasExtra = parseFloat(window.bonoHorasExtraProduccion || 0);
    const produccionFinal = produccionTotal - horasExtra;
    
    // Actualizar display de horas extra y total final
    const horasExtraEl = document.getElementById('bonoTotalHorasExtra');
    if (horasExtraEl) horasExtraEl.textContent = horasExtra.toLocaleString('es-CL') + ' m³';
    
    const totalFinalEl = document.getElementById('bonoTotalFinal');
    if (totalFinalEl) totalFinalEl.textContent = (produccionFinal >= 0 ? produccionFinal : 0).toLocaleString('es-CL') + ' m³';
    
    console.log('[BONO] Renderizando tabla trabajadores. Producción total:', produccionTotal, 'Horas Extra:', horasExtra, 'Final:', produccionFinal);
    
    tbody.innerHTML = window.bonoTrabajadoresState.map((t, i) => {
        // Total Bono = precio_unitario_del_trabajador * (producción_total - horas_extra)
        const precioUnitario = parseFloat(t.precio_unitario) || 0;
        const totalBono = precioUnitario * Math.max(produccionFinal, 0);
        
        console.log('[BONO] Trabajador', i+1, ':', {nombre: t.nombre, precioUnitario, produccionFinal, totalBono});
        
        return `
            <tr>
                <td>${i+1}</td>
                <td><input type="text" value="${t.nombre || ''}" placeholder="Ej: Juan Pérez" onchange="window.bonoTrabajadoresState[${i}].nombre=this.value"></td>
                <td><input type="text" value="${t.cargo || ''}" placeholder="Ej: Operador" onchange="window.bonoTrabajadoresState[${i}].cargo=this.value"></td>
                <td><input type="number" min="0" step="0.01" value="${t.precio_unitario || ''}" placeholder="Ej: 1500" onchange="window.bonoTrabajadoresState[${i}].precio_unitario=this.value;window.renderBonoTrabajadoresTabla();"></td>
                <td style="background: #FF6B35; color: #ffffff; font-weight: bold; font-size: 1.1em; padding: 12px; border-radius: 4px; text-align: right; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${totalBono.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                <td><button type="button" class="btn btn-small" onclick="window.bonoTrabajadoresState.splice(${i},1);window.renderBonoTrabajadoresTabla()">🗑️</button></td>
            </tr>
        `;
    }).join('');
}
window.renderBonoTrabajadoresTabla = renderBonoTrabajadoresTabla;
window.recalcularBonoParcial = () => {
    renderBonoTrabajadoresTabla();
};
document.getElementById('bonoAgregarTrabajador')?.addEventListener('click', () => {
    window.bonoTrabajadoresState.push({nombre:'',cargo:'',precio_unitario:''});
    renderBonoTrabajadoresTabla();
});
document.addEventListener('DOMContentLoaded', () => {
        // Restaurar pestaña activa
        const lastTab = localStorage.getItem('activeTab');
        if (lastTab) {
            switchTab(lastTab);
        } else {
            switchTab('new-report'); // o la pestaña por defecto
        }
    renderBonoTrabajadoresTabla();
});

async function calcularBonoProduccion(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const mes = document.getElementById('bonoMes').value;
    const plantaId = document.getElementById('bonoPlanta').value;
    if (!mes) return alert('Selecciona el mes');
    
    const authToken = getAuthToken();
    if (!authToken) return alert('Sesión expirada');
    
    // Convertir mes (YYYY-MM) a rango de fechas
    const [anio, mesNum] = mes.split('-');
    const primerDia = `${anio}-${mesNum}-01`;
    const ultimoDia = new Date(parseInt(anio), parseInt(mesNum), 0).toISOString().split('T')[0];
    
    console.log('[BONO] Consultando reportes:', {mes, primerDia, ultimoDia, plantaId});
    
    let res = await apiRequest(`/reports/?start_date=${primerDia}&end_date=${ultimoDia}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!res.ok) {
        console.error('[BONO] Error obteniendo reportes:', res);
        return alert('Error obteniendo reportes: ' + (res.data?.detail || res.status));
    }
    
    let reports = res.data || [];
    console.log('[BONO] Reportes obtenidos:', reports.length);
    console.log('[BONO] Datos de reports:', reports); // DEBUG
    
    // Filtrar por planta si se seleccionó
    if (plantaId) {
        reports = reports.filter(r => String(r.plant_id) === String(plantaId));
    }
    
    if (reports.length === 0) {
        console.warn('[BONO] No hay reportes para este período');
        document.getElementById('bonoTotalProduccion').textContent = '0 m³';
        document.getElementById('bonoMaterialesDetalle').innerHTML = '<p style="color: #999;">Sin reportes para este período</p>';
        return;
    }
    
    // Calcular materiales y m³
    let materialesResumen = {};
    for (const r of reports) {
        console.log('[BONO] Procesando reporte:', r); // DEBUG
        let mats = [];
        try { 
            mats = typeof r.materials === 'string' ? JSON.parse(r.materials) : (r.materials || []); 
            console.log('[BONO] Materiales parseados:', mats); // DEBUG
        } catch(e) { 
            console.error('[BONO] Error parseando materiales:', e);
        }
        for (const m of mats) {
            materialesResumen[m.material_id] = (materialesResumen[m.material_id] || 0) + (Number(m.m3) || 0);
        }
    }
    
    console.log('[BONO] Resumen materiales:', materialesResumen); // DEBUG
    
    // Suma/resta
    let totalSuma = 0, totalResta = 0, totalArena = 0, totalMovil = 0;
    for (const r of reports) {
        let mats = [];
        try { mats = typeof r.materials === 'string' ? JSON.parse(r.materials) : (r.materials || []); } catch {}
        const plant = (window.MASTERS?.plants || []).find(p => p.id === r.plant_id);
        const esMovil = plant && plant.tipo === 'movil';
        const esResta = plant && plant.es_resta;
        for (const m of mats) {
            // Arena siempre se resta
            const matObj = (window.MASTERS?.materials || []).find(mat => mat.id === m.material_id);
            const isArena = matObj && matObj.name && matObj.name.toLowerCase().includes('arena');
            if (isArena) {
                totalArena += Number(m.m3) || 0;
                continue;
            }
            if (esMovil) {
                totalMovil += Number(m.m3) || 0;
            } else if (esResta) {
                totalResta += Number(m.m3) || 0;
            } else {
                totalSuma += Number(m.m3) || 0;
            }
        }
    }
    
    const cantidadFinal = totalSuma - totalResta - totalArena;
    
    console.log('[BONO] Cálculo final:', {totalSuma, totalResta, totalArena, cantidadFinal});
    console.log('[BONO] MASTERS materiales:', window.MASTERS?.materials); // DEBUG
    
    // Guardar en window para usar en tabla
    window.bonoProduccionUltimo = {
        mes, plantaId, totalSuma, totalResta, totalArena, totalMovil, cantidadFinal, materialesResumen
    };
    
    // Actualizar UI - Producción Total
    document.getElementById('bonoTotalProduccion').textContent = cantidadFinal.toLocaleString('es-CL') + ' m³';
    
    // Tabla de materiales con mejor formato
    let materialesTable = `<table class='materials-table' style='width:100%;'><thead><tr><th style="text-align:left;">Material</th><th style="text-align:right;">m³</th></tr></thead><tbody>`;
    const matsList = window.MASTERS?.materials || [];
    console.log('[BONO] Lista de materiales disponibles:', matsList); // DEBUG
    
    let totalM3Mostrado = 0;
    Object.entries(materialesResumen).forEach(([matId, m3]) => {
        const matObj = matsList.find(m => m.id == matId);
        const materialNombre = matObj ? matObj.name : `Material #${matId}`;
        console.log('[BONO] Agregando fila:', {matId, m3, materialNombre}); // DEBUG
        materialesTable += `<tr><td>${materialNombre}</td><td style="text-align:right; font-weight:bold;">${m3.toLocaleString('es-CL')}</td></tr>`;
        totalM3Mostrado += m3;
    });
    materialesTable += `<tr style="background: #2e7d32; font-weight:bold; color: white;"><td>TOTAL</td><td style="text-align:right;">${totalM3Mostrado.toLocaleString('es-CL')}</td></tr>`;
    materialesTable += '</tbody></table>';
    
    console.log('[BONO] HTML tabla generado:', materialesTable); // DEBUG
    document.getElementById('bonoMaterialesDetalle').innerHTML = materialesTable;
    
    // Re-render tabla de trabajadores con nuevos bonos
    renderBonoTrabajadoresTabla();
}

// Guardar bono de producción al servidor
async function guardarBonoProduccion() {
    const authToken = getAuthToken();
    if (!authToken) return alert('Sesión expirada');
    
    const mes = document.getElementById('bonoMes').value;
    const plantaId = document.getElementById('bonoPlanta').value || null;
    
    if (!mes) return alert('Selecciona el mes para guardar');
    
    // Obtener datos de la tabla de trabajadores
    const trabajadores = window.bonoTrabajadoresState || [];
    if (trabajadores.length === 0) {
        return alert('No hay trabajadores para guardar');
    }
    
    // Calcular totales
    const bonoData = window.bonoProduccionUltimo || {};
    const horasExtra = window.bonoHorasExtraProduccion || 0;
    const produccionTotal = bonoData.cantidadFinal || 0;
    const totalBono = trabajadores.reduce((sum, t) => sum + (Number(t.total_bono) || 0), 0);
    
    const payload = {
        mes: mes,
        plant_id: plantaId ? parseInt(plantaId) : null,
        produccion_total: produccionTotal,
        horas_extra: horasExtra,
        trabajadores: JSON.stringify(trabajadores),
        total_bono: totalBono
    };
    
    console.log('[BONO] Guardando bono:', payload);
    
    try {
        let res = await apiRequest('/bonos/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            console.error('[BONO] Error guardando bono:', res);
            return alert('Error al guardar bono: ' + (res.data?.detail || res.status || 'Error desconocido'));
        }
        
        console.log('[BONO] Bono guardado exitosamente:', res.data);
        alert('✅ Bono de producción guardado correctamente\n\n📍 Puedes verlo en la pestaña "Bonos Guardados"');
        
        // Limpiar formulario
        document.getElementById('bonoMes').value = '';
        document.getElementById('bonoPlanta').value = '';
        document.getElementById('bonoHorasExtra').value = '';
        document.getElementById('bonoTotalProduccion').textContent = '0 m³';
        document.getElementById('bonoMaterialesDetalle').innerHTML = '';
        document.getElementById('bonoTrabajadoresTabla').innerHTML = '';
        
        window.bonoProduccionUltimo = {};
        window.bonoTrabajadoresState = [];
        window.bonoHorasExtraProduccion = 0;
        
    } catch (error) {
        console.error('[BONO] Exception guardando bono:', error);
        alert('Error al guardar bono: ' + error.message);
    }
}

// Listar bonos guardados
async function listarBonosGuardados() {
    const authToken = getAuthToken();
    if (!authToken) return alert('Sesión expirada');
    
    const mes = document.getElementById('bonosGuardadosMes')?.value || '';
    const listaDiv = document.getElementById('bonosGuardadosLista');
    
    if (!listaDiv) return;
    listaDiv.innerHTML = '<p>Cargando...</p>';
    
    try {
        let url = '/bonos/';
        if (mes) {
            url += `?mes=${mes}`;
        }
        
        let res = await apiRequest(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!res.ok) {
            listaDiv.innerHTML = `<p style="color: #d32f2f;">Error al cargar bonos: ${res.status}</p>`;
            return;
        }
        
        const bonos = res.data || [];
        
        if (bonos.length === 0) {
            listaDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay bonos guardados</p>';
            return;
        }
        
        // Crear tabla de bonos
        let html = '<table style="width:100%; border-collapse: collapse; margin-top: 10px;">';
        html += '<thead><tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">';
        html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Mes</th>';
        html += '<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Planta</th>';
        html += '<th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Producción (m³)</th>';
        html += '<th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Horas Extra (m³)</th>';
        html += '<th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Total Bono ($)</th>';
        html += '<th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Acciones</th>';
        html += '</tr></thead><tbody>';
        
        const plantas = window.MASTERS?.plants || [];
        
        bonos.forEach((bono, idx) => {
            const planta = plantas.find(p => p.id === bono.plant_id);
            const plantaNombre = planta ? planta.name : 'Todas';
            
            html += `<tr style="border-bottom: 1px solid #eee;">`;
            html += `<td style="padding: 12px; border: 1px solid #eee;">${bono.mes}</td>`;
            html += `<td style="padding: 12px; border: 1px solid #eee;">${plantaNombre}</td>`;
            html += `<td style="padding: 12px; text-align: right; border: 1px solid #eee;">${bono.produccion_total_m3.toLocaleString('es-CL')}</td>`;
            html += `<td style="padding: 12px; text-align: right; border: 1px solid #eee;">${bono.horas_extra_m3.toLocaleString('es-CL')}</td>`;
            html += `<td style="padding: 12px; text-align: right; border: 1px solid #eee; font-weight: bold; color: #2e7d32;">$${bono.total_bono_general.toLocaleString('es-CL')}</td>`;
            html += `<td style="padding: 12px; text-align: center; border: 1px solid #eee;">`;
            html += `<button class="btn btn-small" onclick="verDetallesBono(${bono.id})">👁️ Ver</button> `;
            html += `<button class="btn btn-small" style="background: #d32f2f;" onclick="eliminarBono(${bono.id})">🗑️ Eliminar</button>`;
            html += `</td></tr>`;
        });
        
        html += '</tbody></table>';
        listaDiv.innerHTML = html;
        
    } catch (error) {
        console.error('[BONOS] Error:', error);
        listaDiv.innerHTML = `<p style="color: #d32f2f;">Error: ${error.message}</p>`;
    }
}

// Ver detalles de un bono
async function verDetallesBono(bonoId) {
    const authToken = getAuthToken();
    if (!authToken) return alert('Sesión expirada');
    
    try {
        let res = await apiRequest(`/bonos/${bonoId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!res.ok) {
            return alert('Error al obtener bono: ' + res.status);
        }
        
        const bono = res.data;
        let trabajadores = [];
        
        try {
            trabajadores = JSON.parse(bono.trabajadores) || [];
        } catch (e) {
            console.error('Error parseando trabajadores:', e);
        }
        
        // Crear contenido detallado
        let html = `<div style="padding: 20px; font-size: 14px; max-height: 600px; overflow-y: auto;">`;
        html += `<h3>Detalles del Bono - Mes: ${bono.mes}</h3>`;
        html += `<div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">`;
        html += `<p><strong>Producción Total:</strong> ${bono.produccion_total_m3.toLocaleString('es-CL')} m³</p>`;
        html += `<p><strong>Producción Final (sin horas extra):</strong> ${bono.produccion_final_m3.toLocaleString('es-CL')} m³</p>`;
        html += `<p><strong>Horas Extra descontadas:</strong> ${bono.horas_extra_m3.toLocaleString('es-CL')} m³</p>`;
        html += `<p><strong>Total Bono General:</strong> <span style="color: #2e7d32; font-weight: bold; font-size: 1.1em;">$${bono.total_bono_general.toLocaleString('es-CL')}</span></p>`;
        html += `<p style="color: #999; font-size: 0.9em; margin-top: 10px;">Creado: ${new Date(bono.created_at).toLocaleString('es-CL')}</p>`;
        html += `</div>`;
        
        // Mostrar trabajadores
        if (trabajadores.length > 0) {
            html += `<h4>Trabajadores:</h4>`;
            html += `<table style="width:100%; border-collapse: collapse;">`;
            html += `<thead><tr style="background: #e8f5e9;">`;
            html += `<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Nombre</th>`;
            html += `<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Cargo</th>`;
            html += `<th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Precio Unit.</th>`;
            html += `<th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Total Bono</th>`;
            html += `</tr></thead><tbody>`;
            
            trabajadores.forEach(t => {
                html += `<tr style="border-bottom: 1px solid #eee;">`;
                html += `<td style="padding: 8px; border: 1px solid #ddd;">${t.nombre || 'N/A'}</td>`;
                html += `<td style="padding: 8px; border: 1px solid #ddd;">${t.cargo || 'N/A'}</td>`;
                html += `<td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${(t.precio_unitario || 0).toLocaleString('es-CL')}</td>`;
                html += `<td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${(t.total_bono || 0).toLocaleString('es-CL')}</td>`;
                html += `</tr>`;
            });
            
            html += `</tbody></table>`;
        }
        
        html += `</div>`;
        
        // Crear modal para mostrar detalles
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 9999; padding: 20px;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 8px; max-width: 600px; width: 100%; padding: 20px;">
                ${html}
                <div style="text-align: right; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="this.closest('div').style.display='none'; this.parentElement.parentElement.remove();">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('[BONOS] Error:', error);
        alert('Error: ' + error.message);
    }
}

// Eliminar un bono
async function eliminarBono(bonoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este bono?')) return;
    
    const authToken = getAuthToken();
    if (!authToken) return alert('Sesión expirada');
    
    try {
        let res = await apiRequest(`/bonos/${bonoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!res.ok) {
            return alert('Error al eliminar bono: ' + res.status);
        }
        
        alert('✓ Bono eliminado correctamente');
        listarBonosGuardados(); // Actualizar lista
        
    } catch (error) {
        console.error('[BONOS] Error:', error);
        alert('Error: ' + error.message);
    }
}

// Agregar listeners para calcular automáticamente
function setupBonoAutoCalculate() {
    const bonoMes = document.getElementById('bonoMes');
    const bonoPlanta = document.getElementById('bonoPlanta');
    
    console.log('[BONO] setupBonoAutoCalculate llamado');
    console.log('[BONO] bonoMes:', bonoMes);
    console.log('[BONO] bonoPlanta:', bonoPlanta);
    
    if (bonoMes) {
        bonoMes.addEventListener('change', () => {
            console.log('[BONO] Cambio en mes detectado:', bonoMes.value);
            if (bonoMes.value) {
                calcularBonoProduccion({preventDefault: () => {}});
            }
        });
    }
    
    if (bonoPlanta) {
        bonoPlanta.addEventListener('change', () => {
            console.log('[BONO] Cambio en planta detectado');
            if (bonoMes.value) {
                calcularBonoProduccion({preventDefault: () => {}});
            }
        });
    }
}

// Descargar PDF Bono Producción (Generado en servidor)
document.getElementById('bonoDescargarPDF')?.addEventListener('click', async function() {
    console.log('[PDF] Botón clicked - iniciando descarga PDF');
    
    if (!window.bonoProduccionUltimo) return alert('❌ Primero calcula el bono');
    if (!window.bonoTrabajadoresState || window.bonoTrabajadoresState.length === 0) return alert('❌ Agrega al menos un trabajador');
    
    try {
        const authToken = getAuthToken();
        if (!authToken) return alert('Sesión expirada');
        
        const d = window.bonoProduccionUltimo;
        const horasExtra = parseFloat(window.bonoHorasExtraProduccion || 0);
        const produccionFinal = Math.max(d.cantidadFinal - horasExtra, 0);
        
        // Calcular total bono
        let totalBonoGral = 0;
        (window.bonoTrabajadoresState || []).forEach((t) => {
            const precioUnit = parseFloat(t.precio_unitario) || 0;
            totalBonoGral += precioUnit * produccionFinal;
        });
        
        // Preparar payload
        const payload = {
            mes: document.getElementById('bonoMes').value,
            plant_id: document.getElementById('bonoPlanta').value || null,
            produccion_total: d.cantidadFinal,
            produccion_final: produccionFinal,
            horas_extra: horasExtra,
            trabajadores: JSON.stringify(window.bonoTrabajadoresState),
            total_bono: totalBonoGral,
            materiales_resumen: d.materialesResumen || {}
        };
        
        console.log('[PDF] Enviando solicitud al servidor:', payload);
        
        // Hacer POST al servidor para generar PDF
        const response = await fetch(API_BASE + '/bonos/generate-pdf/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error ${response.status}`);
        }
        
        // Descargar PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bono_${payload.mes}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        console.log('[PDF] ✓ PDF descargado correctamente');
        alert('✅ PDF descargado correctamente');
        
    } catch (error) {
        console.error('[PDF] ❌ Error:', error);
        alert('❌ Error al descargar PDF: ' + error.message);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // No llamar a populateBonoProduccionSelects aquí
    // Se hace cuando se abre la pestaña en switchTab()
    setupBonoAutoCalculate();
    
    // Evento para botón Calcular
    document.getElementById('bonoCalcularBtn')?.addEventListener('click', (e) => {
        console.log('[BONO] Botón Calcular presionado');
        calcularBonoProduccion({preventDefault: () => {}});
    });
    
    // Evento para botón Aplicar Horas Extra
    document.getElementById('bonoAplicarHorasExtra')?.addEventListener('click', (e) => {
        e.preventDefault();
        const horasExtra = parseFloat(document.getElementById('bonoHorasExtra').value || 0);
        window.bonoHorasExtraProduccion = horasExtra;
        console.log('[BONO] Horas Extra aplicadas:', horasExtra);
        window.renderBonoTrabajadoresTabla();
    });
    
    document.getElementById('bonoProduccionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarBonoProduccion();
    });
    
    // Repoblar selects cuando se recargan maestros
    const origLoadMasters = window.loadMasters;
    window.loadMasters = async function() {
        await origLoadMasters.apply(this, arguments);
        populateBonoProduccionSelects();
    };
});
async function loadMasters() {
    try {
        const [plantsRes, machinesRes, trucksRes, opsRes, partsRes] = await Promise.all([
            apiRequest('/plants/'),
            apiRequest('/machinery/'),
            apiRequest('/trucks/'),
            apiRequest('/operators/'),
            apiRequest('/spare-parts/')
        ]);

        if (plantsRes.ok) populateSelect('reportPlant', plantsRes.data, true);
        // populateSelect removed for report-level selects (machines/trucks/operators/parts)

        // Also render lists in masters tab
        renderItemsList('plantsList', plantsRes.data);
        renderItemsList('machineryList', machinesRes.data);
        renderItemsList('trucksList', trucksRes.data);
        renderItemsList('operatorsList', opsRes.data);
        renderItemsList('sparePartsList', partsRes.data);

        // Cache masters for maintenance UI
        window.MASTERS = {
            plants: plantsRes.ok ? plantsRes.data : [],
            machinery: machinesRes.ok ? machinesRes.data : [],
            trucks: trucksRes.ok ? trucksRes.data : [],
            operators: opsRes.ok ? opsRes.data : [],
            spare_parts: partsRes.ok ? partsRes.data : [],
            materials: [] // se cargará abajo
        };
        await loadMaterialsFromBackend();
        // Refresh spare parts autocomplete after updating master data
        refreshSparePartsAutocomplete();
        // Refrescar tabla de materiales
        refreshMaterialsTableMasters();
        // Poblar dropdowns de camiones y maquinaria en Nuevo Reporte
        populateSelect('reportTrucks', window.MASTERS.trucks, true);
        populateSelect('reportMachinery', window.MASTERS.machinery, true);
        // Populate maintenance item select if present
        const maintType = document.getElementById('maintenanceItemType');
        if (maintType) {
            maintType.addEventListener('change', onMaintenanceTypeChange);
            document.getElementById('addMaintenanceBtn')?.addEventListener('click', registerMaintenance);
            document.getElementById('viewMaintenanceBtn')?.addEventListener('click', () => {
                const t = document.getElementById('maintenanceItemType').value;
                const id = parseInt(document.getElementById('maintenanceItemSelect').value || 0);
                if (!t || !id) return alert('Selecciona tipo y elemento');
                loadMaintenances(t, id);
                loadLastMaintenance(t, id);
            });
            document.getElementById('fetchHorometerBtn')?.addEventListener('click', async () => {
                const t = document.getElementById('maintenanceItemType').value;
                const id = parseInt(document.getElementById('maintenanceItemSelect').value || 0);
                if (!t || !id) return alert('Selecciona tipo y elemento');
                const h = await fetchLastReportHorometer(t, id);
                if (h != null) {
                    document.getElementById('currentHorometer').value = h;
                    alert('Horómetro cargado desde último reporte: ' + h);
                } else {
                    alert('No se encontró horómetro en últimos reportes');
                }
            });
            document.getElementById('computeRemainingBtn')?.addEventListener('click', () => {
                const t = document.getElementById('maintenanceItemType').value;
                const id = parseInt(document.getElementById('maintenanceItemSelect').value || 0);
                if (!t || !id) return alert('Selecciona tipo y elemento');
                computeAndShowRemaining(t, id);
            });
        }

        // Renderizar lista de materiales en Maestros
        renderMaterialsList();
    } catch (err) {
        console.error('Error cargando maestros:', err);
    }
}

function populateSelect(elementId, items, multiple) {
    const sel = document.getElementById(elementId);
    if (!sel || !items) return;
    // Clear existing
    sel.innerHTML = multiple ? '<option value="">-- Seleccionar --</option>' : '<option value="">-- Seleccionar --</option>';
    items.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it.id;
        opt.textContent = it.name || it.title || it.code || ('#' + it.id);
        sel.appendChild(opt);
    });
}

function renderItemsList(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="loading">No hay elementos.</p>';
        return;
    }
    // Infer type from containerId
    let type = '';
    if (containerId === 'plantsList') type = 'plant';
    else if (containerId === 'machineryList') type = 'machinery';
    else if (containerId === 'trucksList') type = 'truck';
    else if (containerId === 'operatorsList') type = 'operator';
    else if (containerId === 'sparePartsList') type = 'spare_part';
    container.innerHTML = items.map(it => {
        if (type === 'plant') {
            let tipo = it.tipo ? `<span class='plant-tipo'>[${it.tipo.charAt(0).toUpperCase() + it.tipo.slice(1)}]</span>` : '';
            let resta = it.es_resta ? `<span class='plant-resta' title='Esta planta se resta' style='color:#c00;font-weight:bold;'>(Resta)</span>` : '';
            return `<div class="item-badge">
                <span>${it.name}</span> ${tipo} ${resta}
                <button class="btn-delete-maestro" data-id="${it.id}" data-type="${type}" title="Eliminar">🗑️</button>
            </div>`;
        } else {
            return `<div class="item-badge">
                <span>${it.name}</span>
                <button class="btn-delete-maestro" data-id="${it.id}" data-type="${type}" title="Eliminar">🗑️</button>
            </div>`;
        }
    }).join('');
    // Add delete handlers
    container.querySelectorAll('.btn-delete-maestro').forEach(btn => {
        btn.onclick = async () => {
            if (!confirm('¿Seguro que deseas eliminar este elemento?')) return;
            const id = btn.getAttribute('data-id');
            const t = btn.getAttribute('data-type');
            let endpoint = '';
            if (t === 'plant') endpoint = `/plants/${id}`;
            else if (t === 'machinery') endpoint = `/machinery/${id}`;
            else if (t === 'truck') endpoint = `/trucks/${id}`;
            else if (t === 'operator') endpoint = `/operators/${id}`;
            else if (t === 'spare_part') endpoint = `/spare-parts/${id}`;
            if (!endpoint) return;
            try {
                const res = await apiRequest(endpoint, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error(res.data?.detail || 'Error eliminando');
                loadMasters();
            } catch (err) {
                alert('Error eliminando: ' + (err.message || err));
            }
        };
    });
    // No repeated renderItemsList calls here
}

// ===== MANTENCIONES =====
function onMaintenanceTypeChange(e) {
    const type = e.target.value;
    const sel = document.getElementById('maintenanceItemSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar --</option>';
    if (!type) return;
    const list = (window.MASTERS && window.MASTERS[type]) || [];
    list.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it.id;
        opt.textContent = it.name;
        sel.appendChild(opt);
    });
}

async function registerMaintenance() {
    const type = document.getElementById('maintenanceItemType').value;
    const itemId = parseInt(document.getElementById('maintenanceItemSelect').value || 0);
    if (!type || !itemId) return alert('Selecciona tipo y elemento');

    const serviceDateInput = document.getElementById('maintenanceDate').value;
    const serviceDate = serviceDateInput ? new Date(serviceDateInput).toISOString() : null;
    const hours = parseFloat(document.getElementById('maintenanceHours').value || '0');
    const interval = parseFloat(document.getElementById('maintenanceInterval').value || '0');
    const qty = parseInt(document.getElementById('maintenanceQty').value || '0');
    const location = document.getElementById('maintenanceLocation').value || '';
    const notes = document.getElementById('maintenanceNotes').value || '';

    // basic client-side validation
    if (interval !== null && !isNaN(interval) && interval < 0) return alert('Intervalo no puede ser negativo');
    if (hours !== null && !isNaN(hours) && hours < 0) return alert('Horas no pueden ser negativas');

    const payload = {
        item_type: type,
        item_id: itemId,
        service_date: serviceDate,
        hours_at_service: isNaN(hours) ? null : hours,
        interval_hours: isNaN(interval) ? null : interval,
        quantity_changed: isNaN(qty) ? null : qty,
        location,
        notes
    };

    try {
        const res = await apiRequest('/maintenances/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(res.data?.detail || 'Error registrando mantención');
        alert('Mantención registrada');
        // refresh
        loadMaintenances(type, itemId);
        loadLastMaintenance(type, itemId);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function loadMaintenances(item_type, item_id) {
    try {
        const url = `/maintenances?item_type=${encodeURIComponent(item_type)}&item_id=${item_id}`;
        const res = await apiRequest(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const container = document.getElementById('maintenanceHistory');
        if (!container) return;
        if (!res.ok) {
            container.innerHTML = '<p class="loading">Error cargando mantenciones.</p>';
            return;
        }
        const rows = res.data || [];
        if (rows.length === 0) {
            container.innerHTML = '<p class="loading">No hay mantenciones registradas.</p>';
            return;
        }
        container.innerHTML = rows.map(r => `
            <div class="item-badge">
                <strong>${new Date(r.service_date).toLocaleString()}</strong>
                <div>Horas: ${r.hours_at_service ?? '-'} | Intervalo: ${r.interval_hours ?? '-'} | Cant: ${r.quantity_changed ?? '-'}</div>
                <div>Ubicación: ${r.location || '-'} | Notas: ${r.notes || '-'}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadLastMaintenance(item_type, item_id) {
    try {
        const url = `/maintenances/last?item_type=${encodeURIComponent(item_type)}&item_id=${item_id}`;
        const res = await apiRequest(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const box = document.getElementById('lastMaintenanceBox');
        if (!box) return;
        if (!res.ok) {
            box.innerHTML = '<p class="loading">No hay última mantención.</p>';
            return;
        }
        const m = res.data;
        const nextDue = (m.hours_at_service != null && m.interval_hours != null) ? (m.hours_at_service + m.interval_hours) : null;
        box.innerHTML = `
            <div><strong>Última mantención:</strong> ${new Date(m.service_date).toLocaleString()}</div>
            <div>Horas en servicio: ${m.hours_at_service}</div>
            <div>Intervalo (hrs): ${m.interval_hours}</div>
            <div>Próxima mantención a las: ${nextDue} hrs (horómetro)</div>
        `;
    } catch (err) {
        console.error(err);
    }
}

async function fetchLastReportHorometer(item_type, item_id) {
    try {
        const res = await apiRequest('/reports/', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return null;
        const reports = res.data || [];
        // Iterate from newest to oldest
        for (let i = reports.length - 1; i >= 0; i--) {
            const r = reports[i];
            // machinery_ids, truck_ids, spare_part_ids may be JSON strings
            const parseList = (v) => {
                if (!v) return [];
                if (Array.isArray(v)) return v;
                try { return JSON.parse(v); } catch { return []; }
            };
            if (item_type === 'machinery') {
                const list = parseList(r.machinery_ids);
                if (list.includes(item_id)) return r.horometer_end ?? null;
            } else if (item_type === 'truck') {
                const list = parseList(r.truck_ids);
                if (list.includes(item_id)) return r.horometer_end ?? null;
            } else if (item_type === 'operator') {
                if (r.operator_id === item_id) return r.horometer_end ?? null;
            } else if (item_type === 'plant') {
                if (r.plant_id === item_id) return r.horometer_end ?? null;
            } else if (item_type === 'spare_part') {
                const list = parseList(r.spare_part_ids);
                if (list.includes(item_id)) return r.horometer_end ?? null;
            }
        }
        return null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function computeAndShowRemaining(item_type, item_id) {
    // Load last maintenance
    try {
        const lastRes = await apiRequest(`/maintenances/last?item_type=${encodeURIComponent(item_type)}&item_id=${item_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!lastRes.ok) return alert('No hay última mantención para calcular');
        const m = lastRes.data;
        if (m.hours_at_service == null || m.interval_hours == null) return alert('La última mantención no tiene horas o intervalo definidos');
        const nextDue = m.hours_at_service + m.interval_hours;
        const current = parseFloat(document.getElementById('currentHorometer').value || '0');
        if (isNaN(current)) return alert('Horómetro actual inválido');
        const remaining = nextDue - current;
        const box = document.getElementById('lastMaintenanceBox');
        box.innerHTML = `
            <div><strong>Última mantención:</strong> ${new Date(m.service_date).toLocaleString()}</div>
            <div>Horas en servicio: ${m.hours_at_service}</div>
            <div>Intervalo (hrs): ${m.interval_hours}</div>
            <div>Próxima mantención a las: ${nextDue} hrs (horómetro)</div>
            <div><strong>Horas restantes:</strong> ${remaining >= 0 ? remaining.toFixed(1) + ' hrs' : 'Atrasado en ' + Math.abs(remaining).toFixed(1) + ' hrs'}</div>
        `;
    } catch (err) {
        console.error(err);
        alert('Error calculando horas restantes');
    }
}

async function addPlant() {
    const name = document.getElementById('newPlantName').value.trim();
    const desc = document.getElementById('newPlantDesc').value.trim();
    const tipo = document.getElementById('newPlantTipo').value;
    const esResta = document.getElementById('newPlantEsResta').checked;
    if (!name) return alert('Ingresa el nombre de la planta');
    try {
        const res = await apiRequest('/plants/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, description: desc, tipo, es_resta: esResta })
        });
        if (!res.ok) throw new Error(res.data?.detail || 'Error creando planta');
        document.getElementById('newPlantName').value = '';
        document.getElementById('newPlantDesc').value = '';
        document.getElementById('newPlantTipo').value = '';
        document.getElementById('newPlantEsResta').checked = false;
        loadMasters();
    } catch (err) { alert('Error: ' + err.message); }
}

async function addMachinery() {
    const name = document.getElementById('newMachineryName').value.trim();
    const desc = document.getElementById('newMachineryDesc').value.trim();
    if (!name) return alert('Ingresa el nombre de la maquinaria');
    try {
        const res = await apiRequest('/machinery/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, description: desc })
        });
        if (!res.ok) throw new Error(res.data?.detail || 'Error creando maquinaria');
        document.getElementById('newMachineryName').value = '';
        document.getElementById('newMachineryDesc').value = '';
        loadMasters();
    } catch (err) { alert('Error: ' + err.message); }
}

async function addTruck() {
    const name = document.getElementById('newTruckName').value.trim();
    const plate = document.getElementById('newTruckPlate').value.trim();
    const desc = document.getElementById('newTruckDesc').value.trim();
    if (!name) return alert('Ingresa el nombre del camión');
    try {
        const res = await apiRequest('/trucks/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, plate, description: desc })
        });
        if (!res.ok) throw new Error(res.data?.detail || 'Error creando camión');
        document.getElementById('newTruckName').value = '';
        document.getElementById('newTruckPlate').value = '';
        document.getElementById('newTruckDesc').value = '';
        loadMasters();
    } catch (err) { alert('Error: ' + err.message); }
}

async function addOperator() {
    const name = document.getElementById('newOperatorName').value.trim();
    const desc = document.getElementById('newOperatorDesc').value.trim();
    if (!name) return alert('Ingresa el nombre del operador');
    try {
        const res = await apiRequest('/operators/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, description: desc })
        });
        if (!res.ok) throw new Error(res.data?.detail || 'Error creando operador');
        document.getElementById('newOperatorName').value = '';
        document.getElementById('newOperatorDesc').value = '';
        loadMasters();
    } catch (err) { alert('Error: ' + err.message); }
}

async function addSparePart() {
    const name = document.getElementById('newSparePartName').value.trim();
    const code = document.getElementById('newSparePartCode').value.trim();
    const desc = document.getElementById('newSparePartDesc').value.trim();
    if (!name) return alert('Ingresa el nombre del repuesto');
    try {
        const res = await apiRequest('/spare-parts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, code, description: desc })
        });
        if (!res.ok) throw new Error(res.data?.detail || 'Error creando repuesto');
        document.getElementById('newSparePartName').value = '';
        document.getElementById('newSparePartCode').value = '';
        document.getElementById('newSparePartDesc').value = '';
        loadMasters();
    } catch (err) { alert('Error: ' + err.message); }
}

async function loadReports() {
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) return;

    reportsList.innerHTML = '<p class="loading">⏳ Cargando reportes...</p>';
    if (reportsCount) reportsCount.innerHTML = '';
    
    const authToken = getAuthToken();
    if (!authToken) {
        reportsList.innerHTML = '<p class="loading">⚠️ Sesión expirada. Por favor, inicia sesión nuevamente.</p>';
        return;
    }

    try {
        let url = `${API_BASE}/reports/`;
        const startDate = document.getElementById('filterStartDate')?.value;
        const endDate = document.getElementById('filterEndDate')?.value;

        if (startDate) url += `?start_date=${startDate}`;
        if (endDate) url += (startDate ? '&' : '?') + `end_date=${endDate}`;

        console.log('[REPORTS] Cargando reportes desde:', url);

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            console.error('[REPORTS] Error en respuesta:', response.status, response.statusText);
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }

        const reports = await response.json();
        console.log('[REPORTS] Reportes cargados:', reports.length);
        
        if (reportsCount) {
            const filterText = startDate || endDate ? ` (filtrados: ${startDate ? startDate + ' a ' : ''}${endDate || 'hoy'})` : '';
            reportsCount.innerHTML = `<strong>Total de reportes: ${reports.length}</strong>${filterText}`;
        }

        if (reports.length === 0) {
            reportsList.innerHTML = '<p class="loading">📭 No hay reportes registrados' + (startDate || endDate ? ' para el período seleccionado.' : '.') + '</p>';
            return;
        }

        reportsList.innerHTML = reports.map(report => {
            // Parsear campos JSON si es necesario
            let trucks = [];
            let machinery = [];
            let materials = [];
            try {
                trucks = report.truck_ids ? JSON.parse(report.truck_ids) : [];
            } catch {}
            try {
                machinery = report.machinery_ids ? JSON.parse(report.machinery_ids) : [];
            } catch {}
            try {
                materials = report.materials ? JSON.parse(report.materials) : [];
            } catch {}
            return `
            <div class="report-item" data-report-id="${report.id}">
                <div class="report-header">
                    <div>
                        <div class="report-date">📅 ${formatDate(report.date)}</div>
                        <div class="report-plant">Planta: ${report.plant}</div>
                    </div>
                    <div class="report-actions">
                        <a href="${API_BASE}/reports/${report.id}/pdf" class="btn-pdf" download="reporte_${report.id}.pdf">📥 Descargar PDF</a>
                        <button class="btn-edit-report" data-id="${report.id}" title="Editar">✏️ Editar</button>
                        <button class="btn-delete-report" data-id="${report.id}" title="Eliminar">🗑️ Eliminar</button>
                    </div>
                </div>
                <div class="report-details">
                    ${report.horometer_start ? `<div class="detail"><span class="detail-label">Horómetro Inicio:</span> ${report.horometer_start}</div>` : ''}
                    ${report.horometer_end ? `<div class="detail"><span class="detail-label">Horómetro Final:</span> ${report.horometer_end}</div>` : ''}
                    ${trucks.length ? `<div class="detail"><span class="detail-label">Camiones:</span> ${trucks.join(', ')}</div>` : ''}
                    ${machinery.length ? `<div class="detail"><span class="detail-label">Maquinaria:</span> ${machinery.join(', ')}</div>` : ''}
                    ${materials.length ? `<div class="detail"><span class='detail-label'>Producción por material:</span><table class='materials-table' style='margin:8px 0;'><thead><tr><th>Material</th><th>m³</th></tr></thead><tbody>${materials.map(m => `<tr><td>${m.material_id}</td><td>${m.m3}</td></tr>`).join('')}</tbody></table></div>` : ''}
                    ${report.total_m3 ? `<div class="detail"><span class="detail-label">Cantidad total (m³):</span> ${report.total_m3}</div>` : ''}
                    ${report.downtime_min ? `<div class="detail"><span class="detail-label">Minutos muertos:</span> ${report.downtime_min}</div>` : ''}
                    ${report.maintenances ? `<div class="detail"><span class="detail-label">Mantenciones:</span> ${report.maintenances}</div>` : ''}
                </div>
            </div>
            `;
        }).join('');

        // Add event listeners for edit/delete buttons
        reportsList.querySelectorAll('.btn-delete-report').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                if (!confirm('¿Seguro que deseas eliminar este reporte?')) return;
                try {
                    const deleteToken = getAuthToken();
                    const response = await fetch(`${API_BASE}/reports/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${deleteToken}` }
                    });
                    if (!response.ok) throw new Error('Error eliminando reporte');
                    loadReports();
                } catch (err) {
                    alert('Error eliminando reporte: ' + (err.message || err));
                }
            });
        });
        reportsList.querySelectorAll('.btn-edit-report').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                // Load report data and fill the form for editing
                try {
                    const editToken = getAuthToken();
                    const response = await fetch(`${API_BASE}/reports/${id}`, {
                        headers: { 'Authorization': `Bearer ${editToken}` }
                    });
                    if (!response.ok) throw new Error('Error obteniendo reporte');
                    const report = await response.json();
                    // Fill form fields
                    switchTab('new-report');
                    document.getElementById('reportDate').value = report.date;
                    document.getElementById('reportPlant').value = report.plant_id;
                    document.getElementById('reportHorometerStart').value = report.horometer_start || '';
                    document.getElementById('reportHorometerEnd').value = report.horometer_end || '';
                    document.getElementById('reportTrucks').value = report.truck_id || '';
                    document.getElementById('reportMachinery').value = report.machinery_id || '';
                    document.getElementById('reportOperator').value = report.operator_id || '';
                    // Materials table
                    if (report.materials) {
                        let materials = report.materials;
                        if (typeof materials === 'string') {
                            try { materials = JSON.parse(materials); } catch { materials = []; }
                        }
                        setMaterialsTableData(materials);
                    }
                    document.getElementById('reportTotalM3').value = report.total_m3 || '';
                    document.getElementById('reportDowntimeMin').value = report.downtime_min || '';
                    document.getElementById('reportMaintenances').value = report.maintenances || '';
                    // Store editing id
                    window.editingReportId = id;
                } catch (err) {
                    alert('Error cargando reporte para editar: ' + (err.message || err));
                }
            });
        });
    } catch (error) {
        console.error('[REPORTS] Error:', error);
        reportsList.innerHTML = '<p class="loading">❌ Error cargando reportes. Por favor, intenta nuevamente.<br><small>' + error.message + '</small></p>';
    }
}

function applyFilters() {
    loadReports();
}

function clearFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    loadReports();
}

// ===== UTILIDADES =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// ===== VITRINA (monitor) =====
async function awaitLoadMastersAndRenderVitrina() {
    if (!window.MASTERS) {
        await loadMasters();
    }
}

function renderVitrinaCard(item, item_type, remaining, nextDue, lastService) {
    const card = document.createElement('div');
    card.className = 'vitrina-card';

    let stateClass = 'vitrina-green';
    let statusText = '✅ OK';
    let statusColor = '#4CAF50';
    
    if (remaining == null) {
        stateClass = 'vitrina-grey';
        statusText = '❓ N/A';
        statusColor = '#999';
    }
    else if (remaining <= 0) {
        stateClass = 'vitrina-red';
        statusText = '🔴 ¡ATRASADO!';
        statusColor = '#d32f2f';
    }
    else if (remaining <= 100) {
        stateClass = 'vitrina-yellow';
        statusText = '🟡 PRÓXIMO';
        statusColor = '#f9a825';
    }
    
    const lastServiceDate = lastService ? new Date(lastService).toLocaleDateString('es-ES') : '-';
    const lastServiceTime = lastService ? new Date(lastService).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'}) : '-';
    const remainingText = remaining == null ? '-' : (remaining <= 0 ? Math.abs(remaining).toFixed(1) + ' hrs' : remaining.toFixed(1) + ' hrs');

    card.innerHTML = `
        <div class="vitrina-card-inner ${stateClass}">
            <div class="vitrina-title">${item.name}</div>
            <div class="vitrina-type">${item_type.toUpperCase()}</div>
            <div style="border-top: 1px solid rgba(0,0,0,0.1); margin: 8px 0; padding-top: 8px;">
                <div class="vitrina-last">
                    <strong>Última:</strong> ${lastServiceDate}<br>
                    <span style="font-size:0.85em;color:#666;">${lastServiceTime}</span>
                </div>
                <div class="vitrina-next" style="margin-top: 4px;">
                    <strong>Próxima due:</strong> ${nextDue != null ? nextDue.toFixed(1) + ' hrs' : '-'}<br>
                </div>
            </div>
            <div style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px; margin-top: 8px; text-align: center;">
                <div style="font-size:0.9em;color:#666;">Estado</div>
                <div style="font-size:1.2em;font-weight:bold;color:${statusColor};">${statusText}</div>
                <div style="font-size:0.85em;margin-top: 4px;">Falta: <strong>${remainingText}</strong></div>
            </div>
        </div>
    `;
    return card;
}

async function getRemainingForItem(item_type, item_id) {
    try {
        const lastRes = await apiRequest(`/maintenances/last?item_type=${encodeURIComponent(item_type)}&item_id=${item_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const last = lastRes.ok ? lastRes.data : null;

        const current = await fetchLastReportHorometer(item_type, item_id);

        if (!last || last.hours_at_service == null || last.interval_hours == null) {
            return { remaining: null, nextDue: null, lastService: last ? last.service_date : null };
        }
        const nextDue = last.hours_at_service + last.interval_hours;
        const remaining = (current == null) ? null : (nextDue - current);
        return { remaining, nextDue, lastService: last.service_date };
    } catch (err) {
        console.error('Error getting remaining for item', err);
        return { remaining: null, nextDue: null, lastService: null };
    }
}

async function renderVitrina() {
    const grid = document.getElementById('vitrinaGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading">Cargando vitrina...</p>';

    // Ensure masters are loaded
    if (!window.MASTERS) await loadMasters();

    const types = ['machinery', 'truck', 'plant', 'operator', 'spare_parts'];
    const cards = [];
    for (const t of types) {
        const list = (window.MASTERS && window.MASTERS[t]) ? window.MASTERS[t] : [];
        for (const item of list) {
            const apiType = t === 'spare_parts' ? 'spare_part' : t;
            const { remaining, nextDue, lastService } = await getRemainingForItem(apiType, item.id);
            const card = renderVitrinaCard(item, apiType, remaining, nextDue, lastService);
            cards.push(card);
        }
    }

    if (cards.length === 0) {
        grid.innerHTML = '<p class="loading">No hay elementos para mostrar.</p>';
        return;
    }

    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    cards.forEach(c => frag.appendChild(c));
    grid.appendChild(frag);
}

// ===== Quick register helpers for Nuevo Reporte (plant-only) =====
async function registerQuickMaintenance(e) {
    e && e.preventDefault && e.preventDefault();
    const plantId = parseInt(document.getElementById('reportPlant').value || 0);
    if (!plantId) return alert('Selecciona la planta en el formulario del reporte antes de registrar la mantención');

    // Obtener token fresco
    const authToken = getAuthToken();
    if (!authToken) return alert('Sesión expirada. Por favor, inicia sesión nuevamente.');

    // Use report date as service date
    const reportDateVal = document.getElementById('reportDate')?.value;
    const serviceDate = reportDateVal ? new Date(reportDateVal + 'T00:00:00').toISOString() : new Date().toISOString();

    const notes = document.getElementById('nrMaintenanceNotes')?.value || '';
    const details = document.getElementById('nrMaintenanceDetails')?.value || '';
    // Get selected spare parts from autocomplete (with qty)
    let spare_parts = [];
    if (window.getSelectedSpareParts) {
        spare_parts = window.getSelectedSpareParts(); // [{id, qty}]
    }

    const payload = {
        item_type: 'plant',
        item_id: plantId,
        service_date: serviceDate,
        hours_at_service: null,
        interval_hours: null,
        quantity_changed: null,
        location: null,
        notes,
        spare_parts, // [{id, qty}]
        details
    };

    try {
        console.log('[MAINTENANCE] Enviando mantención...');
        
        const res = await apiRequest('/maintenances/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(payload)
        });
        
        console.log('[MAINTENANCE] Response:', res);
        
        if (!res.ok) throw new Error(res.data?.detail || 'Error registrando mantención');
        alert('Mantención de planta registrada correctamente');
        document.getElementById('nrMaintenanceNotes').value = '';
        await loadNrMaintenanceHistory(plantId);
        await loadNrLastMaintenance(plantId);
    } catch (err) {
        console.error('[MAINTENANCE] Error:', err);
        alert('Error registrando mantención: ' + (err.message || err));
    }
}

async function loadNrMaintenanceHistory(plantId) {
    try {
        const authToken = getAuthToken();
        console.log('[MAINTENANCE] Cargando historial para planta:', plantId);
        const res = await apiRequest(`/maintenances?item_type=plant&item_id=${plantId}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const container = document.getElementById('nrMaintenanceHistory');
        if (!container) return;
        if (!res.ok) {
            console.warn('[MAINTENANCE] Error en respuesta:', res);
            container.innerHTML = '<p class="loading">Error cargando historial.</p>';
            return;
        }
        const rows = res.data || [];
        if (rows.length === 0) {
            container.innerHTML = '<div class="maintenance-info"><p style="color:#888;">Sin mantenciones registradas para esta planta.</p></div>';
            return;
        }
        console.log('[MAINTENANCE] Historial cargado:', rows.length, 'registros');
        // Ordenar por fecha descendente
        rows.sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
        const lastMaint = rows[0]; // Última mantención
        const sparePartsDict = (window.MASTERS && window.MASTERS.spare_parts)
            ? Object.fromEntries(window.MASTERS.spare_parts.map(sp => [sp.id, sp.name])) : {};
        
        let repuestosUltima = '-';
        if (lastMaint.spare_part_ids && Array.isArray(lastMaint.spare_part_ids) && lastMaint.spare_part_ids.length > 0) {
            repuestosUltima = lastMaint.spare_part_ids.map(id => sparePartsDict[id] || id).join(', ');
        }
        
        const lastDate = new Date(lastMaint.service_date);
        const now = new Date();
        const diffHours = (now - lastDate) / (1000 * 60 * 60);
        
        let timeAgoText = '';
        if (diffHours < 1) timeAgoText = 'Hace menos de 1 hora';
        else if (diffHours < 24) timeAgoText = `Hace ${Math.floor(diffHours)} horas`;
        else if (diffHours < 168) timeAgoText = `Hace ${Math.floor(diffHours / 24)} días`;
        else timeAgoText = `Hace ${Math.floor(diffHours / 168)} semanas`;
        
        let nextDueText = '⏳ Próxima a definir (sin intervalo)';
        if (lastMaint.interval_hours && lastMaint.hours_at_service != null) {
            const nextDueHours = lastMaint.interval_hours;
            const nextDueData = new Date(lastDate.getTime() + nextDueHours * 60 * 60 * 1000);
            if (nextDueData < now) {
                nextDueText = '🔴 ¡ATRASADA! Última: ' + lastDate.toLocaleDateString('es-ES');
            } else {
                const remainingHours = (nextDueData - now) / (1000 * 60 * 60);
                if (remainingHours < 24) {
                    nextDueText = '🟡 PRÓXIMA EN: ' + Math.floor(remainingHours) + ' horas';
                } else {
                    nextDueText = '🟢 Próxima en: ' + Math.floor(remainingHours / 24) + ' días';
                }
            }
        }
        
        container.innerHTML = `
            <div class="maintenance-info">
                <div class="maintenance-last">
                    <h4>📋 Última Mantención</h4>
                    <div class="info-row">
                        <span class="label">Fecha:</span>
                        <span class="value">${lastDate.toLocaleDateString('es-ES')} ${lastDate.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Hace:</span>
                        <span class="value">${timeAgoText}</span>
                    </div>
                    ${lastMaint.hours_at_service != null ? `<div class="info-row"><span class="label">Horómetro:</span><span class="value">${lastMaint.hours_at_service} hrs</span></div>` : ''}
                    <div class="info-row">
                        <span class="label">Repuestos:</span>
                        <span class="value">${repuestosUltima}</span>
                    </div>
                    ${lastMaint.notes ? `<div class="info-row"><span class="label">Notas:</span><span class="value">${lastMaint.notes}</span></div>` : ''}
                </div>
                <div class="maintenance-next">
                    <h4>⏰ Próxima Mantención</h4>
                    <div class="info-row" style="font-size: 1.1em; font-weight: bold; color: ${nextDueText.includes('ATRA') ? '#d32f2f' : nextDueText.includes('PRÓXIMA') ? '#f9a825' : '#388e3c'};">
                        ${nextDueText}
                    </div>
                    ${lastMaint.interval_hours ? `<div class="info-row"><span class="label">Intervalo:</span><span class="value">${lastMaint.interval_hours} horas</span></div>` : ''}
                </div>
            </div>
            <div class="maintenance-history">
                <h4>📊 Historial Completo (últimas 5)</h4>
                <div class="history-list">
                    ${rows.slice(0, 5).map((r, i) => {
                        let repuestos = '-';
                        if (r.spare_part_ids && Array.isArray(r.spare_part_ids) && r.spare_part_ids.length > 0) {
                            repuestos = r.spare_part_ids.map(id => sparePartsDict[id] || id).join(', ');
                        }
                        return `
                            <div class="history-item ${i === 0 ? 'latest' : ''}">
                                <div class="history-date">${new Date(r.service_date).toLocaleDateString('es-ES', {month: 'short', day: 'numeric', year: '2-digit'})}</div>
                                <div class="history-details">
                                    <div>Repuestos: ${repuestos}</div>
                                    ${r.hours_at_service != null ? `<div>Horómetro: ${r.hours_at_service} hrs</div>` : ''}
                                    ${r.notes ? `<div style="font-size:0.9em;color:#666;">Notas: ${r.notes}</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        console.error('[MAINTENANCE] Error cargando historial:', err);
    }
}

async function loadNrLastMaintenance(plantId) {
    try {
        const authToken = getAuthToken();
        console.log('[MAINTENANCE] Loading last maintenance...');
        
        const res = await apiRequest(`/maintenances/last?item_type=plant&item_id=${plantId}`, { 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        });
        const box = document.getElementById('nrLastMaintenanceBox');
        if (!box) return;
        if (!res.ok) {
            box.innerHTML = '<p class="loading">No hay última mantención.</p>';
            return;
        }
        const m = res.data;
        box.innerHTML = `
            <div><strong>Última mantención:</strong> ${new Date(m.service_date).toLocaleString()}</div>
            <div>Notas: ${m.notes || '-'}</div>
        `;
    } catch (err) {
        console.error('[MAINTENANCE] Error loading last maintenance:', err);
    }
}


// ========== GESTIÓN DE USUARIOS ==========

async function loadUsuarios() {
    try {
        const authToken = getAuthToken();
        const res = await apiRequest('/users/', { 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        });
        
        if (!res.ok) {
            showUsuariosError('Error cargando usuarios: ' + (res.data?.detail || 'Error desconocido'));
            return;
        }
        
        const usuarios = res.data || [];
        const tbody = document.querySelector('#usuariosTabla tbody');
        if (!tbody) return;
        
        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay usuarios registrados.</td></tr>';
            return;
        }
        
        tbody.innerHTML = usuarios.map((user, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.role === 'admin' ? '👤 <span style="color: #d32f2f;">Administrador</span>' : '📝 Registrador'}</td>
                <td>
                    <button class="btn btn-small" onclick="openCambiarRolModal(${user.id}, '${user.username}', '${user.role}')">🔄 Cambiar Rol</button>
                    <button class="btn btn-small" style="background: #ff9800;" onclick="openResetPasswordModal(${user.id}, '${user.username}')">🔑 Resetear Contraseña</button>
                </td>
            </tr>
        `).join('');
        
        showUsuariosSuccess('Usuarios cargados correctamente');
    } catch (err) {
        console.error('[USUARIOS] Error:', err);
        showUsuariosError('Error cargando usuarios: ' + err.message);
    }
}

function openCambiarRolModal(userId, username, currentRole) {
    document.getElementById('modalUsuarioInfo').textContent = `Usuario: ${username} (Rol actual: ${currentRole === 'admin' ? 'Administrador' : 'Registrador'})`;
    document.getElementById('modalRolSelect').value = currentRole;
    document.getElementById('modalRolSelect').dataset.userId = userId;
    document.getElementById('cambiarRolModal').style.display = 'flex';
}

function closeCambiarRolModal() {
    document.getElementById('cambiarRolModal').style.display = 'none';
}

async function guardarCambioRol() {
    try {
        const userId = document.getElementById('modalRolSelect').dataset.userId;
        const newRole = document.getElementById('modalRolSelect').value;
        const authToken = getAuthToken();
        
        const res = await apiRequest(`/users/${userId}/role`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify({ role: newRole })
        });
        
        if (!res.ok) {
            showUsuariosError('Error: ' + (res.data?.detail || 'Error desconocido'));
            return;
        }
        
        showUsuariosSuccess('Rol actualizado correctamente');
        closeCambiarRolModal();
        await loadUsuarios();
    } catch (err) {
        console.error('[USUARIOS] Error:', err);
        showUsuariosError('Error: ' + err.message);
    }
}

function openResetPasswordModal(userId, username) {
    document.getElementById('modalPasswordUsuarioInfo').textContent = `Usuario: ${username}`;
    document.getElementById('modalPasswordResetBtn').dataset.userId = userId;
    document.getElementById('modalPasswordResetBtn').style.display = 'block';
    document.getElementById('passwordResultBox').style.display = 'none';
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').style.display = 'none';
}

async function resetearPassword() {
    try {
        const userId = document.getElementById('modalPasswordResetBtn').dataset.userId;
        const authToken = getAuthToken();
        
        const res = await apiRequest(`/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}` 
            }
        });
        
        if (!res.ok) {
            showUsuariosError('Error: ' + (res.data?.detail || 'Error desconocido'));
            return;
        }
        
        const data = res.data;
        document.getElementById('passwordResult').textContent = data.temporary_password;
        document.getElementById('passwordResultBox').style.display = 'block';
        document.getElementById('modalPasswordResetBtn').style.display = 'none';
        showUsuariosSuccess(data.message);
    } catch (err) {
        console.error('[USUARIOS] Error:', err);
        showUsuariosError('Error: ' + err.message);
    }
}

function copyPasswordToClipboard() {
    const password = document.getElementById('passwordResult').textContent;
    navigator.clipboard.writeText(password).then(() => {
        showUsuariosSuccess('✅ Contraseña copiada al portapapeles');
    }).catch(err => {
        console.error('Error copiando:', err);
    });
}

function showUsuariosError(msg) {
    const errorEl = document.getElementById('usuariosError');
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function showUsuariosSuccess(msg) {
    const successEl = document.getElementById('usuariosSuccess');
    if (!successEl) return;
    successEl.textContent = msg;
    successEl.classList.remove('hidden');
    setTimeout(() => successEl.classList.add('hidden'), 3000);
}
