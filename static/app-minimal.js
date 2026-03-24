console.log('[APP] Cargando app-minimal.js - START');

// ===== VARIABLES GLOBALES =====
let token = localStorage.getItem('token');
let currentUsername = localStorage.getItem('username');
const API_BASE = window.location.origin;
window.MASTERS = { plants: [], machinery: [], trucks: [], operators: [], spare_parts: [], materials: [] };

console.log('[APP] Token from localStorage:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
console.log('[APP] Username from localStorage:', currentUsername);

// ===== UTILIDADES =====
function formatNumber(num, decimals = 1) {
    const n = parseFloat(num);
    if (isNaN(n)) return '0';
    const formatted = n.toFixed(decimals);
    return formatted.endsWith('.0') || formatted.endsWith(',0') ? formatted.slice(0, -2) : formatted;
}

function formatCurrency(num) {
    const n = parseFloat(num);
    if (isNaN(n)) return '$0';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

async function apiRequest(endpoint, options = {}) {
    try {
        const url = API_BASE + endpoint;
        // Ensure headers object exists
        if (!options.headers) options.headers = {};
        
        // Get the latest token from localStorage
        const currentToken = localStorage.getItem('token');
        console.log('[API-DEBUG]', endpoint, '- Token from localStorage:', currentToken ? currentToken.substring(0, 20) + '...' : 'EMPTY');
        
        // Add Authorization header if token exists
        if (currentToken) {
            options.headers['Authorization'] = `Bearer ${currentToken}`;
            console.log('[API-DEBUG]', endpoint, '- Authorization header added:', options.headers['Authorization'].substring(0, 30) + '...');
        } else {
            console.warn('[API-DEBUG] No token available in localStorage');
        }
        
        console.log('[API-DEBUG]', endpoint, '- Final headers:', options.headers);
        console.log('[API] Request:', options.method || 'GET', endpoint, 'Headers:', Object.keys(options.headers));
        
        const response = await fetch(url, options);
        console.log('[API-DEBUG]', endpoint, '- Response status:', response.status);
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        console.log('[API] Response:', response.status, endpoint, data);
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error('[API] Error:', error);
        throw error;
    }
}

// ===== UI FUNCTIONS =====
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
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const el = document.getElementById(tabName);
    if (el) el.classList.add('active');
    if (evt && evt.target) evt.target.classList.add('active');
    
    // Cargar datos cuando se abre ciertas pestañas
    if (tabName === 'list-reports') {
        loadReports();
    }
    if (tabName === 'bono-produccion') {
        initBonoTab();
    }
    if (tabName === 'bonos-guardados') {
        listarBonosGuardados();
    }
    if (tabName === 'usuarios') {
        loadUsuarios();
    }
}

function toggleRegisterForm() {
    const form = document.getElementById('registerForm');
    if (form) form.classList.toggle('hidden');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    token = null;
    currentUsername = null;
    document.getElementById('loginForm').reset();
    showLoginScreen();
}

// ===== AUTH =====
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    try {
        if (errorDiv) errorDiv.classList.add('hidden');
        
        console.log('[LOGIN] Intentando login con usuario:', username);
        
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_BASE}/auth/token`, {
            method: 'POST',
            body: formData
        });

        if (response.status === 400) {
            const data = await response.json();
            const errorMsg = data.detail || 'Usuario o contraseña incorrectos';
            console.error('[LOGIN] Error 400:', errorMsg);
            if (errorDiv) {
                errorDiv.textContent = errorMsg;
                errorDiv.classList.remove('hidden');
            }
            return;
        }

        if (!response.ok) {
            const errMsg = `Error en login: ${response.status}`;
            console.error('[LOGIN]', errMsg);
            throw new Error(errMsg);
        }

        const data = await response.json();
        token = data.access_token;
        currentUsername = username;

        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        localStorage.setItem('userRole', data.role || 'registrador');
        
        console.log('[LOGIN] ✅ Token guardado:', token.substring(0, 20) + '...');
        console.log('[LOGIN] Username:', currentUsername);
        console.log('[LOGIN] Role:', data.role);

        document.getElementById('loginForm').reset();
        showHomeScreen();
        await loadMasters();
    } catch (error) {
        console.error('[LOGIN] Exception:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Error: ' + error.message;
            errorDiv.classList.remove('hidden');
        }
    }
}

async function handleCreateUser(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: 'registrador' })
        });

        if (!response.ok) {
            const data = await response.json();
            if (errorDiv) {
                errorDiv.textContent = data.detail || 'Error creando usuario';
                errorDiv.classList.remove('hidden');
            }
            return;
        }

        if (errorDiv) errorDiv.classList.add('hidden');
        alert('Usuario creado exitosamente');
        toggleRegisterForm();
        document.getElementById('createUserForm').reset();
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = 'Error: ' + error.message;
            errorDiv.classList.remove('hidden');
        }
    }
}

// ===== MASTERS LOAD =====
async function loadMasters() {
    try {
        const [p, m, t, o, s, mat] = await Promise.all([
            apiRequest('/plants/'),
            apiRequest('/machinery/'),
            apiRequest('/trucks/'),
            apiRequest('/operators/'),
            apiRequest('/spare-parts/'),
            apiRequest('/materials/')
        ]);

        window.MASTERS = {
            plants: p.ok ? p.data : [],
            machinery: m.ok ? m.data : [],
            trucks: t.ok ? t.data : [],
            operators: o.ok ? o.data : [],
            spare_parts: s.ok ? s.data : [],
            materials: mat.ok ? mat.data : []
        };

        renderItemsList('plantsList', window.MASTERS.plants, 'plant');
        renderItemsList('machineryList', window.MASTERS.machinery, 'machinery');
        renderItemsList('trucksList', window.MASTERS.trucks, 'truck');
        renderItemsList('operatorsList', window.MASTERS.operators, 'operator');
        renderItemsList('sparePartsList', window.MASTERS.spare_parts, 'spare_part');
        renderItemsList('materialsList', window.MASTERS.materials, 'material');

        // Llenar select del formulario de reporte
        fillSelectOptions('reportPlant', window.MASTERS.plants, 'id', 'name');
        fillCheckboxOptions('reportMachinery', window.MASTERS.machinery, 'id', 'name');
        fillCheckboxOptions('reportTrucks', window.MASTERS.trucks, 'id', 'name');
        fillSelectOptions('reportOperator', window.MASTERS.operators, 'id', 'name');
        
        // Llenar select para materiales en tabla
        fillSelectOptions('materialSelect', window.MASTERS.materials, 'id', 'name');
        
        // Llenar select para bono produccion
        fillSelectOptions('bonoPlanta', window.MASTERS.plants, 'id', 'name');
    } catch (err) {
        console.error('[MASTERS] Error:', err);
    }
}

function fillCheckboxOptions(containerId, items, valueKey, labelKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="color: #999; margin: 0;">Sin opciones disponibles</p>';
        return;
    }
    
    items.forEach(item => {
        const id = item[valueKey];
        const label = item[labelKey];
        
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px; padding: 8px 0;';
        
        const labelElem = document.createElement('label');
        labelElem.htmlFor = `${containerId}_${id}`;
        labelElem.textContent = label;
        labelElem.style.cssText = 'cursor: pointer; margin: 0; margin-right: 16px; flex: 1; font-size: 0.95em;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${containerId}_${id}`;
        checkbox.value = id;
        checkbox.style.cssText = 'cursor: pointer; width: 18px; height: 18px; flex-shrink: 0;';
        
        div.appendChild(labelElem);
        div.appendChild(checkbox);
        container.appendChild(div);
    });
}

function fillSelectOptions(selectId, items, valueKey, labelKey) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Mantener la primera opcion (--Seleccionar--)
    const firstOption = select.querySelector('option:first-child');
    select.innerHTML = '';
    
    if (firstOption) {
        select.appendChild(firstOption);
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Seleccionar --';
        select.appendChild(option);
    }
    
    // Agregar opciones
    if (items && items.length > 0) {
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey] || item.id;
            option.textContent = item[labelKey] || item.name;
            select.appendChild(option);
        });
    }
}

function renderItemsList(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!items || items.length === 0) {
        container.innerHTML = '<p>No hay elementos</p>';
        return;
    }

    container.innerHTML = items.map(it => {
        const desc = it.description ? ` - ${it.description}` : '';
        let label = it.name;
        if (type === 'plant' && it.tipo) label += ` [${it.tipo}]`;
        if (type === 'plant' && it.es_resta) label += ' (Resta)';
        
        return `<div class="item-badge">
            <span>${label}</span>${desc}
            <button class="btn-delete-maestro" data-id="${it.id}" data-type="${type}">🗑️</button>
        </div>`;
    }).join('');

    container.querySelectorAll('.btn-delete-maestro').forEach(btn => {
        btn.onclick = () => deleteMaestro(btn.getAttribute('data-id'), btn.getAttribute('data-type'));
    });
}

async function deleteMaestro(id, type) {
    if (!confirm('¿Eliminar este elemento?')) return;
    const endpoints = {
        plant: `/plants/${id}`,
        machinery: `/machinery/${id}`,
        truck: `/trucks/${id}`,
        operator: `/operators/${id}`,
        spare_part: `/spare-parts/${id}`,
        material: `/materials/${id}`
    };
    const endpoint = endpoints[type];
    if (!endpoint) return;
    try {
        const response = await apiRequest(endpoint, {
            method: 'DELETE'
        });
        if (response.ok) {
            alert('✅ Elemento eliminado exitosamente');
            loadMasters();
        } else {
            alert('Error: ' + (response.data?.detail || 'No se pudo eliminar'));
        }
    } catch (err) {
        console.error('[DELETE MAESTRO] Error:', err);
        alert('Error: ' + err.message);
    }
}

// ===== PLANTS =====
window.addPlant = function() {
    const name = document.getElementById('newPlantName').value.trim();
    const desc = document.getElementById('newPlantDesc').value.trim();
    const tipo = document.getElementById('newPlantTipo').value;
    const esResta = document.getElementById('newPlantEsResta').checked;
    if (!name) return alert('Ingresa nombre');
    
    apiRequest('/plants/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc, tipo, es_resta: esResta })
    }).then(res => {
        if (res.ok) {
            document.getElementById('newPlantName').value = '';
            document.getElementById('newPlantDesc').value = '';
            document.getElementById('newPlantTipo').value = '';
            document.getElementById('newPlantEsResta').checked = false;
            loadMasters();
        } else {
            alert('Error: ' + (res.data?.detail || 'Error'));
        }
    }).catch(err => alert('Error: ' + err.message));
};

// ===== MACHINERY =====
window.addMachinery = function() {
    const name = document.getElementById('newMachineryName').value.trim();
    const desc = document.getElementById('newMachineryDesc').value.trim();
    if (!name) return alert('Ingresa nombre');
    
    apiRequest('/machinery/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc })
    }).then(res => {
        if (res.ok) {
            document.getElementById('newMachineryName').value = '';
            document.getElementById('newMachineryDesc').value = '';
            loadMasters();
        } else {
            alert('Error: ' + (res.data?.detail || 'Error'));
        }
    }).catch(err => alert('Error: ' + err.message));
};

// ===== TRUCKS =====
window.addTruck = function() {
    const name = document.getElementById('newTruckName').value.trim();
    const plate = document.getElementById('newTruckPlate').value.trim();
    const desc = document.getElementById('newTruckDesc').value.trim();
    if (!name) return alert('Ingresa nombre');
    
    apiRequest('/trucks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, plate, description: desc })
    }).then(res => {
        if (res.ok) {
            document.getElementById('newTruckName').value = '';
            document.getElementById('newTruckPlate').value = '';
            document.getElementById('newTruckDesc').value = '';
            loadMasters();
        } else {
            alert('Error: ' + (res.data?.detail || 'Error'));
        }
    }).catch(err => alert('Error: ' + err.message));
};

// ===== OPERATORS =====
window.addOperator = function() {
    const name = document.getElementById('newOperatorName').value.trim();
    const desc = document.getElementById('newOperatorDesc').value.trim();
    if (!name) return alert('Ingresa nombre');
    
    apiRequest('/operators/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc })
    }).then(res => {
        if (res.ok) {
            document.getElementById('newOperatorName').value = '';
            document.getElementById('newOperatorDesc').value = '';
            loadMasters();
        } else {
            alert('Error: ' + (res.data?.detail || 'Error'));
        }
    }).catch(err => alert('Error: ' + err.message));
};

// ===== SPARE PARTS =====
window.addSparePart = function() {
    const name = document.getElementById('newSparePartName').value.trim();
    const code = document.getElementById('newSparePartCode').value.trim();
    const desc = document.getElementById('newSparePartDesc').value.trim();
    if (!name) return alert('Ingresa nombre');
    
    apiRequest('/spare-parts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, code, description: desc })
    }).then(res => {
        if (res.ok) {
            document.getElementById('newSparePartName').value = '';
            document.getElementById('newSparePartCode').value = '';
            document.getElementById('newSparePartDesc').value = '';
            loadMasters();
        } else {
            alert('Error: ' + (res.data?.detail || 'Error'));
        }
    }).catch(err => alert('Error: ' + err.message));
};

// ===== MATERIALS =====
window.addMaterial = function() {
    const name = document.getElementById('newMaterialName').value.trim();
    if (!name) return alert('Ingresa nombre');
    
    apiRequest('/materials/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name })
    }).then(res => {
        if (res.ok) {
            document.getElementById('newMaterialName').value = '';
            loadMasters();
        } else {
            alert('Error: ' + (res.data?.detail || 'Error'));
        }
    }).catch(err => alert('Error: ' + err.message));
};

// ===== MATERIALS EN REPORTE =====
window.addMaterialRow = function(e) {
    const tbody = document.querySelector('#materialsTable tbody');
    if (!tbody) {
        console.error('[ERROR] No se encontro #materialsTable tbody');
        return;
    }

    const row = document.createElement('tr');
    const rowId = 'material-row-' + Date.now();
    
    row.innerHTML = `
        <td>
            <select class="material-select" data-row-id="${rowId}">
                <option value="">-- Seleccionar material --</option>
                ${(window.MASTERS && window.MASTERS.materials ? window.MASTERS.materials : []).map(m => 
                    `<option value="${m.id}">${m.name}</option>`
                ).join('')}
            </select>
        </td>
        <td>
            <input type="number" class="material-m3" data-row-id="${rowId}" min="0" step="0.1" placeholder="0.0">
        </td>
        <td>
            <button type="button" class="btn" onclick="removeMaterialRow('${rowId}')" style="background: #f44; color: white; padding: 4px 8px; cursor: pointer;">X</button>
        </td>
    `;
    
    row.id = rowId;
    tbody.appendChild(row);
    
    // Agregar listener para calcular total cuando cambie
    row.querySelector('.material-m3').addEventListener('change', calculateTotalM3);
    row.querySelector('.material-m3').addEventListener('input', calculateTotalM3);
    row.querySelector('.material-select').addEventListener('change', calculateTotalM3);
    
    console.log('[OK] Material row agregado:', rowId);
};

window.removeMaterialRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        calculateTotalM3();
    }
};

function calculateTotalM3() {
    const tbody = document.querySelector('#materialsTable tbody');
    if (!tbody) return;
    
    let total = 0;
    tbody.querySelectorAll('tr').forEach(row => {
        const m3Input = row.querySelector('.material-m3');
        const value = parseFloat(m3Input ? m3Input.value : 0) || 0;
        total += value;
    });
    
    const totalField = document.getElementById('reportTotalM3');
    if (totalField) {
        totalField.value = total.toFixed(1);
    }
}

// ===== SPARE PARTS EN REPORTE =====
window.addSparePartRow = function() {
    const tbody = document.querySelector('#sparepartsTable tbody');
    if (!tbody) return;

    const row = document.createElement('tr');
    const rowId = 'spare-row-' + Date.now();
    
    row.innerHTML = `
        <td>
            <select class="sparepart-select" data-row-id="${rowId}">
                <option value="">-- Seleccionar repuesto --</option>
                ${(window.MASTERS && window.MASTERS.spare_parts ? window.MASTERS.spare_parts : []).map(s => 
                    `<option value="${s.id}">${s.name}${s.code ? ' (' + s.code + ')' : ''}</option>`
                ).join('')}
            </select>
        </td>
        <td>
            <input type="number" class="sparepart-qty" data-row-id="${rowId}" min="1" step="1" placeholder="cantidad">
        </td>
        <td>
            <button type="button" class="btn btn-small" onclick="removeSparePartRow('${rowId}')" style="background: #f44; color: white; padding: 4px 8px;">X</button>
        </td>
    `;
    
    row.id = rowId;
    tbody.appendChild(row);
};

window.removeSparePartRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
};

// ===== RECOLECCION DE DATOS DEL REPORTE =====
function getReportData() {
    const plantSelect = document.getElementById('reportPlant');
    const plantId = plantSelect ? parseInt(plantSelect.value) : null;
    
    const materials = [];
    const materialsTable = document.querySelector('#materialsTable tbody');
    if (materialsTable) {
        materialsTable.querySelectorAll('tr').forEach(row => {
            const matSelect = row.querySelector('.material-select');
            const m3Input = row.querySelector('.material-m3');
            const matId = matSelect ? parseInt(matSelect.value) : null;
            const m3 = m3Input ? parseFloat(m3Input.value) : 0;
            if (matId && m3 > 0) {
                materials.push({ material_id: matId, m3: m3 });
            }
        });
    }

    // Recopilar múltiples camiones seleccionados
    const truckIds = [];
    const truckContainer = document.getElementById('reportTrucks');
    if (truckContainer) {
        truckContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            truckIds.push(parseInt(checkbox.value));
        });
    }

    // Recopilar múltiples máquinas seleccionadas
    const machineryIds = [];
    const machineryContainer = document.getElementById('reportMachinery');
    if (machineryContainer) {
        machineryContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            machineryIds.push(parseInt(checkbox.value));
        });
    }

    return {
        date: document.getElementById('reportDate')?.value,
        plant_id: plantId,
        horometer_start: parseFloat(document.getElementById('reportHorometerStart')?.value) || null,
        horometer_end: parseFloat(document.getElementById('reportHorometerEnd')?.value) || null,
        truck_ids: truckIds.length > 0 ? truckIds : null,
        machinery_ids: machineryIds.length > 0 ? machineryIds : null,
        operator_id: parseInt(document.getElementById('reportOperator')?.value) || null,
        total_m3: parseFloat(document.getElementById('reportTotalM3')?.value) || 0,
        downtime_min: parseInt(document.getElementById('reportDowntime')?.value) || 0,
        materials: materials
    };
}

function getMaintenanceData() {
    const plantSelect = document.getElementById('reportPlant');
    const plantId = plantSelect ? parseInt(plantSelect.value) : null;
    
    if (!plantId) return null;
    
    const spare_parts = [];
    const sparepartsTable = document.querySelector('#sparepartsTable tbody');
    if (sparepartsTable) {
        sparepartsTable.querySelectorAll('tr').forEach(row => {
            const spSelect = row.querySelector('.sparepart-select');
            const qtyInput = row.querySelector('.sparepart-qty');
            const spId = spSelect ? parseInt(spSelect.value) : null;
            const qty = qtyInput ? parseInt(qtyInput.value) : 0;
            if (spId && qty > 0) {
                spare_parts.push({ id: spId, qty: qty });
            }
        });
    }
    
    const details = document.getElementById('nrMaintenanceDetails')?.value || '';
    const notes = document.getElementById('nrMaintenanceNotes')?.value || '';
    
    // Si no hay repuestos ni detalles ni notas, no hay mantención que registrar
    if (spare_parts.length === 0 && !details && !notes) {
        return null;
    }
    
    return {
        item_type: 'plant',
        item_id: plantId,
        spare_parts: spare_parts,
        details: details || null,
        notes: notes || null
    };
}

// ===== GUARDADO DE REPORTE =====
async function handleReportSubmit(e) {
    e.preventDefault();
    
    const errorDiv = document.getElementById('reportError');
    const successDiv = document.getElementById('reportSuccess');
    
    if (errorDiv) errorDiv.classList.add('hidden');
    if (successDiv) successDiv.classList.add('hidden');
    
    try {
        const reportData = getReportData();
        
        // Validaciones basicas
        if (!reportData.date || !reportData.plant_id) {
            throw new Error('Fecha y planta son requeridas');
        }
        
        if (reportData.materials.length === 0) {
            throw new Error('Debe agregar al menos un material');
        }
        
        if (!token) {
            throw new Error('No autorizado');
        }
        
        // Guardar reporte
        console.log('[REPORT] Enviando reporte...', reportData);
        const reportRes = await apiRequest('/reports/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });
        
        if (!reportRes.ok) {
            throw new Error(reportRes.data?.detail || 'Error guardando reporte');
        }
        
        const reportResult = reportRes.data;
        console.log('[REPORT] Reporte guardado exitosamente:', reportResult);
        
        // Intentar guardar mantención (si hay datos)
        const maintenanceData = getMaintenanceData();
        if (maintenanceData) {
            console.log('[MAINTENANCE] Enviando mantención...', maintenanceData);
            const mainRes = await apiRequest('/maintenances/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(maintenanceData)
            });
            
            if (!mainRes.ok) {
                console.error('[MAINTENANCE] Error guardando mantención:', mainRes.status);
            } else {
                const mainResult = mainRes.data;
                console.log('[MAINTENANCE] Mantención guardada:', mainResult);
            }
        }
        
        // Mostrar exito
        if (successDiv) {
            successDiv.textContent = '✅ Reporte y mantención guardados exitosamente';
            successDiv.classList.remove('hidden');
        }
        
        // Limpiar formulario despues de 1.5s
        setTimeout(() => {
            document.getElementById('reportForm')?.reset();
            
            // Reinicializar campos especiales
            const today = new Date().toISOString().split('T')[0];
            const reportDateField = document.getElementById('reportDate');
            if (reportDateField) reportDateField.value = today;
            
            // Limpiar tablas
            const materialsTable = document.querySelector('#materialsTable tbody');
            if (materialsTable) materialsTable.innerHTML = '';
            
            const sparepartsTable = document.querySelector('#sparepartsTable tbody');
            if (sparepartsTable) sparepartsTable.innerHTML = '';
            
            document.getElementById('nrMaintenanceDetails').value = '';
            document.getElementById('nrMaintenanceNotes').value = '';
            
            // Agregar fila inicial de material
            window.addMaterialRow();
            window.addSparePartRow();
            
            // Ocultar mensaje despues de 5s
            setTimeout(() => {
                if (successDiv) successDiv.classList.add('hidden');
            }, 5000);
        }, 1500);
        
    } catch (error) {
        console.error('[REPORT] Error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Error: ' + error.message;
            errorDiv.classList.remove('hidden');
        }
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
    token = localStorage.getItem('token');
    currentUsername = localStorage.getItem('username');

    if (token && currentUsername) {
        showHomeScreen();
        loadMasters();
        
        // Inicializar campo de fecha con la fecha de hoy
        const today = new Date().toISOString().split('T')[0];
        const reportDateField = document.getElementById('reportDate');
        if (reportDateField) {
            reportDateField.value = today;
        }
        
        // Agregar listener al formulario de reporte (si existe)
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            reportForm.addEventListener('submit', handleReportSubmit);
        }
        
        // Agregar una fila inicial de material y repuestos
        setTimeout(() => {
            if (document.querySelector('#materialsTable tbody tr') === null) {
                window.addMaterialRow();
            }
            if (document.querySelector('#sparepartsTable tbody tr') === null) {
                window.addSparePartRow();
            }
        }, 500);
        
        // Listener para auto-actualizar planta seleccionada en mantención
        const reportPlantSelect = document.getElementById('reportPlant');
        if (reportPlantSelect) {
            reportPlantSelect.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const plantName = selectedOption.text;
                const nrSelectedPlant = document.getElementById('nrSelectedPlant');
                if (nrSelectedPlant) {
                    nrSelectedPlant.textContent = plantName || '--';
                }
            });
            // Trigger inicial para mostrar la planta seleccionada
            reportPlantSelect.dispatchEvent(new Event('change'));
        }
        
        // Agregar listener al formulario de crear usuario (si existe)
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', handleCreateUser);
        }
        
        // Listeners para Bono Producción
        const bonoCalcularBtn = document.getElementById('bonoCalcularBtn');
        if (bonoCalcularBtn) {
            bonoCalcularBtn.addEventListener('click', calcularBonoProduccion);
        }
        
        const bonoAgregarTrabajador = document.getElementById('bonoAgregarTrabajador');
        if (bonoAgregarTrabajador) {
            bonoAgregarTrabajador.addEventListener('click', window.agregarTrabajadorBono);
        }
        
        const bonoProduccionForm = document.getElementById('bonoProduccionForm');
        if (bonoProduccionForm) {
            bonoProduccionForm.addEventListener('submit', guardarBonoProduccion);
        }
        
        const bonoAplicarHorasExtra = document.getElementById('bonoAplicarHorasExtra');
        if (bonoAplicarHorasExtra) {
            bonoAplicarHorasExtra.addEventListener('click', function() {
                const horasExtra = parseFloat(document.getElementById('bonoHorasExtra')?.value) || 0;
                const totalProduccion = parseFloat(document.getElementById('bonoTotalProduccion')?.textContent) || 0;
                const arenaM3 = window.bonoArenaM3 || 0;
                const totalFinal = (totalProduccion - horasExtra) - arenaM3;
                document.getElementById('bonoTotalFinal').textContent = `${formatNumber(totalFinal)} m³`;
                document.getElementById('bonoTotalHorasExtra').textContent = `${formatNumber(horasExtra)} m³`;
                window.bonoHorasExtra = horasExtra;
                
                // Actualizar resumen de materiales
                let materialesStr = 'RESUMEN DE MATERIALES:\n';
                materialesStr += '─'.repeat(40) + '\n';
                const materialSummary = window.bonoMaterialSummary || {};
                Object.entries(materialSummary).sort().forEach(([name, m3]) => {
                    const isArena = name.toLowerCase().includes('arena');
                    const mark = isArena ? ' ✗' : '';
                    materialesStr += `${name}: ${formatNumber(m3)} m³${mark}\n`;
                });
                materialesStr += '─'.repeat(40) + '\n';
                materialesStr += `Total Inicial: ${formatNumber(totalProduccion)} m³\n`;
                materialesStr += `Menos Horas Extra: ${formatNumber(horasExtra)} m³\n`;
                materialesStr += `Menos Arena: ${formatNumber(arenaM3)} m³\n`;
                materialesStr += `TOTAL BONO: ${formatNumber(totalFinal)} m³`;
                
                if (materialesStr) {
                    document.getElementById('bonoMaterialesDetalle').innerHTML = `<pre style="font-size: 0.85em; color: #333; background: #f9f9f9; padding: 12px; border-radius: 4px; border-left: 4px solid #4CAF50;">${materialesStr}</pre>`;
                }
                
                // Recalcular bonos de trabajadores
                calcularBonoTrabajador();
            });
        }
        
        const bonoDescargarPDF = document.getElementById('bonoDescargarPDF');
        if (bonoDescargarPDF) {
            bonoDescargarPDF.addEventListener('click', descargarPDFBono);
        }
    } else {
        showLoginScreen();
    }
    console.log('[APP] Inicializacion completada');
});

// ===== VER REPORTES =====
async function loadReports() {
    const reportsList = document.getElementById('reportsList');
    const reportsCount = document.getElementById('reportsCount');
    
    if (!reportsList) return;
    
    try {
        reportsList.innerHTML = '<p class="loading">Cargando reportes...</p>';
        
        // Sincronizar token desde localStorage
        const currentToken = localStorage.getItem('token');
        console.log('[REPORTS-DEBUG] Token en localStorage:', currentToken ? currentToken.substring(0, 30) + '...' : 'VACIO/NULL');
        console.log('[REPORTS-DEBUG] localStorage keys:', Object.keys(localStorage));
        console.log('[REPORTS-DEBUG] localStorage contents:', {
            token: localStorage.getItem('token'),
            username: localStorage.getItem('username'),
            userRole: localStorage.getItem('userRole')
        });
        
        if (!currentToken) {
            console.error('[REPORTS] No token found in localStorage');
            reportsList.innerHTML = '<p style="color: red;">No autorizado - Por favor inicia sesión</p>';
            return;
        }
        
        console.log('[REPORTS] Cargando con token:', currentToken.substring(0, 20) + '...');
        const result = await apiRequest('/reports/');
        
        if (!result.ok) {
            const errorMsg = result.data?.detail || result.data || 'Error desconocido';
            console.error('[REPORTS] Error:', result.status, errorMsg);
            reportsList.innerHTML = `<p style="color: red;">Error cargando reportes: ${errorMsg}</p>`;
            return;
        }
        
        const reports = result.data;
        
        if (!Array.isArray(reports) || reports.length === 0) {
            reportsList.innerHTML = '<p style="color: #666;">No hay reportes registrados</p>';
            if (reportsCount) reportsCount.textContent = 'Total: 0 reportes';
            return;
        }
        
        if (reportsCount) reportsCount.textContent = `Total: ${reports.length} reportes`;
        
        reportsList.innerHTML = reports.map(report => {
            const date = formatDateFromISO(report.date);
            // Resolver nombre de la planta desde MASTERS
            const plantId = report.plant_id;
            let plantName = '--';
            if (plantId) {
                const plant = window.MASTERS?.plants?.find(p => p.id === parseInt(plantId));
                plantName = plant ? plant.name : `Planta ${plantId}`;
            }
            const totalM3 = report.total_m3 || 0;
            const materials = report.materials ? JSON.parse(report.materials) : [];
            
            // Parsear camiones y máquinas
            let truckNames = '';
            if (report.truck_ids) {
                try {
                    const truckIds = JSON.parse(report.truck_ids);
                    if (Array.isArray(truckIds) && truckIds.length > 0) {
                        const names = truckIds.map(id => {
                            const truck = window.MASTERS?.trucks?.find(t => t.id === id);
                            return truck ? truck.name : `Camión ${id}`;
                        });
                        truckNames = names.join(', ');
                    }
                } catch (e) {
                    console.error('Error parsing truck_ids:', e);
                }
            }
            
            let machineryNames = '';
            if (report.machinery_ids) {
                try {
                    const machineryIds = JSON.parse(report.machinery_ids);
                    if (Array.isArray(machineryIds) && machineryIds.length > 0) {
                        const names = machineryIds.map(id => {
                            const mach = window.MASTERS?.machinery?.find(m => m.id === id);
                            return mach ? mach.name : `Máquina ${id}`;
                        });
                        machineryNames = names.join(', ');
                    }
                } catch (e) {
                    console.error('Error parsing machinery_ids:', e);
                }
            }
            
            let materialsStr = 'Sin materiales';
            if (materials && materials.length > 0) {
                materialsStr = materials.map(m => `${getMaterialName(m.material_id)}: ${m.m3} m³`).join('; ');
            }
            
            return `
                <div class="report-card" style="border-left: 4px solid #667eea; padding: 12px; margin: 8px 0; background: #f9f9f9; border-radius: 4px;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; margin-bottom: 8px;">
                        <div>
                            <strong>Fecha:</strong> ${date}<br>
                            <strong>Planta:</strong> ${plantName}
                        </div>
                        <div>
                            <strong>Total m³:</strong> ${totalM3.toFixed(1)}<br>
                            <strong>ID:</strong> ${report.id}
                        </div>
                        <div>
                            <strong>Creado:</strong> ${report.created_at ? new Date(report.created_at).toLocaleString('es-ES') : '--'}
                        </div>
                    </div>
                    <div style="font-size: 0.9em; color: #666;">
                        <strong>Materiales:</strong> ${materialsStr}
                    </div>
                    ${truckNames ? `<div style="font-size: 0.9em; color: #666; margin-top: 4px;"><strong>Camión(es):</strong> ${truckNames}</div>` : ''}
                    ${machineryNames ? `<div style="font-size: 0.9em; color: #666; margin-top: 4px;"><strong>Máquina(s):</strong> ${machineryNames}</div>` : ''}
                    <div style="margin-top: 8px; display: flex; gap: 8px;">
                        <button class="btn btn-small" onclick="viewReportDetails(${report.id})" style="background: #667eea; color: white;">Ver Detalles</button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('[REPORTS] Error:', error);
        reportsList.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function applyFilters() {
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    
    if (!startDate && !endDate) {
        alert('Selecciona al menos una fecha');
        return;
    }
    
    loadReports(); // Por ahora solo recargamos, la API maneja los filtros si los pasamos
    // En futuro: pasar startDate y endDate como query params
}

function clearFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    loadReports();
}

// Helper para obtener nombre del material desde su ID
function formatDateFromISO(isoDateString) {
    if (!isoDateString) return '--';
    // Extrae solo la parte YYYY-MM-DD sin problemas de timezone
    const datePart = isoDateString.split('T')[0];
    if (!datePart) return '--';
    // Convierte YYYY-MM-DD a formato local
    const [year, month, day] = datePart.split('-');
    console.log('[FORMAT DATE] Input:', isoDateString, '→ datePart:', datePart, '→ [y,m,d]:', year, month, day);
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const formatted = date.toLocaleDateString('es-ES');
    console.log('[FORMAT DATE] new Date(' + year + ', ' + (parseInt(month) - 1) + ', ' + day + ') →', date.toString(), '→ formatted:', formatted);
    return formatted;
}

function getMaterialName(materialId) {
    if (!materialId || !window.MASTERS?.materials) return materialId;
    const material = window.MASTERS.materials.find(m => m.id === (typeof materialId === 'string' ? parseInt(materialId) : materialId));
    return material ? material.name : materialId;
}

// ===== GESTIÓN DE USUARIOS =====
async function loadUsuarios() {
    const tabla = document.getElementById('usuariosTabla');
    const tbody = tabla?.querySelector('tbody');
    if (!tbody) return;
    
    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando usuarios...</td></tr>';
        
        if (!token) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">No autorizado</td></tr>';
            return;
        }
        
        const result = await apiRequest('/users/');
        
        if (!result.ok) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error cargando usuarios</td></tr>';
            return;
        }
        
        const usuarios = result.data;
        
        if (!Array.isArray(usuarios) || usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">No hay usuarios</td></tr>';
            return;
        }
        
        tbody.innerHTML = usuarios.map((user, idx) => {
            const isAdmin = user.role === 'admin' || user.is_admin === true;
            const rolDisplay = isAdmin ? '👤 Administrador' : '📝 Registrador';
            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${user.username}</strong></td>
                    <td>${rolDisplay}</td>
                    <td>
                        <button class="btn btn-small" onclick="openCambiarRolModal(${user.id}, '${user.username}', ${isAdmin})" style="background: #667eea; color: white; margin-right: 5px;">Cambiar Rol</button>
                        <button class="btn btn-small" onclick="openResetPasswordModal(${user.id}, '${user.username}')" style="background: #ff9800; color: white; margin-right: 5px;">Resetear Contraseña</button>
                        <button class="btn btn-small" onclick="eliminarUsuario(${user.id}, '${user.username}')" style="background: #ff6b6b; color: white;">Eliminar</button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('[USUARIOS] Error:', error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error: ${error.message}</td></tr>`;
    }
}

function openCambiarRolModal(userId, username, isAdmin) {
    window.usuarioEditId = userId;
    document.getElementById('modalUsuarioInfo').textContent = `Usuario: ${username}`;
    document.getElementById('modalRolSelect').value = isAdmin ? 'admin' : 'registrador';
    document.getElementById('cambiarRolModal').style.display = 'flex';
    
    // Listener para guardar
    document.getElementById('modalRolGuardarBtn').onclick = function() {
        guardarCambioRol();
    };
}

function closeCambiarRolModal() {
    document.getElementById('cambiarRolModal').style.display = 'none';
}

async function guardarCambioRol() {
    const userId = window.usuarioEditId;
    const nuevoRol = document.getElementById('modalRolSelect').value;
    
    if (!userId) {
        alert('Error: ID de usuario no definido');
        return;
    }
    
    try {
        const response = await apiRequest(`/users/${userId}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: nuevoRol })
        });
        
        if (response.ok) {
            alert('✅ Rol actualizado exitosamente');
            closeCambiarRolModal();
            loadUsuarios();
        } else {
            alert('Error: ' + (response.data?.detail || 'No se pudo actualizar el rol'));
        }
    } catch (error) {
        console.error('[UPDATE ROL] Error:', error);
        alert('Error: ' + error.message);
    }
}

function openResetPasswordModal(userId, username) {
    window.usuarioEditId = userId;
    document.getElementById('modalPasswordUsuarioInfo').textContent = `Usuario: ${username}`;
    document.getElementById('passwordResultBox').style.display = 'none';
    document.getElementById('resetPasswordModal').style.display = 'flex';
    
    // Listener para resetear
    document.getElementById('modalResetPasswordBtn').onclick = function() {
        resetearContraseña();
    };
}

function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').style.display = 'none';
}

async function resetearContraseña() {
    const userId = window.usuarioEditId;
    
    if (!userId) {
        alert('Error: ID de usuario no definido');
        return;
    }
    
    try {
        const response = await apiRequest(`/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const newPassword = response.data?.temporary_password || response.data?.password || 'N/A';
            
            // Mostrar contraseña temporal
            document.getElementById('passwordResultBox').style.display = 'block';
            document.getElementById('newPasswordDisplay').textContent = newPassword;
            
            // Desabilitar botón después de resetear
            document.getElementById('modalResetPasswordBtn').disabled = true;
            document.getElementById('modalResetPasswordBtn').textContent = '✅ Contraseña Generada';
        } else {
            alert('Error: ' + (response.data?.detail || 'No se pudo resetear la contraseña'));
        }
    } catch (error) {
        console.error('[RESET PASSWORD] Error:', error);
        alert('Error: ' + error.message);
    }
}

async function eliminarUsuario(userId, username) {
    const confirmDelete = confirm(`⚠️ ¿Estás seguro de que quieres eliminar al usuario "${username}"?\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmDelete) return;
    
    try {
        const response = await apiRequest(`/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert(`✅ Usuario "${username}" eliminado exitosamente`);
            loadUsuarios();
        } else {
            alert('Error: ' + (response.data?.detail || 'No se pudo eliminar el usuario'));
        }
    } catch (error) {
        console.error('[DELETE USER] Error:', error);
        alert('Error: ' + error.message);
    }
}

function viewReportDetails(reportId) {
    const reportsList = document.getElementById('reportsList');
    const detailsContainer = document.getElementById(`details-${reportId}`);
    
    if (detailsContainer) {
        // Si ya está expandido, colapsar
        detailsContainer.remove();
        return;
    }
    
    // Hacer fetch al servidor para obtener detalles completos
    apiRequest(`/reports/${reportId}`)
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.data;
    })
    .then(report => {
        // Crear contenedor de detalles expandido
        const detailsDiv = document.createElement('div');
        detailsDiv.id = `details-${reportId}`;
        detailsDiv.style.cssText = 'background: #f0f4ff; border: 2px solid #667eea; padding: 16px; margin: 8px 0; border-radius: 4px; animation: slideDown 0.3s ease-out;';
        
        // Parsear materiales
        let materials = [];
        try {
            materials = report.materials ? JSON.parse(report.materials) : [];
        } catch (e) {
            console.error('Error parsing materials:', e);
        }
        
        // Construir HTML de detalles
        let materialshtml = '<table style="width: 100%; border-collapse: collapse; margin: 8px 0;">';
        materialshtml += '<tr style="background: #667eea; color: white;"><th style="padding: 8px; text-align: left;">Material</th><th style="padding: 8px; text-align: right;">Cantidad (m³)</th></tr>';
        
        if (materials && materials.length > 0) {
            materials.forEach((m, idx) => {
                const bg = idx % 2 === 0 ? '#ffffff' : '#f9f9f9';
                const materialName = getMaterialName(m.material_id);
                materialshtml += `<tr style="background: ${bg}; border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px;">${materialName || '--'}</td>
                    <td style="padding: 8px; text-align: right;">${parseFloat(m.m3 || 0).toFixed(2)}</td>
                </tr>`;
            });
        } else {
            materialshtml += '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #999;">Sin materiales</td></tr>';
        }
        materialshtml += '</table>';
        
        detailsDiv.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong style="color: #667eea;">📊 DETALLES DEL REPORTE</strong>
                <div style="background: white; padding: 12px; border-radius: 3px; margin-top: 8px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 0.85em; color: #999;">ID</div>
                            <div style="font-weight: bold;">${report.id}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.85em; color: #999;">Fecha de Reporte</div>
                            <div style="font-weight: bold;">${formatDateFromISO(report.date)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.85em; color: #999;">Planta</div>
                            <div style="font-weight: bold;">${(() => {
                                const plantId = report.plant_id;
                                if (!plantId) return '--';
                                const plant = window.MASTERS?.plants?.find(p => p.id === parseInt(plantId));
                                return plant ? plant.name : `Planta ${plantId}`;
                            })()}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.85em; color: #999;">Total m³</div>
                            <div style="font-weight: bold; font-size: 1.2em; color: #4CAF50;">${parseFloat(report.total_m3 || 0).toFixed(2)} m³</div>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px;">
                        <div style="font-size: 0.85em; color: #999;">Horómetro Inicio</div>
                        <div style="font-weight: bold;">${report.horometer_start ? parseFloat(report.horometer_start).toFixed(2) : '--'}</div>
                    </div>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px;">
                        <div style="font-size: 0.85em; color: #999;">Horómetro Final</div>
                        <div style="font-weight: bold;">${report.horometer_end ? parseFloat(report.horometer_end).toFixed(2) : '--'}</div>
                    </div>
                    
                    ${(() => {
                        let truckNames = '';
                        if (report.truck_ids) {
                            try {
                                const truckIds = JSON.parse(report.truck_ids);
                                if (Array.isArray(truckIds) && truckIds.length > 0) {
                                    const names = truckIds.map(id => {
                                        const truck = window.MASTERS?.trucks?.find(t => t.id === id);
                                        return truck ? truck.name : `Camión ${id}`;
                                    });
                                    truckNames = names.join(', ');
                                }
                            } catch (e) {
                                console.error('Error parsing truck_ids:', e);
                            }
                        }
                        return truckNames ? `<div style="border-top: 1px solid #eee; padding-top: 12px; margin-bottom: 12px;">
                            <div style="font-size: 0.85em; color: #999;">Camión(es)</div>
                            <div style="font-weight: bold;">${truckNames}</div>
                        </div>` : '';
                    })()}
                    
                    ${(() => {
                        let machineryNames = '';
                        if (report.machinery_ids) {
                            try {
                                const machineryIds = JSON.parse(report.machinery_ids);
                                if (Array.isArray(machineryIds) && machineryIds.length > 0) {
                                    const names = machineryIds.map(id => {
                                        const mach = window.MASTERS?.machinery?.find(m => m.id === id);
                                        return mach ? mach.name : `Máquina ${id}`;
                                    });
                                    machineryNames = names.join(', ');
                                }
                            } catch (e) {
                                console.error('Error parsing machinery_ids:', e);
                            }
                        }
                        return machineryNames ? `<div style="border-top: 1px solid #eee; padding-top: 12px;">
                            <div style="font-size: 0.85em; color: #999;">Máquina(s)</div>
                            <div style="font-weight: bold;">${machineryNames}</div>
                        </div>` : '';
                    })()}
                    
                    <div style="border-top: 1px solid #eee; padding-top: 12px; margin-top: 12px;">
                        <div style="font-size: 0.85em; color: #999;">Creado</div>
                        <div style="font-weight: bold;">${report.created_at ? new Date(report.created_at).toLocaleString('es-ES') : '--'}</div>
                    </div>
                </div>
            </div>
            
            <div>
                <strong style="color: #667eea;">📦 MATERIALES</strong>
                <div style="background: white; padding: 12px; border-radius: 3px; margin-top: 8px;">
                    ${materialshtml}
                </div>
            </div>
            
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #667eea; display: flex; gap: 8px;">
                <button class="btn btn-small" onclick="viewReportDetails(${reportId})" style="background: #667eea; color: white;">Cerrar Detalles</button>
                <button class="btn btn-small" onclick="editReport(${reportId})" style="background: #FF9800; color: white;">✏️ Editar</button>
                <button class="btn btn-small" onclick="deleteReport(${reportId})" style="background: #f44336; color: white;">🗑️ Eliminar</button>
            </div>
        `;
        
        // Buscar la tarjeta y agregar detalles después de ella
        const reportCards = reportsList.querySelectorAll('.report-card');
        let found = false;
        reportCards.forEach(card => {
            if (card.innerHTML.includes(`viewReportDetails(${reportId})`)) {
                card.insertAdjacentElement('afterend', detailsDiv);
                found = true;
            }
        });
        
        // Si no encontró la tarjeta, agregar al final
        if (!found) {
            reportsList.appendChild(detailsDiv);
        }
    })
    .catch(error => {
        console.error('[REPORT DETAILS] Error:', error);
        alert('Error cargando detalles del reporte: ' + error.message);
    });
}

// ===== DELETE REPORT =====
function deleteReport(reportId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este reporte? Esta acción no se puede deshacer.')) {
        return;
    }
    
    apiRequest(`/reports/${reportId}`, {
        method: 'DELETE'
    })
    .then(res => {
        if (res.ok) {
            alert('✅ Reporte eliminado exitosamente');
            loadReports(); // Recargar lista
        } else {
            alert('Error: No se pudo eliminar el reporte');
        }
    })
    .catch(error => {
        console.error('[DELETE REPORT] Error:', error);
        alert('Error eliminando reporte: ' + error.message);
    });
}

// ===== EDIT REPORT =====
function editReport(reportId) {
    // Obtener datos del reporte
    apiRequest(`/reports/${reportId}`)
    .then(res => res.data)
    .then(report => {
        // Parsear materiales
        let materials = [];
        try {
            materials = report.materials ? JSON.parse(report.materials) : [];
        } catch (e) {
            console.error('Error parsing materials:', e);
        }
        
        // Crear modal de edición
        const modalId = `editModal-${reportId}`;
        let existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        // Construir tabla editable de materiales
        let materialsEditHtml = '';
        materials.forEach((m, idx) => {
            const materialName = getMaterialName(m.material_id);
            materialsEditHtml += `
                <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center;">
                    <input type="text" value="${materialName || ''}" placeholder="Material" class="report-edit-material-id-${reportId}" data-id="${m.material_id}" style="padding: 8px; border: 1px solid #ddd; border-radius: 3px;" readonly>
                    <input type="number" value="${m.m3 || 0}" placeholder="Cantidad (m³)" class="report-edit-material-m3-${reportId}" step="0.1" style="padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
                    <button type="button" onclick="this.closest('div').remove()" style="background: #f44336; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;">Remover</button>
                </div>
            `;
        });
        
        // Obtener fecha formateada
        const reportDate = report.date ? report.date.split('T')[0] : new Date().toISOString().split('T')[0];
        
        // Obtener nombre de la planta
        const plantId = report.plant_id;
        let plantName = 'Sin planta';
        if (plantId) {
            const plant = window.MASTERS?.plants?.find(p => p.id === parseInt(plantId));
            plantName = plant ? plant.name : `Planta ${plantId}`;
        }
        
        modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="margin-top: 0; color: #333;">✏️ Editar Reporte #${reportId}</h2>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 4px; color: #333;">📅 Fecha</label>
                    <input type="date" id="editReportDate-${reportId}" value="${reportDate}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 4px; color: #333;">🏭 Planta: ${plantName}</label>
                    <input type="number" id="editReportPlant-${reportId}" value="${report.plant_id || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;" placeholder="ID de planta">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #333;">Materiales</label>
                    <div id="editMaterialsList-${reportId}" style="background: #f9f9f9; padding: 12px; border-radius: 3px; border: 1px solid #eee;">
                        ${materialsEditHtml}
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background: #999; color: white; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; font-size: 14px;">Cancelar</button>
                    <button type="button" onclick="saveReportChanges(${reportId}, '${modalId}')" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; font-size: 14px;">💾 Guardar Cambios</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    })
    .catch(error => {
        console.error('[EDIT REPORT] Error:', error);
        alert('Error cargando reporte para editar');
    });
}

// ===== SAVE REPORT CHANGES =====
function saveReportChanges(reportId, modalId) {
    const dateInput = document.getElementById(`editReportDate-${reportId}`);
    const newDate = dateInput?.value;
    const newPlant = document.getElementById(`editReportPlant-${reportId}`)?.value;
    
    console.log('[SAVE] Input date element:', dateInput);
    console.log('[SAVE] Fecha cruda del input:', newDate);
    console.log('[SAVE] Planta captada:', newPlant);
    
    // Recopilar materiales editados - buscar todos los divs de material
    const materialsList = document.getElementById(`editMaterialsList-${reportId}`);
    const materialDivs = materialsList?.querySelectorAll('div[style*="grid"]');
    
    const newMaterials = [];
    if (materialDivs && materialDivs.length > 0) {
        materialDivs.forEach(div => {
            const inputs = div.querySelectorAll('input');
            if (inputs.length >= 2) {
                const materialIdInput = inputs[0];
                const m3Input = inputs[1];
                const materialId = materialIdInput.getAttribute('data-id');
                const m3 = parseFloat(m3Input.value) || 0;
                
                if (materialId && m3 > 0) {
                    newMaterials.push({ material_id: parseInt(materialId), m3: m3 });
                }
            }
        });
    }
    
    const totalM3 = newMaterials.reduce((sum, m) => sum + m.m3, 0);
    
    const updateData = {
        date: newDate,
        plant_id: parseInt(newPlant) || null,
        total_m3: totalM3,
        materials: newMaterials
    };
    
    console.log('[SAVE CHANGES] ==== DATOS COMPLETOS A ENVIAR ====');
    console.log('[SAVE CHANGES] Fecha que se envía:', newDate);
    console.log('[SAVE CHANGES] Objeto completo:', JSON.stringify(updateData));
    
    apiRequest(`/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    })
    .then(res => {
        console.log('[SAVE CHANGES] ==== RESPUESTA DEL SERVIDOR ====');
        console.log('[SAVE CHANGES] Status:', res.status);
        console.log('[SAVE CHANGES] Data:', res.data);
        
        if (res.ok) {
            console.log('[SAVE CHANGES] ✅ Actualización exitosa');
            alert('✅ Reporte actualizado exitosamente');
            document.getElementById(modalId)?.remove();
            // Esperar un poco antes de recargar
            setTimeout(() => {
                console.log('[SAVE CHANGES] Recargando reportes...');
                loadReports();
            }, 500);
        } else {
            const errorMsg = res.data?.detail || 'Error desconocido';
            console.error('[SAVE CHANGES] ❌ Error del servidor:', errorMsg);
            alert(`Error: ${errorMsg}`);
        }
    })
    .catch(error => {
        console.error('[SAVE CHANGES] Exception:', error);
        alert('Error guardando cambios: ' + error.message);
    });
}

// ===== BONOS GUARDADOS =====
function listarBonosGuardados() {
    const bonosGuardadosList = document.getElementById('bonosGuardadosLista');
    if (!bonosGuardadosList) return;
    
    bonosGuardadosList.innerHTML = '';
    
    // Buscar todos los bonos guardados en localStorage
    const bonos = [];
    for (let key in localStorage) {
        if (key.startsWith('bono_')) {
            try {
                const bonoData = JSON.parse(localStorage.getItem(key));
                bonos.push({
                    key,
                    ...bonoData
                });
            } catch (e) {
                console.error('Error párseando bono:', e);
            }
        }
    }
    
    if (bonos.length === 0) {
        bonosGuardadosList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No hay bonos guardados</p>';
        return;
    }
    
    // Mostrar bonos guardados
    bonos.forEach(bono => {
        // Resolver nombre de la planta
        let plantaNombre = 'Sin planta';
        if (bono.planta && window.MASTERS?.plants) {
            const plant = window.MASTERS.plants.find(p => p.id === parseInt(bono.planta));
            plantaNombre = plant ? plant.name : `Planta ${bono.planta}`;
        }
        
        const div = document.createElement('div');
        div.style.cssText = 'border: 1px solid #ddd; padding: 12px; margin: 8px 0; border-radius: 4px; background: #f9f9f9;';
        
        const trabajadoresCount = (bono.trabajadores || []).length;
        const totalBono = bono.trabajadores?.reduce((sum, t) => {
            const val = t.total_bono || 0;
            return sum + (typeof val === 'number' ? val : 0);
        }, 0) || 0;
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 1.1em;">${plantaNombre}</strong> - ${bono.mes}
                    <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
                        ${trabajadoresCount} trabajador(es) • Total: $${new Intl.NumberFormat('es-CL').format(totalBono)}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-small" onclick="cargarBonoGuardado('${bono.key}')" style="background: #2980b9; color: white;">
                        📥 Cargar
                    </button>
                    <button class="btn btn-small" onclick="eliminarBonoGuardado('${bono.key}', '${bono.mes}', '${plantaNombre}')" style="background: #e74c3c; color: white;">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
        bonosGuardadosList.appendChild(div);
    });
}

function cargarBonoGuardado(key) {
    try {
        const bonoData = JSON.parse(localStorage.getItem(key));
        if (!bonoData) {
            alert('Error: No se pudo cargar el bono');
            return;
        }
        
        // Restaurar datos en window
        window.bonoGuardado = bonoData;
        window.bonoMaterialSummary = bonoData.materialSummary || {};
        window.bonoArenaM3 = bonoData.arenaM3 || 0;
        window.bonoHorasExtra = bonoData.horasExtra || 0;
        
        // Llenar campos del formulario
        document.getElementById('bonoMes').value = bonoData.mes;
        document.getElementById('bonoPlanta').value = bonoData.planta;
        
        // Mostrar resumen de producción
        const totalProdNum = parseFloat(bonoData.totalProduccion) || 0;
        const totalFinalNum = parseFloat(bonoData.totalFinal) || 0;
        const horasExtraNum = parseFloat(bonoData.horasExtra) || 0;
        const arenaNum = parseFloat(bonoData.arenaM3) || 0;
        
        document.getElementById('bonoTotalProduccion').textContent = `${formatNumber(totalProdNum)} m³`;
        document.getElementById('bonoTotalFinal').textContent = `${formatNumber(totalFinalNum)} m³`;
        document.getElementById('bonoTotalHorasExtra').textContent = `${formatNumber(horasExtraNum)} m³`;
        document.getElementById('bonoHorasExtra').value = horasExtraNum || 0;
        
        // Mostrar detalles de materiales
        let materialesStr = 'RESUMEN DE MATERIALES:\n';
        materialesStr += '─'.repeat(40) + '\n';
        const materialSummary = bonoData.materialSummary || {};
        Object.entries(materialSummary).sort().forEach(([name, m3]) => {
            const isArena = name.toLowerCase().includes('arena');
            const mark = isArena ? ' ✗' : '';
            materialesStr += `${name}: ${formatNumber(m3)} m³${mark}\n`;
        });
        materialesStr += '─'.repeat(40) + '\n';
        materialesStr += `Total Inicial: ${formatNumber(totalProdNum)} m³\n`;
        materialesStr += `Menos Horas Extra: ${formatNumber(horasExtraNum)} m³\n`;
        materialesStr += `Menos Arena: ${formatNumber(arenaNum)} m³\n`;
        materialesStr += `TOTAL BONO: ${formatNumber(totalFinalNum)} m³`;
        
        if (materialesStr) {
            document.getElementById('bonoMaterialesDetalle').innerHTML = `<pre style="font-size: 0.85em; color: #333; background: #f9f9f9; padding: 12px; border-radius: 4px; border-left: 4px solid #4CAF50;">${materialesStr}</pre>`;
        }
        
        // Llenar tabla de trabajadores con los datos guardados
        const tbody = document.querySelector('#bonoTrabajadoresTabla tbody');
        if (tbody && bonoData.trabajadores && bonoData.trabajadores.length > 0) {
            tbody.innerHTML = ''; // Limpiar tabla
            
            bonoData.trabajadores.forEach((trab, idx) => {
                const row = document.createElement('tr');
                const totalBono = trab.total_bono || 0;
                
                row.innerHTML = `
                    <td>${idx + 1}</td>
                    <td><input type="text" class="bono-worker-name" value="${trab.nombre}" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;"></td>
                    <td><input type="text" class="bono-worker-cargo" value="${trab.cargo}" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;"></td>
                    <td><input type="number" class="bono-worker-price" value="${trab.precio || 0}" step="0.01" style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 3px;"></td>
                    <td class="bono-worker-total" style="text-align: right; font-weight: bold;">${formatCurrency(totalBono)}</td>
                    <td><button type="button" class="btn" onclick="removeBonWorker(this)" style="background: #f44; color: white; padding: 4px 8px; cursor: pointer;">X</button></td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Switch a tab de bonos
        switchTab('bono-produccion');
        
        alert('✅ Bono cargado exitosamente. Puedes modificar y descargar el PDF.');
    } catch (e) {
        console.error('Error cargando bono:', e);
        alert('Error: ' + e.message);
    }
}

function eliminarBonoGuardado(key, mes, plantaNombre) {
    const confirmDelete = confirm(`⚠️ ¿Estás seguro de que quieres descartar el bono guardado?\n\nPlanta: ${plantaNombre}\nMes: ${mes}\n\nEsta acción no se puede deshacer.`);
    
    if (!confirmDelete) return;
    
    try {
        localStorage.removeItem(key);
        alert(`✅ Bono de ${mes} eliminado exitosamente`);
        listarBonosGuardados();
    } catch (error) {
        console.error('[DELETE BONO] Error:', error);
        alert('Error: ' + error.message);
    }
}

// ===== BONO PRODUCCION =====
function initBonoTab() {
    const bonoMes = document.getElementById('bonoMes');
    if (bonoMes && !bonoMes.value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        bonoMes.value = `${year}-${month}`;
    }
}

async function calcularBonoProduccion() {
    const bonoMes = document.getElementById('bonoMes')?.value;
    const bonoPlanta = document.getElementById('bonoPlanta')?.value;
    
    if (!bonoMes || !bonoPlanta) {
        alert('Selecciona mes y planta');
        return;
    }
    
    try {
        if (!token) throw new Error('No autorizado');
        
        // Parsear mes
        const [year, month] = bonoMes.split('-');
        const startDate = new Date(year, parseInt(month) - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
        
        console.log(`[BONO] Calculando producción para ${bonoPlanta} del ${bonoMes}`);
        
        // Cargar reportes del período
        const result = await apiRequest('/reports/');
        
        if (!result.ok) throw new Error('Error cargando reportes');
        
        const reports = result.data;
        
        // Filtrar por planta y período
        const filteredReports = reports.filter(r => {
            const rDate = r.date;
            return r.plant_id === parseInt(bonoPlanta) && rDate >= startDate && rDate <= endDate;
        });
        
        let totalProduccion = 0;
        let arenaM3 = 0;
        const materialSummary = {}; // Para contar m3 por material
        
        filteredReports.forEach(report => {
            totalProduccion += report.total_m3 || 0;
            if (report.materials) {
                try {
                    const mats = JSON.parse(report.materials);
                    mats.forEach(m => {
                        const materialName = getMaterialName(m.material_id);
                        
                        // Acumular por material
                        if (!materialSummary[materialName]) {
                            materialSummary[materialName] = 0;
                        }
                        materialSummary[materialName] += m.m3 || 0;
                        
                        // Detectar y sumar arena
                        if (materialName.toLowerCase().includes('arena')) {
                            arenaM3 += m.m3 || 0;
                        }
                    });
                } catch (e) {
                    console.error('Error párseando materiales:', e);
                }
            }
        });
        
        // Calcular total final (sin arena)
        const totalFinal = totalProduccion - arenaM3;
        
        // Generar resumen de materiales
        let materialesStr = 'RESUMEN DE MATERIALES:\n';
        materialesStr += '─'.repeat(40) + '\n';
        Object.entries(materialSummary).sort().forEach(([name, m3]) => {
            const isArena = name.toLowerCase().includes('arena');
            const mark = isArena ? ' ✗' : '';
            materialesStr += `${name}: ${formatNumber(m3)} m³${mark}\n`;
        });
        materialesStr += '─'.repeat(40) + '\n';
        materialesStr += `Total Inicial: ${formatNumber(totalProduccion)} m³\n`;
        materialesStr += `Menos Arena: ${formatNumber(arenaM3)} m³\n`;
        materialesStr += `TOTAL BONO: ${formatNumber(totalFinal)} m³`;
        
        // Guardar la información en el DOM para usar en PDF
        window.bonoMaterialSummary = materialSummary;
        window.bonoArenaM3 = arenaM3;
        
        // Mostrar resultados
        document.getElementById('bonoTotalProduccion').textContent = `${formatNumber(totalProduccion)} m³`;
        document.getElementById('bonoTotalFinal').textContent = `${formatNumber(totalFinal)} m³`;
        document.getElementById('bonoTotalHorasExtra').textContent = '0 m³';
        
        if (materialesStr) {
            document.getElementById('bonoMaterialesDetalle').innerHTML = `<pre style="font-size: 0.85em; color: #333; background: #f9f9f9; padding: 12px; border-radius: 4px; border-left: 4px solid #4CAF50;">${materialesStr}</pre>`;
        }
        
        console.log(`[BONO] Producción total: ${totalProduccion} m³ | Arena: ${arenaM3} m³ | Total sin arena: ${totalFinal} m³`);
        
    } catch (error) {
        console.error('[BONO] Error:', error);
        alert('Error: ' + error.message);
    }
}

window.agregarTrabajadorBono = function() {
    const tbody = document.querySelector('#bonoTrabajadoresTabla tbody');
    if (!tbody) return;
    
    const rowId = 'bono-worker-' + Date.now();
    const currentRows = tbody.querySelectorAll('tr').length + 1;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${currentRows}</td>
        <td><input type="text" placeholder="Nombre del trabajador" class="bono-worker-name" style="width: 100%;"></td>
        <td><input type="text" placeholder="Ej: Operador" class="bono-worker-cargo" style="width: 100%;"></td>
        <td><input type="number" placeholder="$/m³" class="bono-worker-price" min="0" step="0.01" style="width: 100%;"></td>
        <td><span class="bono-worker-total">0</span></td>
        <td><button type="button" class="btn btn-small" onclick="this.closest('tr').remove()" style="background: #f44; color: white;">X</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Agregar listeners para auto-calcular
    const priceInput = row.querySelector('.bono-worker-price');
    if (priceInput) {
        priceInput.addEventListener('input', calcularBonoTrabajador);
        priceInput.addEventListener('change', calcularBonoTrabajador);
    }
};

function calcularBonoTrabajador() {
    const totalProduccion = parseFloat(document.getElementById('bonoTotalFinal')?.textContent) || 0;
    const tbody = document.querySelector('#bonoTrabajadoresTabla tbody');
    
    if (!tbody) return;
    
    tbody.querySelectorAll('tr').forEach(row => {
        const precio = parseFloat(row.querySelector('.bono-worker-price')?.value) || 0;
        const totalBono = totalProduccion * precio;
        const totalSpan = row.querySelector('.bono-worker-total');
        if (totalSpan) {
            totalSpan.textContent = formatCurrency(totalBono);
        }
    });
}

async function guardarBonoProduccion(e) {
    if (e) e.preventDefault();
    
    const bonoMes = document.getElementById('bonoMes')?.value;
    const bonoPlanta = document.getElementById('bonoPlanta')?.value;
    const totalProduccion = parseFloat(document.getElementById('bonoTotalFinal')?.textContent) || 0;
    
    if (!bonoMes || !bonoPlanta) {
        alert('Selecciona mes y planta');
        return;
    }
    
    if (totalProduccion === 0) {
        alert('Calcula primero la producción');
        return;
    }
    
    const tbody = document.querySelector('#bonoTrabajadoresTabla tbody');
    const trabajadores = [];
    
    if (tbody) {
        tbody.querySelectorAll('tr').forEach(row => {
            const nombre = row.querySelector('.bono-worker-name')?.value || '';
            const cargo = row.querySelector('.bono-worker-cargo')?.value || '';
            const precio = parseFloat(row.querySelector('.bono-worker-price')?.value) || 0;
            const totalText = row.querySelector('.bono-worker-total')?.textContent || '0';
            
            if (nombre && precio > 0) {
                const totalBono = totalProduccion * precio;
                trabajadores.push({
                    nombre,
                    cargo,
                    precio: precio,
                    precio_por_m3: precio,
                    total_bono: totalBono,
                    total_display: totalText
                });
            }
        });
    }
    
    if (trabajadores.length === 0) {
        alert('Agrega al menos un trabajador con precio');
        return;
    }
    
    try {
        // Crear objeto con toda la información
        const bonoData = {
            mes: bonoMes,
            planta: bonoPlanta,
            totalProduccion: document.getElementById('bonoTotalProduccion')?.textContent || '0',
            totalFinal: totalProduccion,
            horasExtra: window.bonoHorasExtra || 0,
            arenaM3: window.bonoArenaM3 || 0,
            materialSummary: window.bonoMaterialSummary || {},
            trabajadores: trabajadores,
            fecha_calculo: new Date().toISOString()
        };
        
        // Guardar en window para usar en PDF
        window.bonoGuardado = bonoData;
        
        // Guardar en localStorage
        const storageKey = `bono_${bonoMes}_${bonoPlanta}`;
        localStorage.setItem(storageKey, JSON.stringify(bonoData));
        
        console.log('[BONO] Bono guardado exitosamente:', bonoData);
        alert('✅ Bono de producción guardado exitosamente. Puedes descargarlo ahora.');
        
    } catch (error) {
        console.error('[BONO] Error:', error);
        alert('Error: ' + error.message);
    }
}

function descargarPDFBono() {
    try {
        if (!window.jsPDF && !window.jspdf?.jsPDF) {
            alert('Error: jsPDF no está disponible');
            return;
        }
        
        const jsPDFLib = window.jsPDF || window.jspdf.jsPDF;
        const doc = new jsPDFLib();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Obtener datos
        let bonoMesValue, bonoPlantaId, totalProduccion, totalFinal, horasExtra, arenaM3, materialSummary, trabajadores;
        
        if (window.bonoGuardado) {
            bonoMesValue = window.bonoGuardado.mes;
            bonoPlantaId = window.bonoGuardado.planta;
            totalProduccion = window.bonoGuardado.totalProduccion;
            totalFinal = window.bonoGuardado.totalFinal;
            horasExtra = window.bonoGuardado.horasExtra || 0;
            arenaM3 = window.bonoGuardado.arenaM3;
            materialSummary = window.bonoGuardado.materialSummary;
            trabajadores = window.bonoGuardado.trabajadores || [];
        } else {
            bonoMesValue = document.getElementById('bonoMes')?.value || 'Sin fecha';
            bonoPlantaId = document.getElementById('bonoPlanta')?.value || '';
            totalProduccion = document.getElementById('bonoTotalProduccion')?.textContent || '0';
            totalFinal = document.getElementById('bonoTotalFinal')?.textContent || '0';
            horasExtra = window.bonoHorasExtra || 0;
            arenaM3 = window.bonoArenaM3 || 0;
            materialSummary = window.bonoMaterialSummary || {};
            trabajadores = [];
            
            const tbody = document.querySelector('#bonoTrabajadoresTabla tbody');
            if (tbody) {
                tbody.querySelectorAll('tr').forEach((row, idx) => {
                    const nombre = row.querySelector('.bono-worker-name')?.value || '';
                    const cargo = row.querySelector('.bono-worker-cargo')?.value || '';
                    const precio = row.querySelector('.bono-worker-price')?.value || '0';
                    const totalText = row.querySelector('.bono-worker-total')?.textContent || '0';
                    
                    if (nombre && precio > 0) {
                        trabajadores.push({
                            nombre,
                            cargo,
                            precio,
                            total_bono: parseFloat(totalText.replace(/[^\d]/g, '')) || 0
                        });
                    }
                });
            }
        }
        
        if (trabajadores.length === 0) {
            alert('No hay trabajadores con datos válidos para generar el PDF');
            return;
        }
        
        // Resolver nombre planta
        let bonoPlantaNombre = 'Sin planta';
        if (bonoPlantaId && window.MASTERS?.plants) {
            const plant = window.MASTERS.plants.find(p => p.id === parseInt(bonoPlantaId));
            bonoPlantaNombre = plant ? plant.name : `Planta ${bonoPlantaId}`;
        }
        
        const primaryColor = [0, 51, 102];
        const accentColor = [76, 175, 80];
        let yPos = 10;
        
        // ===== ENCABEZADO SIMPLE =====
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('EMPRESAS RIVERA', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Transportes • Ingeniería • Construcción', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 8;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPos, pageWidth - 15, yPos);
        
        yPos += 6;
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('BONO DE PRODUCCIÓN', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 7;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Parsear fecha correctamente para evitar problemas de zona horaria
        const [year, month] = bonoMesValue.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        
        doc.text(`Período: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`, 20, yPos);
        doc.text(`Planta: ${bonoPlantaNombre}`, pageWidth / 2, yPos);
        
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPos, pageWidth - 15, yPos);
        
        // ===== RESUMEN PRODUCCIÓN =====
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('PRODUCCIÓN TOTAL', 20, yPos);
        
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        
        const materialEntries = Object.entries(materialSummary).sort();
        materialEntries.forEach(([name, m3]) => {
            const isArena = name.toLowerCase().includes('arena');
            const mark = isArena ? ' (sin bonificación)' : '';
            doc.text(`  • ${name}: ${formatNumber(m3)} m³${mark}`, 20, yPos);
            yPos += 5;
        });
        
        yPos += 3;
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos - 4, pageWidth - 40, 6, 'F');
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        
        // Calcular valores numéricos
        const totalProdNum = parseFloat(totalProduccion) || 0;
        const horasExtraNum = parseFloat(horasExtra) || 0;
        const arenaNum = parseFloat(arenaM3) || 0;
        
        doc.text(`Producción Total Inicial: ${formatNumber(totalProdNum)} m³`, 22, yPos);
        
        yPos += 5;
        if (horasExtraNum > 0) {
            doc.setFillColor(255, 200, 200);
            doc.rect(20, yPos - 4, pageWidth - 40, 5, 'F');
            doc.setTextColor(200, 0, 0);
            doc.text(`Menos Horas Extra: -${formatNumber(horasExtraNum)} m³`, 22, yPos);
            yPos += 5;
        }
        
        if (arenaNum > 0) {
            doc.setFillColor(255, 220, 150);
            doc.rect(20, yPos - 4, pageWidth - 40, 5, 'F');
            doc.setTextColor(200, 100, 0);
            doc.text(`Menos Arena (sin bonificación): -${formatNumber(arenaNum)} m³`, 22, yPos);
            yPos += 5;
        }
        
        yPos += 1;
        doc.setFillColor(...accentColor);
        doc.rect(20, yPos - 4, pageWidth - 40, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Base para Bono: ${formatNumber(totalFinal)} m³`, 22, yPos);
        
        // ===== DETALLES TRABAJADORES =====
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(...primaryColor);
        doc.rect(15, yPos - 5, pageWidth - 30, 6, 'F');
        doc.text('BONIFICACIÓN POR TRABAJADOR', 20, yPos);
        
        yPos += 8;
        
        // Tabla manual de trabajadores
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(...primaryColor);
        
        // Encabezados
        doc.rect(15, yPos - 4, pageWidth - 30, 5, 'F');
        doc.text('#', 17, yPos);
        doc.text('Nombre', 25, yPos);
        doc.text('Cargo', 60, yPos);
        doc.text('$/m³', 90, yPos);
        doc.text('Total m³', 110, yPos);
        doc.text('Total Bono', pageWidth - 20, yPos, { align: 'right' });
        
        yPos += 6;
        
        // Filas de trabajadores
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8.5);
        
        let totalBonoGeneral = 0;
        trabajadores.forEach((trab, idx) => {
            // Fondo alterno
            if (idx % 2 === 0) {
                doc.setFillColor(245, 245, 245);
                doc.rect(15, yPos - 3.5, pageWidth - 30, 5, 'F');
            }
            
            const bonoVal = trab.total_bono || 0;
            totalBonoGeneral += bonoVal;
            
            doc.text(String(idx + 1), 17, yPos);
            doc.text(trab.nombre, 25, yPos);
            doc.text(trab.cargo, 60, yPos);
            doc.text(`$${formatNumber(parseFloat(trab.precio))}`, 90, yPos);
            doc.text(`${formatNumber(totalFinal)} m³`, 110, yPos);
            doc.text(formatCurrency(bonoVal), pageWidth - 20, yPos, { align: 'right' });
            
            yPos += 5;
        });
        
        // Línea separadora
        yPos += 2;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPos, pageWidth - 15, yPos);
        
        // TOTAL
        yPos += 6;
        doc.setFillColor(...accentColor);
        doc.rect(15, yPos - 4, pageWidth - 30, 6, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL A PAGAR:', 20, yPos);
        const totalFormatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalBonoGeneral);
        doc.text(totalFormatted, pageWidth - 20, yPos, { align: 'right' });
        
        // ===== FIRMAS =====
        yPos = pageHeight - 40;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPos, pageWidth - 15, yPos);
        
        yPos += 6;
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('AUTORIZACIÓN', 20, yPos);
        
        yPos += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        
        const firmas = [
            { label: 'Operador', x: 20 },
            { label: 'Supervisor', x: 82 },
            { label: 'Jefatura', x: 144 }
        ];
        
        firmas.forEach(firma => {
            doc.line(firma.x, yPos - 10, firma.x + 22, yPos - 10);
            doc.setFont(undefined, 'bold');
            doc.text(firma.label, firma.x + 11, yPos - 6, { align: 'center' });
            doc.setFont(undefined, 'normal');
            doc.text('Fecha: ____', firma.x + 11, yPos - 1, { align: 'center' });
        });
        
        // PIE
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')} | Bono Producción Áridos`, pageWidth / 2, pageHeight - 4, { align: 'center' });
        
        // Descargar
        const filename = `Bono_Produccion_${bonoMesValue}_${bonoPlantaNombre.replace(/\s+/g, '_')}.pdf`;
        doc.save(filename);
        console.log(`[PDF] Descargado: ${filename}`);
        
    } catch (error) {
        console.error('[PDF] Error:', error);
        alert('Error generando PDF: ' + error.message);
    }
}

console.log('[APP] Inicializacion completada');
