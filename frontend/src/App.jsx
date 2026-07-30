import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';

const BACKEND_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const API_BASE = `${BACKEND_URL}/api`;
const socket = io(BACKEND_URL, { autoConnect: false });

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendState, setBackendState] = useState({
    maquinas: [],
    operarios: [],
    inventario_hilo: [],
    distribucion_hilo: [],
    proveedores_hilo: [],
    salones: [],
    bultos: [],
    clientes: [],
    bitacora: [],
    recurrentes: [],
    lotes: [],
    planilla: [],
    modelos: [],
    alertas: []
  });

  const [connectionError, setConnectionError] = useState(false);

  // Form States
  const [selectedMaquinas, setSelectedMaquinas] = useState([]);
  const [selectedEncargado, setSelectedEncargado] = useState('');
  const [tejidoForm, setTejidoForm] = useState({ encargado_id: '', maquinas_seleccionadas: [], hilos: [{ hilo_id: '', cajas_por_maquina: 1 }], cantidad: 240 });
  const [remalladoForm, setRemalladoForm] = useState({ lote_id: '', operario_id: '', maquina_id: '', cantidad: 10 });
  const [salonForm, setSalonForm] = useState({ nombre: '', capacidad: 50 });
  const [trasladoForm, setTrasladoForm] = useState({ origen: 'Salon A', destino: 'Almacen General', bultos: 1 });
  const [skuForm, setSkuForm] = useState({ categoria: 'Niños', diseno: 'Color entero', calidad: 'Delgada', talla: '4' });
  const [ventasForm, setVentasForm] = useState({ cliente_documento: '', nombre_cliente: '', telefono: '', direccion: '', sku: '', cantidad: 1, condicion: 'Contado', medio: 'Efectivo', supervisor_pwd: '', precio_docena: 18.00 });
  const [mantenimientoForm, setMantenimientoForm] = useState({ ticket_id: '', tecnico: '', problema: '', repuestos: '', tipo: 'Cambio de Sensor' });
  const [materiaPrimaForm, setMateriaPrimaForm] = useState({ color: '', material: '', proveedor: '', cantidad: 0, estado: 'Recibida', motivo: '' });
  const [proveedorForm, setProveedorForm] = useState({ nombre: '', RUC: '', telefono: '', contacto: '', direccion: '', tipos_hilo: '' });
  const [distribucionForm, setDistribucionForm] = useState({ operario_id: '', hilo_id: '', turno: 'Mañana', fecha: new Date().toISOString().split('T')[0], cajas_entregadas: 1 });
  const [distribucionACompletar, setDistribucionACompletar] = useState(null);
  const [paresRendimientoForm, setParesRendimientoForm] = useState({ pares: '', comentario: '' });
  const [nuevoOperarioForm, setNuevoOperarioForm] = useState({ nombre: '', tipo_contrato: 'destajo', tarifa: 0.40 });
  const [nuevaRemalladoraForm, setNuevaRemalladoraForm] = useState({ id: '', encargado_id: '' });
  const [finTejidoMaq, setFinTejidoMaq] = useState(null);
  const [primeraCalidad, setPrimeraCalidad] = useState(100);
  const [segundaCalidad, setSegundaCalidad] = useState(0);
  const [selectedPlanillaSalon, setSelectedPlanillaSalon] = useState('Salon A');
  const [cantidadDocenasEstimador, setCantidadDocenasEstimador] = useState(10);
  const [selectedModeloEstimador, setSelectedModeloEstimador] = useState('');
  const [userRole, setUserRole] = useState('supervisor'); // Default to supervisor for plant operations
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [tempRole, setTempRole] = useState('');
  // POS Wizard Step
  const [posStep, setPosStep] = useState(1);
  const [posSelection, setPosSelection] = useState({ categoria: '', talla: '', diseno: '', calidad: '', sku: '' });
  const [hiloSubTab, setHiloSubTab] = useState('inventario');
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedLotToPack, setSelectedLotToPack] = useState(null);
  const [empaqueForm, setEmpaqueForm] = useState({ sku: '', tipo_bolsa: 'Mediana', cantidad_paquetes: 10 });
  const [showNuevoSalonModal, setShowNuevoSalonModal] = useState(false);
  const [clienteForm, setClienteForm] = useState({ numero_documento: '', nombre_cliente: '', telefono: '', direccion: '', cuotas_vencidas: 0 });
  const [busquedaCliente, setBusquedaCliente] = useState('');

  // Reporte del Personal / Planilla Diaria (Lunes a Sábado)
  const [fechaDesde, setFechaDesde] = useState('2026-07-27');
  const [fechaHasta, setFechaHasta] = useState('2026-08-01');
  const [selectedOperarioIdReporte, setSelectedOperarioIdReporte] = useState(null);
  const [reportePersonal, setReportePersonal] = useState([]);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ====================================================
  // SISTEMA DE LOGIN Y CONTROL DE ACCESO (RBAC)
  // ====================================================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginStep, setLoginStep] = useState(1); // 1 = seleccionar perfil, 2 = ingresar credenciales
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const ROLE_TABS_APP = {
    admin: ['dashboard', 'tejido', 'remallado', 'acabado', 'salones', 'ventas', 'clientes', 'despacho', 'mantenimiento', 'materia_prima'],
    supervisor: ['tejido', 'remallado', 'acabado', 'salones', 'mantenimiento', 'materia_prima'],
    vendedor: ['ventas', 'clientes', 'despacho', 'salones'],
    almacenero: ['salones', 'materia_prima', 'despacho']
  };

  const ROLE_PASSWORDS = {
    admin: 'admin123',
    supervisor: 'super123',
    vendedor: 'pos123',
    almacenero: 'alma123'
  };

  const ROLE_LABELS = {
    admin: { label: 'Administrador', icon: 'admin_panel_settings', desc: 'Acceso total al sistema', gradient: 'from-red-500 to-rose-700', color: 'text-red-600 bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
    supervisor: { label: 'Supervisor de Planta', icon: 'engineering', desc: 'Control de producción y maquinaria', gradient: 'from-blue-500 to-indigo-700', color: 'text-blue-600 bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
    vendedor: { label: 'Vendedor (POS)', icon: 'point_of_sale', desc: 'Ventas, clientes y despacho', gradient: 'from-emerald-500 to-teal-700', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
    almacenero: { label: 'Almacenero', icon: 'inventory_2', desc: 'Almacén, inventario y logística', gradient: 'from-amber-500 to-orange-700', color: 'text-amber-600 bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700' }
  };

  const handleLoginRoleSelect = (role) => {
    setUserRole(role);
    setLoginStep(2);
    setLoginPasswordInput('');
    setLoginError('');
  };

  const handleLoginSubmit = () => {
    if (loginPasswordInput === ROLE_PASSWORDS[userRole]) {
      const allowed = ROLE_TABS_APP[userRole] || ROLE_TABS_APP.supervisor;
      setActiveTab(allowed[0]);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Credencial incorrecta. Intenta de nuevo.');
      setLoginPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginStep(1);
    setLoginPasswordInput('');
    setLoginError('');
    setUserRole('supervisor');
  };

  // ====================================================
  // GENERADOR DE REPORTES PDF (usando ventana de impresión)
  // ====================================================
  const generatePDFRemallado = () => {
    const hoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const remalladoras = backendState.maquinas.filter(m => m.tipo === 'remalladora');
    const lotesDia = backendState.lotes.filter(l => l.estado === 'Remallado' || l.estado === 'Aprobado para Preparado' || l.estado === 'Empacado');

    // Agrupar producción por operario de remalladora
    const porOperario = {};
    remalladoras.forEach(rem => {
      const op = backendState.operarios.find(o => o.id === rem.encargado_id);
      const nombre = op ? op.nombre : 'Sin asignar';
      if (!porOperario[nombre]) porOperario[nombre] = { lotes: 0, pares: 0, maquina: rem.id, tarifa: op?.tarifa || 0 };
      lotesDia.forEach(l => {
        if (l.maquina_id === rem.id || l.operario_id === op?.id) {
          porOperario[nombre].lotes += 1;
          porOperario[nombre].pares += (l.cantidad_pares_primera || 0) + (l.cantidad_pares_segunda || 0);
        }
      });
    });

    const filas = Object.entries(porOperario).map(([nombre, d]) => {
      const pago = d.tarifa > 0 ? (d.pares * d.tarifa).toFixed(2) : 'S/ --';
      return `
        <tr>
          <td>${nombre}</td>
          <td>${d.maquina}</td>
          <td style="text-align:center">${d.lotes}</td>
          <td style="text-align:center">${d.pares}</td>
          <td style="text-align:right; font-weight:bold">${d.tarifa > 0 ? 'S/ ' + pago : '--'}</td>
        </tr>`;
    }).join('');

    const totalPares = Object.values(porOperario).reduce((a, d) => a + d.pares, 0);
    const totalLotes = Object.values(porOperario).reduce((a, d) => a + d.lotes, 0);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Reporte Diario Remallado</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 32px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #3b82f6; padding-bottom:16px; margin-bottom:24px; }
        .brand { font-size:28px; font-weight:900; letter-spacing:4px; color:#1d4ed8; }
        .sub { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:2px; margin-top:2px; }
        .report-title { text-align:right; }
        .report-title h2 { font-size:16px; font-weight:700; color:#1e293b; }
        .report-title p { font-size:11px; color:#64748b; margin-top:2px; }
        .kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:24px; }
        .kpi { background:#f1f5f9; border-radius:8px; padding:14px 18px; border-left: 4px solid #3b82f6; }
        .kpi-val { font-size:22px; font-weight:800; color:#1d4ed8; }
        .kpi-lab { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        thead tr { background:#1d4ed8; color:white; }
        thead th { padding:10px 14px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:1px; }
        tbody tr:nth-child(even) { background:#f8fafc; }
        tbody td { padding:10px 14px; border-bottom: 1px solid #e2e8f0; }
        .footer { margin-top:32px; text-align:center; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px; }
        @media print { body { padding:16px; } }
      </style>
    </head><body>
      <div class="header">
        <div><div class="brand">DUREY</div><div class="sub">Sistema ERP de Fábrica</div></div>
        <div class="report-title">
          <h2>Reporte Diario — Área de Remallado</h2>
          <p>${hoy}</p>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-val">${remalladoras.length}</div><div class="kpi-lab">Remalladoras activas</div></div>
        <div class="kpi"><div class="kpi-val">${totalLotes}</div><div class="kpi-lab">Lotes procesados</div></div>
        <div class="kpi"><div class="kpi-val">${totalPares.toLocaleString()}</div><div class="kpi-lab">Total unidades producidas</div></div>
      </div>
      <table>
        <thead><tr><th>Operario / Remalladora</th><th>Máquina</th><th style="text-align:center">Lotes</th><th style="text-align:center">Unidades</th><th style="text-align:right">Pago Destajo</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8">Sin producción registrada hoy</td></tr>'}</tbody>
      </table>
      <div class="footer">DUREY © ${new Date().getFullYear()} — Generado el ${new Date().toLocaleString('es-PE')} — Reporte interno confidencial</div>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const generatePDFTejido = () => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
    const finSemana = new Date(inicioSemana); finSemana.setDate(inicioSemana.getDate() + 6);
    const fmtFecha = d => d.toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
    const semanaLabel = `${fmtFecha(inicioSemana)} — ${fmtFecha(finSemana)}`;

    const maqTejido = backendState.maquinas.filter(m => m.tipo === 'tejido');
    const lotesSemana = backendState.lotes;

    // Agrupar producción semanal por operario tejedora
    const porOperario = {};
    maqTejido.forEach(maq => {
      const op = backendState.operarios.find(o => o.id === maq.encargado_id);
      const nombre = op ? op.nombre : 'Sin asignar';
      if (!porOperario[nombre]) porOperario[nombre] = { maquinas: [], lotes: 0, cajas: 0, pares: 0 };
      if (!porOperario[nombre].maquinas.includes(maq.id)) porOperario[nombre].maquinas.push(maq.id);
      lotesSemana.filter(l => l.maquina_id === maq.id).forEach(l => {
        porOperario[nombre].lotes += 1;
        porOperario[nombre].cajas += l.cajas_usadas || 0;
        porOperario[nombre].pares += (l.cantidad_pares_primera || 0) + (l.cantidad_pares_segunda || 0);
      });
    });

    const filas = Object.entries(porOperario).map(([nombre, d]) => `
      <tr>
        <td>${nombre}</td>
        <td>${d.maquinas.join(', ')}</td>
        <td style="text-align:center">${d.maquinas.length}</td>
        <td style="text-align:center">${d.lotes}</td>
        <td style="text-align:center">${d.cajas}</td>
        <td style="text-align:right; font-weight:bold">${d.pares.toLocaleString()}</td>
      </tr>`).join('');

    const totalMaq = maqTejido.length;
    const totalLotes = Object.values(porOperario).reduce((a,d) => a + d.lotes, 0);
    const totalPares = Object.values(porOperario).reduce((a,d) => a + d.pares, 0);
    const totalCajas = Object.values(porOperario).reduce((a,d) => a + d.cajas, 0);
    const activas = maqTejido.filter(m => m.estado === 'Tejiendo').length;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Reporte Semanal Tejido</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 32px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #7c3aed; padding-bottom:16px; margin-bottom:24px; }
        .brand { font-size:28px; font-weight:900; letter-spacing:4px; color:#6d28d9; }
        .sub { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:2px; margin-top:2px; }
        .report-title { text-align:right; }
        .report-title h2 { font-size:16px; font-weight:700; color:#1e293b; }
        .report-title p { font-size:11px; color:#64748b; margin-top:2px; }
        .kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; margin-bottom:24px; }
        .kpi { background:#f5f3ff; border-radius:8px; padding:14px 18px; border-left: 4px solid #7c3aed; }
        .kpi-val { font-size:22px; font-weight:800; color:#6d28d9; }
        .kpi-lab { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        thead tr { background:#6d28d9; color:white; }
        thead th { padding:10px 14px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:1px; }
        tbody tr:nth-child(even) { background:#f8fafc; }
        tbody td { padding:10px 14px; border-bottom: 1px solid #e2e8f0; }
        .footer { margin-top:32px; text-align:center; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:12px; }
        @media print { body { padding:16px; } }
      </style>
    </head><body>
      <div class="header">
        <div><div class="brand">DUREY</div><div class="sub">Sistema ERP de Fábrica</div></div>
        <div class="report-title">
          <h2>Reporte Semanal — Área de Tejido</h2>
          <p>Semana: ${semanaLabel}</p>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-val">${totalMaq}</div><div class="kpi-lab">Máquinas tejedoras</div></div>
        <div class="kpi"><div class="kpi-val">${activas}</div><div class="kpi-lab">Activas ahora</div></div>
        <div class="kpi"><div class="kpi-val">${totalCajas}</div><div class="kpi-lab">Cajas usadas</div></div>
        <div class="kpi"><div class="kpi-val">${totalPares.toLocaleString()}</div><div class="kpi-lab">Unidades producidas</div></div>
      </div>
      <table>
        <thead><tr><th>Operario</th><th>Máquinas a Cargo</th><th style="text-align:center">N° Maq.</th><th style="text-align:center">Lotes</th><th style="text-align:center">Cajas</th><th style="text-align:right">Unidades</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">Sin producción registrada esta semana</td></tr>'}</tbody>
      </table>
      <div class="footer">DUREY © ${new Date().getFullYear()} — Generado el ${new Date().toLocaleString('es-PE')} — Reporte interno confidencial</div>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [ordenesDespacho, setOrdenesDespacho] = useState([]);

  const addNotification = (text, type = 'info') => {
    const newNotif = { id: `${Date.now()}-${Math.random()}`, text, type };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 6000);
  };

  // Fetch data
  const fetchData = async () => {
    try {
      const resMaq = await fetch(`${API_BASE}/maquinas`);
      const dataMaq = await resMaq.json();

      const resInv = await fetch(`${API_BASE}/inventario`);
      const dataInv = await resInv.json();

      const resMant = await fetch(`${API_BASE}/mantenimiento/bitacora`);
      const dataMant = await resMant.json();

      const resPlanilla = await fetch(`${API_BASE}/planilla`);
      const dataPlanilla = await resPlanilla.json();

      const resDespacho = await fetch(`${API_BASE}/despacho/ordenes`);
      const dataDespacho = await resDespacho.json();

      setBackendState(prev => ({
        ...prev,
        maquinas: dataMaq.maquinas || [],
        operarios: dataMaq.operarios || [],
        lotes: dataMaq.lotes || [],
        planilla: dataPlanilla.planilla || [],
        modelos: dataPlanilla.modelos || [],
        inventario_hilo: dataMaq.inventario_hilo || prev.inventario_hilo || [],
        distribucion_hilo: dataMaq.distribucion_hilo || prev.distribucion_hilo || [],
        proveedores_hilo: dataMaq.proveedores_hilo || prev.proveedores_hilo || [],
        salones: dataInv.salones || [],
        bultos: dataInv.bultos || [],
        clientes: dataMaq.clientes || prev.clientes || [],
        bitacora: dataMant.bitacora || [],
        recurrentes: dataMant.recurrentes || []
      }));
      setOrdenesDespacho(dataDespacho.ordenes || []);
      setConnectionError(false);
    } catch (e) {
      console.warn("Backend no disponible. Usando estado limpio local.");
      setConnectionError(true);
      if (!backendState.maquinas.length) {
        const maqs = [];
        for (let i = 1; i <= 64; i++) {
          maqs.push({ id: `M-${String(i).padStart(2, '0')}`, tipo: 'tejido', estado: 'Inactiva', encargado_id: null });
        }
        maqs.push({ id: 'REM-01', tipo: 'remalladora', estado: 'Inactiva', encargado_id: null });
        maqs.push({ id: 'REM-02', tipo: 'remalladora', estado: 'Inactiva', encargado_id: null });

        setBackendState({
          maquinas: maqs,
          operarios: [],
          inventario_hilo: [],
          distribucion_hilo: [],
          proveedores_hilo: [],
          salones: [
            { id: "Salon A", capacidad_maxima_bultos: 50, bultos_actuales: 0 },
            { id: "Salon B", capacidad_maxima_bultos: 50, bultos_actuales: 0 },
            { id: "Salon C", capacidad_maxima_bultos: 40, bultos_actuales: 0 },
            { id: "Almacen General", capacidad_maxima_bultos: 1000, bultos_actuales: 0 }
          ],
          bultos: [],
          clientes: [],
          bitacora: [],
          recurrentes: [],
          lotes: [],
          modelos: [],
          planilla: []
        });
      }
    }
  };

  useEffect(() => {
    socket.connect();
    socket.on('maquinas_actualizadas', () => fetchData());
    socket.on('inventario_actualizado', () => fetchData());
    socket.on('alerta_critica', (data) => addNotification(`CRITICO: ${data.mensaje}`, 'error'));
    socket.on('alerta_almacen', (data) => addNotification(data.mensaje, 'warning'));
    socket.on('venta_registrada', () => fetchData());
    socket.on('despacho_realizado', () => fetchData());

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
      socket.off('maquinas_actualizadas');
      socket.off('inventario_actualizado');
      socket.off('alerta_critica');
      socket.off('alerta_almacen');
      socket.off('venta_registrada');
      socket.off('despacho_realizado');
    };
  }, []);

  // --- API Handlers (with Local Memory Simulation if Connection Fails) ---

  const handleAssignEncargado = async () => {
    if (!selectedEncargado || selectedMaquinas.length === 0) {
      addNotification("Selecciona máquinas y un encargado.", "error");
      return;
    }
    const payload = { maquinas_ids: selectedMaquinas, encargado_id: parseInt(selectedEncargado) };
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/maquinas/asignar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.warning) addNotification(data.warning, "warning");
        addNotification(data.message, "success");
      } catch (err) {
        addNotification("Error de red al asignar", "error");
      }
    } else {
      // Simulación local
      setBackendState(prev => {
        const newMaq = prev.maquinas.map(m => {
          if (selectedMaquinas.includes(m.id)) {
            return { ...m, encargado_id: parseInt(selectedEncargado) };
          }
          return m;
        });
        return { ...prev, maquinas: newMaq };
      });
      if (selectedMaquinas.length < 5) {
        addNotification("Advertencia: Se recomienda un mínimo de 5 máquinas por encargado.", "warning");
      }
      addNotification("Asignación de encargado simulada con éxito", "success");
    }
    setSelectedMaquinas([]);
  };

  const handleStartTejido = async (e) => {
    e.preventDefault();
    const payload = {
      maquina_ids: tejidoForm.maquinas_seleccionadas,
      hilos: tejidoForm.hilos.filter(item => item.hilo_id !== ''),
      cantidad_estimada: tejidoForm.cantidad
    };

    if (!payload.maquina_ids || payload.maquina_ids.length === 0) {
      addNotification("Error: Seleccione al menos una máquina inactiva.", "error");
      return;
    }

    if (payload.hilos.length === 0) {
      addNotification("Error: Seleccione al menos un hilo o material.", "error");
      return;
    }

    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/maquinas/iniciar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          addNotification(`Error: ${data.error}`, "error");
        } else {
          addNotification(data.message, "success");
          setTejidoForm(prev => ({ ...prev, hilos: [{ hilo_id: '', cajas_por_maquina: 1 }], maquinas_seleccionadas: [] }));
        }
      } catch (err) {
        addNotification("Error de conexión con el backend", "error");
      }
    } else {
      // Simulación local de encendido múltiple
      const hilosValidados = [];
      for (const item of payload.hilos) {
        const h = backendState.inventario_hilo.find(x => x.id === parseInt(item.hilo_id));
        const totalCajasReq = parseInt(item.cajas_por_maquina) * payload.maquina_ids.length;
        if (!h || (h.stock_cajas || 0) < totalCajasReq) {
          const nom = h ? `${h.material} ${h.color}` : `ID ${item.hilo_id}`;
          const stock = h ? (h.stock_cajas || 0) : 0;
          addNotification(`CRÍTICO: Bloqueo de inicio por falta de cajas de hilo ${nom}. Requerido: ${totalCajasReq} cajas, Disponible: ${stock} cajas.`, "error");
          return;
        }
        hilosValidados.push({ hilo: h, totalCajasReq, cajasPM: parseInt(item.cajas_por_maquina) });
      }

      hilosValidados.forEach(({ hilo, totalCajasReq }) => {
        hilo.stock_cajas = (hilo.stock_cajas || 0) - totalCajasReq;
        hilo.stock_kg = Math.max(0, parseFloat((hilo.stock_kg - (totalCajasReq * 24.0)).toFixed(2)));
      });

      const primerHilo = hilosValidados[0].hilo;
      const primerCajas = hilosValidados[0].cajasPM;
      
      const nuevosLotes = [];
      setBackendState(prev => {
        const updatedMaquinas = prev.maquinas.map(m => {
          if (payload.maquina_ids.includes(m.id)) {
            return { ...m, estado: 'Tejiendo' };
          }
          return m;
        });

        payload.maquina_ids.forEach((mid, idx) => {
          nuevosLotes.push({
            id: (prev.lotes ? prev.lotes.length : 0) + idx + 1,
            maquina_id: mid,
            color: primerHilo.color,
            material: primerHilo.material,
            cajas_asignadas: primerCajas,
            hilos_asignados: hilosValidados.map(hv => ({
              hilo_id: hv.hilo.id,
              color: hv.hilo.color,
              material: hv.hilo.material,
              cajas_por_maquina: hv.cajasPM
            })),
            cantidad_pares_estimada: payload.cantidad_estimada,
            cantidad_pares_primera: 0,
            cantidad_pares_segunda: 0,
            estado: 'Tejiendo'
          });
        });

        return {
          ...prev,
          maquinas: updatedMaquinas,
          lotes: [...(prev.lotes || []), ...nuevosLotes]
        };
      });

      addNotification(`Tejido iniciado en ${payload.maquina_ids.length} máquinas (simulado)`, "success");
      setTejidoForm(prev => ({ ...prev, hilos: [{ hilo_id: '', cajas_por_maquina: 1 }], maquinas_seleccionadas: [] }));
    }
    fetchData();
  };

  const handleCrearOperario = async (e) => {
    e.preventDefault();
    const { nombre, tipo_contrato, tarifa } = nuevoOperarioForm;
    if (!nombre) return;

    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/operarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, tipo_contrato, tarifa })
        });
        const data = await res.json();
        addNotification(data.message, "success");
      } catch (err) {
        addNotification("Error de red al crear operario", "error");
      }
    } else {
      const nuevoOp = {
        id: backendState.operarios.length + 1,
        nombre,
        tipo_contrato,
        tarifa: parseFloat(tarifa) || 0
      };
      setBackendState(prev => ({
        ...prev,
        operarios: [...prev.operarios, nuevoOp]
      }));
      addNotification(`Operario ${nombre} creado como ${tipo_contrato} con tarifa $${tarifa} (simulado)`, "success");
    }
    setNuevoOperarioForm({ nombre: '', tipo_contrato: 'destajo', tarifa: 0.15 });
    fetchData();
  };

  const handleCrearRemalladora = async (e) => {
    e.preventDefault();
    if (!nuevaRemalladoraForm.id) {
      addNotification("Por favor, ingrese el código de la remalladora", "warning");
      return;
    }
    const payload = {
      id: nuevaRemalladoraForm.id,
      tipo: 'remalladora',
      encargado_id: nuevaRemalladoraForm.encargado_id ? parseInt(nuevaRemalladoraForm.encargado_id) : null
    };

    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/maquinas/crear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
        setNuevaRemalladoraForm({ id: '', encargado_id: '' });
      } catch {
        addNotification('Error de red al crear remalladora', 'error');
      }
    } else {
      // Simulación local
      setBackendState(prev => {
        const limpiaId = payload.id.trim().toUpperCase();
        if (prev.maquinas.find(m => m.id === limpiaId)) {
          addNotification(`Error: La máquina ${limpiaId} ya existe.`, 'error');
          return prev;
        }
        const nueva = {
          id: limpiaId,
          tipo: 'remalladora',
          estado: 'Inactiva',
          encargado_id: payload.encargado_id
        };
        addNotification(`Máquina remalladora ${limpiaId} registrada con éxito (simulado)`, 'success');
        return {
          ...prev,
          maquinas: [...prev.maquinas, nueva]
        };
      });
      setNuevaRemalladoraForm({ id: '', encargado_id: '' });
    }
    fetchData();
  };

  const handleClasificarLote = async (e) => {
    e.preventDefault();
    if (!finTejidoMaq) return;

    const lote = backendState.lotes.find(l => l.maquina_id === finTejidoMaq && l.estado === 'Tejiendo');
    if (!lote) {
      addNotification("No se encontró lote activo en esta máquina", "error");
      return;
    }

    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/maquinas/clasificar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lote_id: lote.id,
            primera: primeraCalidad,
            segunda: segundaCalidad
          })
        });
        const data = await res.json();
        addNotification(data.message, "success");
      } catch (err) {
        addNotification("Error de red", "error");
      }
    } else {
      setBackendState(prev => {
        const newMaqs = prev.maquinas.map(m => m.id === finTejidoMaq ? { ...m, estado: 'Inactiva' } : m);
        const newLotes = prev.lotes.map(lot => lot.id === lote.id ? {
          ...lot,
          cantidad_pares_primera: primeraCalidad,
          cantidad_pares_segunda: segundaCalidad,
          estado: 'Listo para Volteado'
        } : lot);
        return { ...prev, maquinas: newMaqs, lotes: newLotes };
      });
      addNotification(`Lote #${lote.id} clasificado. Primera: ${primeraCalidad}, Segunda: ${segundaCalidad} (simulado)`, "success");
    }
    setFinTejidoMaq(null);
    setPrimeraCalidad(100);
    setSegundaCalidad(5);
    fetchData();
  };

  const handleReportBreakdown = async (maqId) => {
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/maquinas/averia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maquina_id: maqId })
        });
        const data = await res.json();
        addNotification(data.message, "warning");
      } catch (err) {
        addNotification("Error de red", "error");
      }
    } else {
      setBackendState(prev => {
        const newMaq = prev.maquinas.map(m => m.id === maqId ? { ...m, estado: 'Averiada' } : m);
        const newBitacora = [
          ...prev.bitacora,
          {
            id: prev.bitacora.length + 1,
            maquina_id: maqId,
            fecha: new Date().toISOString().split('T')[0],
            diagnostico: null,
            tecnico: null,
            estado_ticket: 'Averiada'
          }
        ];
        return { ...prev, maquinas: newMaq, bitacora: newBitacora };
      });
      addNotification(`Máquina ${maqId} marcada como averiada (simulado). Ticket creado.`, "warning");
    }
  };

  const handleReparar = async (e) => {
    e.preventDefault();
    const payload = mantenimientoForm;
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/mantenimiento/reparar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        addNotification(`Máquina reparada. Pago al técnico: $${data.pago_tecnico}`, "success");
      } catch (err) {
        addNotification("Error de red", "error");
      }
    } else {
      setBackendState(prev => {
        const ticket = prev.bitacora.find(t => t.id === parseInt(payload.ticket_id));
        if (!ticket) return prev;
        const tarifas = { "Cambio de Motor": 500, "Cambio de Sensor": 150, "Ajuste Mecánico Base": 80 };
        const costo = tarifas[payload.tipo] || 50;

        ticket.diagnostico = payload.problema;
        ticket.tecnico = payload.tecnico;
        ticket.repuestos_usados = payload.repuestos;
        ticket.costo_reparacion = costo;
        ticket.estado_ticket = 'Cerrado';

        const newMaq = prev.maquinas.map(m => m.id === ticket.maquina_id ? { ...m, estado: 'Inactiva' } : m);
        return { ...prev, maquinas: newMaq };
      });
      addNotification("Reparación simulada con éxito", "success");
    }
  };

  const handleCrearSalon = async (e) => {
    e.preventDefault();
    if (!salonForm.nombre) return;
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/salones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: salonForm.nombre, capacidad: salonForm.capacidad })
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red al crear salon', 'error'); }
    } else {
      setBackendState(prev => ({
        ...prev,
        salones: [...prev.salones, { id: salonForm.nombre, capacidad_maxima_bultos: parseInt(salonForm.capacidad), bultos_actuales: 0 }]
      }));
      addNotification(`Salon "${salonForm.nombre}" creado (simulado)`, 'success');
    }
    setSalonForm({ nombre: '', capacidad: 50 });
    fetchData();
  };

  const handleTrasladar = async (e) => {
    e.preventDefault();
    const { origen, destino, bultos } = trasladoForm;
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/inventario/trasladar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origen_id: origen, destino_id: destino, cantidad_bultos: parseInt(bultos) })
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red al trasladar', 'error'); }
    } else {
      setBackendState(prev => {
        const orig = prev.salones.find(s => s.id === origen);
        const dest = prev.salones.find(s => s.id === destino);
        if (!orig || !dest || orig.bultos_actuales < parseInt(bultos)) {
          addNotification('Falla al trasladar: stock insuficiente en el salon de origen', 'error');
          return prev;
        }
        orig.bultos_actuales -= parseInt(bultos);
        dest.bultos_actuales += parseInt(bultos);
        addNotification(`Traslado de ${bultos} bultos de ${origen} a ${destino} exitoso.`, 'success');
        return { ...prev };
      });
    }
    fetchData();
  };

  const handleComprarMateriaPrima = async (e) => {
    e.preventDefault();
    const { color, material, proveedor, proveedor_otro, cantidad, estado, motivo } = materiaPrimaForm;
    const finalProveedor = proveedor === 'Otro' ? proveedor_otro : proveedor;
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/materia-prima/recepcion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color, material, proveedor: finalProveedor, cantidad_cajas: parseInt(cantidad), estado: estado === 'Devuelto a Proveedor' ? 'Rechazada' : 'Recibida', motivo_rechazo: motivo })
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red al registrar materia prima', 'error'); }
    } else {
      setBackendState(prev => {
        let hilo = prev.inventario_hilo.find(h => h.color === color && h.material === material);
        if (!hilo) {
          hilo = { id: prev.inventario_hilo.length + 1, color, material, stock_cajas: 0, stock_kg: 0.0, umbral_minimo: 3 };
          prev.inventario_hilo.push(hilo);
        }
        if (estado === 'Recibida') {
          hilo.stock_cajas = (hilo.stock_cajas || 0) + parseInt(cantidad);
          hilo.stock_kg = parseFloat((hilo.stock_kg + (parseInt(cantidad) * 24.0)).toFixed(2));
          addNotification(`Hilo ingresado: +${cantidad} cajas de ${material} ${color}`, 'success');
        } else {
          addNotification(`Calidad Rechazada: Lote de ${cantidad} cajas devuelto a ${finalProveedor}. Motivo: ${motivo}`, 'warning');
        }
        return { ...prev };
      });
    }
    fetchData();
  };

  const handleDistribuirCaja = async (e) => {
    e.preventDefault();
    const { operario_id, hilo_id, turno, fecha, cajas_entregadas } = distribucionForm;
    if (!operario_id || !hilo_id || !turno) {
      addNotification("Por favor, seleccione operario, hilo y turno", "warning");
      return;
    }
    const payload = {
      operario_id: parseInt(operario_id),
      hilo_id: parseInt(hilo_id),
      turno,
      fecha,
      cajas_entregadas: parseInt(cajas_entregadas) || 1
    };

    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/materia-prima/distribuir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch {
        addNotification('Error al registrar distribución de hilo', 'error');
      }
    } else {
      // Simulación local
      setBackendState(prev => {
        const op = prev.operarios.find(o => o.id === payload.operario_id);
        const hl = prev.inventario_hilo.find(h => h.id === payload.hilo_id);
        if (!op) { addNotification("Operario no encontrado", "error"); return prev; }
        if (!hl) { addNotification("Hilo no encontrado", "error"); return prev; }
        if ((hl.stock_cajas || 0) < payload.cajas_entregadas) {
          addNotification(`Stock insuficiente. Solo quedan ${hl.stock_cajas || 0} cajas.`, "error");
          return prev;
        }
        hl.stock_cajas = (hl.stock_cajas || 0) - payload.cajas_entregadas;
        hl.stock_kg = Math.max(0, parseFloat((hl.stock_kg - (payload.cajas_entregadas * 24.0)).toFixed(2)));

        const newDist = {
          id: prev.distribucion_hilo.length + 1,
          operario_id: op.id,
          operario_nombre: op.nombre,
          hilo_id: hl.id,
          color: hl.color,
          material: hl.material,
          fecha: payload.fecha,
          turno: payload.turno,
          cajas_entregadas: payload.cajas_entregadas,
          estado: 'En Uso',
          pares_producidos: null,
          rendimiento_comentario: ''
        };
        prev.distribucion_hilo.push(newDist);
        addNotification(`Se entregó ${payload.cajas_entregadas} caja(s) de hilo a ${op.nombre} (simulado)`, 'success');
        return { ...prev };
      });
    }
    fetchData();
  };

  const handleCompletarDistribucion = async (e) => {
    e.preventDefault();
    if (!distribucionACompletar) return;
    const { pares, comentario } = paresRendimientoForm;
    const payload = {
      id: distribucionACompletar.id,
      pares_producidos: parseInt(pares) || 0,
      rendimiento_comentario: comentario
    };

    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/materia-prima/completar-distribucion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch {
        addNotification('Error al registrar rendimiento de hilo', 'error');
      }
    } else {
      // Simulación local
      setBackendState(prev => {
        const item = prev.distribucion_hilo.find(x => x.id === payload.id);
        if (item) {
          item.estado = 'Completado';
          item.pares_producidos = payload.pares_producidos;
          item.rendimiento_comentario = payload.rendimiento_comentario;
          addNotification(`Rendimiento registrado: ${payload.pares_producidos} pares (simulado)`, 'success');
        }
        return { ...prev };
      });
    }
    setDistribucionACompletar(null);
    setParesRendimientoForm({ pares: '', comentario: '' });
    fetchData();
  };

  const handleCrearProveedor = async (e) => {
    e.preventDefault();
    if (!proveedorForm.nombre || !proveedorForm.telefono) {
      addNotification("Por favor, ingrese Nombre y Teléfono del proveedor", "warning");
      return;
    }
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/materia-prima/proveedores/crear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proveedorForm)
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
        setProveedorForm({ nombre: '', RUC: '', telefono: '', contacto: '', direccion: '', tipos_hilo: '' });
      } catch {
        addNotification('Error de red al registrar proveedor', 'error');
      }
    } else {
      // Simulación local
      setBackendState(prev => {
        const newProv = {
          id: (prev.proveedores_hilo || []).length + 1,
          nombre: proveedorForm.nombre,
          RUC: proveedorForm.RUC,
          telefono: proveedorForm.telefono,
          contacto: proveedorForm.contacto,
          direccion: proveedorForm.direccion,
          tipos_hilo: proveedorForm.tipos_hilo
        };
        addNotification(`Proveedor ${proveedorForm.nombre} registrado con éxito (simulado)`, 'success');
        return {
          ...prev,
          proveedores_hilo: [...(prev.proveedores_hilo || []), newProv]
        };
      });
      setProveedorForm({ nombre: '', RUC: '', telefono: '', contacto: '', direccion: '', tipos_hilo: '' });
    }
    fetchData();
  };

  const handleProcesarRemallado = async (e) => {
    e.preventDefault();
    if (!remalladoForm.operario_id || !remalladoForm.lote_id || !remalladoForm.maquina_id) {
      addNotification("Selecciona máquina, lote y operario para registrar costura", "error");
      return;
    }
    const payload = {
      lote_id: parseInt(remalladoForm.lote_id),
      operario_id: parseInt(remalladoForm.operario_id),
      maquina_id: remalladoForm.maquina_id,
      cantidad: parseInt(remalladoForm.cantidad) || 10
    };
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/remallado/procesar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          addNotification(`Error: ${data.error}`, "error");
        } else {
          addNotification(data.message, "success");
        }
      } catch (err) {
        addNotification("Error al procesar remallado", "error");
      }
    } else {
      setBackendState(prev => {
        const op = prev.operarios.find(o => o.id === payload.operario_id);
        const pago = payload.cantidad * (op ? op.tarifa : 0);
        const newLotes = prev.lotes.map(l => l.id === payload.lote_id ? { ...l, estado: 'Remallado' } : l);
        
        // Simular encendido temporizado de la máquina
        const updatedMaquinas = prev.maquinas.map(m => {
          if (m.id === payload.maquina_id) {
            return { ...m, estado: 'Activa' };
          }
          return m;
        });
        setTimeout(() => {
          setBackendState(curr => {
            const nextMaquinas = curr.maquinas.map(m => m.id === payload.maquina_id ? { ...m, estado: 'Inactiva' } : m);
            return { ...curr, maquinas: nextMaquinas };
          });
        }, 8000);

        addNotification(`Remallado registrado en máquina ${payload.maquina_id}. Pago al destajo para ${op ? op.nombre : ''}: S/ ${pago.toFixed(2)}`, "success");
        return { ...prev, lotes: newLotes, maquinas: updatedMaquinas };
      });
    }
    fetchData();
  };

  const handleEmpaquetarBulto = async () => {
    const payload = {
      sku: posSelection.sku || 'MED-GEN-01',
      tipo_bolsa: 'Mediana',
      cantidad_paquetes: 10
    };
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/acabado/empaquetar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        addNotification(data.message, "success");
      } catch (err) {
        addNotification("Error al empaquetar", "error");
      }
    } else {
      const nuevoBulto = {
        id: backendState.bultos.length + 1,
        tipo_bolsa: 'Mediana',
        cantidad_paquetes: 10,
        total_pares: 120,
        sku: posSelection.sku || 'MED-GEN-01',
        salon_id: 'Almacen General',
        estado: 'Listo para Despacho'
      };
      setBackendState(prev => ({
        ...prev,
        bultos: [...prev.bultos, nuevoBulto]
      }));
      addNotification("Bulto máster consolidado y asentado en inventario", "success");
    }
    fetchData();
  };

  const handleCrearVenta = async (e) => {
    e.preventDefault();
    const payload = {
      cliente_documento: ventasForm.cliente_documento,
      nombre_cliente: ventasForm.nombre_cliente,
      telefono: ventasForm.telefono,
      direccion: ventasForm.direccion,
      sku: ventasForm.sku,
      cantidad_paquetes: ventasForm.cantidad,
      cantidad: ventasForm.cantidad,
      condicion: ventasForm.condicion,
      medio_pago: ventasForm.medio,
      supervisor_pwd: ventasForm.supervisor_pwd,
      precio_unitario: ventasForm.precio_docena
    };
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/ventas/crear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          addNotification(data.error, "error");
        } else {
          addNotification(data.message, "success");
        }
      } catch (err) {
        addNotification("Error al enviar la venta", "error");
      }
    } else {
      // Simulación local de venta
      let cliente = backendState.clientes.find(c => c.numero_documento === payload.cliente_documento);
      if (!cliente) {
        cliente = {
          id: backendState.clientes.length + 1,
          tipo_documento: payload.cliente_documento.length === 8 ? 'DNI' : 'RUC',
          numero_documento: payload.cliente_documento,
          nombre_cliente: payload.nombre_cliente || 'Cliente Nuevo',
          telefono: payload.telefono || '',
          direccion: payload.direccion || '',
          cuotas_vencidas: 0
        };
        setBackendState(prev => ({
          ...prev,
          clientes: [...prev.clientes, cliente]
        }));
      }

      if (cliente.cuotas_vencidas > 0 && payload.supervisor_pwd !== '1234') {
        addNotification("BLOQUEADO: El cliente tiene cuotas vencidas. Requiere aprobación de supervisor (clave 1234)", "error");
        return;
      }

      const bultos = backendState.bultos.filter(b => b.sku === payload.sku && b.estado !== 'Despachado');
      const totalPacks = bultos.reduce((a, b) => a + b.cantidad_paquetes, 0);

      if (totalPacks < payload.cantidad) {
        addNotification(`Stock Insuficiente en los almacenes: Solo hay ${totalPacks} paquetes de ${payload.sku}`, "error");
        return;
      }

      let restante = payload.cantidad;
      setBackendState(prev => {
        const newBultos = prev.bultos.map(b => {
          if (b.sku === payload.sku && b.estado !== 'Despachado' && restante > 0) {
            if (b.cantidad_paquetes <= restante) {
              restante -= b.cantidad_paquetes;
              // descontar del salon
              const sal = prev.salones.find(s => s.id === b.salon_id);
              if (sal) sal.bultos_actuales = Math.max(0, sal.bultos_actuales - 1);
              return { ...b, estado: 'Despachado', cantidad_paquetes: 0, total_pares: 0 };
            } else {
              b.cantidad_paquetes -= restante;
              b.total_pares = b.cantidad_paquetes * 12;
              restante = 0;
            }
          }
          return b;
        });
        return { ...prev, bultos: newBultos };
      });

      addNotification("Venta registrada con éxito (simulado)", "success");
      setVentasForm(prev => ({ ...prev, supervisor_pwd: '' }));
      setPosStep(1);
    }
  };

  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    if (!clienteForm.numero_documento || !clienteForm.nombre_cliente) {
      addNotification("Por favor, ingrese documento y nombre del cliente", "warning");
      return;
    }
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/clientes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clienteForm)
        });
        const data = await res.json();
        if (!res.ok) {
          addNotification(data.error, "error");
        } else {
          addNotification(data.message, "success");
          setClienteForm({ numero_documento: '', nombre_cliente: '', telefono: '', direccion: '', cuotas_vencidas: 0 });
        }
      } catch (err) {
        addNotification("Error al guardar cliente", "error");
      }
    } else {
      // Simulado local
      setBackendState(prev => {
        const existingIdx = prev.clientes.findIndex(c => c.numero_documento === clienteForm.numero_documento);
        let newClientes = [...prev.clientes];
        if (existingIdx >= 0) {
          newClientes[existingIdx] = { ...newClientes[existingIdx], ...clienteForm };
        } else {
          newClientes.push({
            id: prev.clientes.length + 1,
            tipo_documento: clienteForm.numero_documento.length === 8 ? 'DNI' : 'RUC',
            cuotas_vencidas: 0,
            ...clienteForm
          });
        }
        return { ...prev, clientes: newClientes };
      });
      addNotification("Cliente guardado con éxito (simulado)", "success");
      setClienteForm({ numero_documento: '', nombre_cliente: '', telefono: '', direccion: '', cuotas_vencidas: 0 });
    }
    fetchData();
  };

  // Auto SKU Generator
  const generatedSku = `${skuForm.categoria.substring(0, 3).toUpperCase()}-${skuForm.diseno === 'Color entero' ? 'ENT' : 'DIS'}-${skuForm.calidad === 'Delgada' ? 'DEL' : 'AFE'}-${skuForm.talla === 'Talla Única' ? 'UNI' : String(skuForm.talla).padStart(2, '0')}`;

  const handleDespachar = async (ordenId) => {
    try {
      const res = await fetch(`${API_BASE}/despacho/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden_id: ordenId })
      });
      const data = await res.json();
      if (!res.ok) { addNotification(data.error, 'error'); return; }
      addNotification(data.message, 'success');
      fetchData();
    } catch { addNotification('Error de red al despachar', 'error'); }
  };

  const handleConfirmarPagoInicial = async (ordenId) => {
    try {
      const res = await fetch(`${API_BASE}/despacho/confirmar-pago-inicial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orden_id: ordenId })
      });
      const data = await res.json();
      if (!res.ok) { addNotification(data.error, 'error'); return; }
      addNotification(data.message, 'success');
      fetchData();
    } catch { addNotification('Error de red', 'error'); }
  };

  const handleVoltearLote = async (loteId) => {
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/remallado/voltear`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lote_id: loteId })
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red', 'error'); }
    } else {
      setBackendState(prev => {
        const newLotes = prev.lotes.map(l => l.id === loteId ? { ...l, estado: 'Listo para Planchado' } : l);
        return { ...prev, lotes: newLotes };
      });
      addNotification(`Lote #${loteId} volteado (simulado)`, 'success');
    }
    fetchData();
  };

  const handlePlancharLote = async (loteId) => {
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/acabado/planchar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lote_id: loteId })
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red', 'error'); }
    } else {
      setBackendState(prev => {
        const newLotes = prev.lotes.map(l => l.id === loteId ? { ...l, estado: 'Listo para Remallado' } : l);
        return { ...prev, lotes: newLotes };
      });
      addNotification(`Lote #${loteId} planchado (simulado)`, 'success');
    }
    fetchData();
  };
  const handleAprobarAcabado = async (loteId) => {
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/acabado/inspeccionar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lote_id: loteId })
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red', 'error'); }
    } else {
      setBackendState(prev => {
        const newLotes = prev.lotes.map(l => l.id === loteId ? { ...l, estado: 'Aprobado para Preparado' } : l);
        return { ...prev, lotes: newLotes };
      });
      addNotification(`Lote #${loteId} aprobado en control de calidad (simulado)`, 'success');
    }
    fetchData();
  };

  const handleReprocesarLote = async (loteId) => {
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/acabado/reprocesar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lote_id: loteId })
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red', 'error'); }
    } else {
      setBackendState(prev => {
        const newLotes = prev.lotes.map(l => l.id === loteId ? { ...l, estado: 'Aprobado para Preparado' } : l);
        return { ...prev, lotes: newLotes };
      });
      addNotification(`Lote #${loteId} corregido y reprocesado (simulado)`, 'success');
    }
    fetchData();
  };

  const handleEmpacarLote = async (lote, sku, tipoBolsa, cantidadPaquetes) => {
    const numPaq = parseInt(cantidadPaquetes) || Math.ceil(lote.cantidad_pares_estimada / 12);
    const payload = {
      sku: sku || 'NIN-ENT-DEL-04',
      tipo_bolsa: tipoBolsa || 'Mediana',
      cantidad_paquetes: numPaq,
      lote_id: lote.id
    };
    if (!connectionError) {
      try {
        const res = await fetch(`${API_BASE}/acabado/empaquetar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) { addNotification(data.error, 'error'); return; }
        addNotification(data.message, 'success');
      } catch { addNotification('Error de red', 'error'); }
    } else {
      const nuevoBulto = { id: backendState.bultos.length + 1, ...payload, total_pares: numPaq * 12, salon_id: null, estado: 'Listo para Despacho' };
      setBackendState(prev => {
        const newLotes = prev.lotes.map(l => l.id === lote.id ? { ...l, estado: 'Empacado' } : l);
        return { ...prev, bultos: [...prev.bultos, nuevoBulto], lotes: newLotes };
      });
      addNotification(`Lote #${lote.id} empacado (simulado)`, 'success');
    }
    fetchData();
  };

  return (
    <div className="flex bg-background min-h-screen text-on-surface">

      {/* =====================================================
          PANTALLA DE LOGIN (muestra si no ha iniciado sesión)
          ===================================================== */}
      {!isLoggedIn && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Fondo decorativo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative w-full max-w-lg px-6">
            {/* Logo y titulo */}
            <div className="text-center mb-10">
              <img src="/logo_transparent.png?v=3" alt="Durey" className="h-20 w-auto object-contain mx-auto mb-4 brightness-0 invert" />
              <h1 className="text-3xl font-black text-white tracking-widest uppercase">DUREY</h1>
              <p className="text-slate-400 text-sm mt-1 font-medium">Sistema de Gestión de Fábrica</p>
            </div>

            {/* PASO 1: Seleccionar perfil */}
            {loginStep === 1 && (
              <div>
                <p className="text-center text-slate-300 text-sm font-semibold mb-5 uppercase tracking-widest">Selecciona tu perfil</p>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(ROLE_LABELS).map(([role, cfg]) => (
                    <button
                      key={role}
                      onClick={() => handleLoginRoleSelect(role)}
                      className={`group flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-gradient-to-br hover:${cfg.gradient} transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:border-white/30 active:scale-95`}
                    >
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-lg`}>
                        <span className="material-symbols-outlined text-white text-2xl">{cfg.icon}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-sm">{cfg.label}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5 group-hover:text-white/80 transition">{cfg.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 2: Ingresar credencial */}
            {loginStep === 2 && (
              <div>
                <button
                  onClick={() => { setLoginStep(1); setLoginError(''); }}
                  className="flex items-center gap-1 text-slate-400 hover:text-white text-xs mb-6 transition"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Volver a perfiles
                </button>

                {/* Perfil seleccionado */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${ROLE_LABELS[userRole]?.gradient} flex items-center justify-center shadow-md`}>
                    <span className="material-symbols-outlined text-white text-xl">{ROLE_LABELS[userRole]?.icon}</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{ROLE_LABELS[userRole]?.label}</p>
                    <p className="text-slate-400 text-xs">{ROLE_LABELS[userRole]?.desc}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">Contraseña</label>
                  <input
                    type="password"
                    value={loginPasswordInput}
                    onChange={e => { setLoginPasswordInput(e.target.value); setLoginError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
                    placeholder="Ingresa tu contraseña..."
                    autoFocus
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                  {loginError && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {loginError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleLoginSubmit}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${ROLE_LABELS[userRole]?.gradient} hover:opacity-90 hover:shadow-xl transition-all duration-150 active:scale-95 flex items-center justify-center gap-2`}
                >
                  <span className="material-symbols-outlined text-sm">login</span>
                  Ingresar al Sistema
                </button>
              </div>
            )}

            <p className="text-center text-slate-600 text-[10px] mt-8">DUREY © 2026 — Sistema ERP de Fábrica</p>
          </div>
        </div>
      )}

      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} setTheme={setTheme} userRole={userRole} />

      {/* Main Panel */}
      <div className="ml-72 flex-1 flex flex-col min-h-screen p-8">
        
        {/* ===== MODAL CONTRASEÑA (ya no se usa, login es en pantalla completa) ===== */}

        {/* Top bar: perfil activo + cerrar sesión + estado conexión */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-outline-variant">
          <div>
            <h2 className="text-2xl font-black tracking-widest text-primary uppercase">DUREY</h2>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Panel de Control de Producción</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Chip del perfil activo */}
            {ROLE_LABELS[userRole] && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${ROLE_LABELS[userRole].color}`}>
                <span className="material-symbols-outlined text-[15px]">{ROLE_LABELS[userRole].icon}</span>
                <span>{ROLE_LABELS[userRole].label}</span>
              </div>
            )}

            {/* Boton cerrar sesion */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-error-container hover:text-error hover:border-error transition"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>

            {/* Estado conexión */}
            {connectionError ? (
              <span className="flex items-center gap-2 bg-error-container text-error text-xs px-3 py-1.5 rounded-full font-semibold">
                <span className="material-symbols-outlined text-sm">wifi_off</span>
                Respaldo
              </span>
            ) : (
              <span className="flex items-center gap-2 bg-emerald-50 text-emerald-600 text-xs px-3 py-1.5 rounded-full font-semibold">
                <span className="material-symbols-outlined text-sm">wifi</span>
                API Activa
              </span>
            )}
          </div>
        </header>

        {/* Notifications Display */}
        {notifications.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-md">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`p-4 rounded-lg shadow-lg flex items-center gap-3 border transition-all duration-200 ${
                  n.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                  n.type === 'error' ? 'bg-error-container border-error text-error' :
                  n.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                  'bg-surface border-outline-variant text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {n.type === 'success' ? 'check_circle' : n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'info'}
                </span>
                <span className="text-sm font-medium">{n.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* TABS CONTAINER */}
        <main className="flex-1">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {(() => {
                const manualLots = backendState.lotes.filter(l => ['Listo para Volteado', 'Listo para Remallado', 'Remallado', 'Planchado'].includes(l.estado)).length;
                if (manualLots >= 2) {
                  return (
                    <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-sm font-semibold shadow-sm animate-pulse">
                      <span className="material-symbols-outlined text-amber-600">hourglass_empty</span>
                      <span>
                        ⚠️ ALERTA DE CUELLO DE BOTELLA: Hay {manualLots} lotes retenidos en las etapas manuales de Volteado / Remallado / Planchado. Se sugiere reasignar personal para desatascar la línea de producción.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Producción Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary-fixed rounded-lg text-primary">
                      <span className="material-symbols-outlined">precision_manufacturing</span>
                    </div>
                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
                      +12% <span className="material-symbols-outlined text-xs">trending_up</span>
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Producción Diaria</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-on-surface font-mono tabular-nums">
                      {backendState.lotes.reduce((acc, l) => acc + (l.cantidad_pares_primera || 0) + (l.cantidad_pares_segunda || 0), 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-on-surface-variant">pares</span>
                  </div>
                  <div className="mt-4 w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: `${Math.min(100, (backendState.lotes.reduce((acc, l) => acc + (l.cantidad_pares_primera || 0) + (l.cantidad_pares_segunda || 0), 0) / 15000) * 100)}%` }}></div>
                  </div>
                  <p className="mt-2 text-[11px] text-on-surface-variant">Meta: 15,000 pares diarios</p>
                </div>

                {/* Estado Máquinas Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-secondary-fixed rounded-lg text-secondary">
                      <span className="material-symbols-outlined">settings_input_component</span>
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant">Total: 64</span>
                  </div>
                  <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Estado Máquinas</h3>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="block text-2xl font-bold text-on-surface font-mono tabular-nums">
                        {backendState.maquinas.filter(m => m.estado === 'Tejiendo').length}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">Tejiendo</span>
                    </div>
                    <div className="border-l border-outline-variant pl-4">
                      <span className="block text-2xl font-bold text-on-surface font-mono tabular-nums">
                        {backendState.maquinas.filter(m => m.estado === 'Inactiva' && m.tipo === 'tejido').length}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase">Inactivas</span>
                    </div>
                    <div className="border-l border-outline-variant pl-4">
                      <span className="block text-2xl font-bold text-error font-mono tabular-nums">
                        {backendState.maquinas.filter(m => m.estado === 'Averiada').length}
                      </span>
                      <span className="text-[10px] text-error font-bold uppercase">Averiadas</span>
                    </div>
                  </div>
                </div>

                {/* Stock Almacén Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-tertiary-fixed rounded-lg text-tertiary">
                      <span className="material-symbols-outlined">inventory_2</span>
                    </div>
                    <span className="text-tertiary text-xs font-bold bg-tertiary-fixed/30 px-2 py-1 rounded-full">Cap. Real</span>
                  </div>
                  <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Stock Almacén</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-on-surface font-mono tabular-nums">
                      {backendState.bultos.reduce((acc, b) => acc + (b.total_pares || 0), 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-on-surface-variant">pares</span>
                  </div>
                  <p className="mt-4 text-[12px] text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-primary">local_shipping</span> {backendState.bultos.filter(b => b.estado === 'Listo para Despacho').length} bultos listos
                  </p>
                </div>

                {/* Hilo Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-on-secondary-fixed text-white rounded-lg">
                      <span className="material-symbols-outlined">texture</span>
                    </div>
                  </div>
                  <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Stock Hilo</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-on-surface font-mono tabular-nums">
                      {Math.round(backendState.inventario_hilo.reduce((a, b) => a + (b.stock_kg || 0), 0))}
                    </span>
                    <span className="text-xs text-on-surface-variant">Kg</span>
                  </div>
                  {backendState.inventario_hilo.some(h => h.stock_kg < h.umbral_minimo) ? (
                    <div className="flex items-center gap-2 mt-4 p-2 bg-error-container text-on-error-container rounded-lg border border-error/20">
                      <span className="material-symbols-outlined text-[18px]">warning</span>
                      <span className="text-[10px] font-bold truncate">
                        Crítico: Hilo {backendState.inventario_hilo.find(h => h.stock_kg < h.umbral_minimo).color}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-4 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span> {backendState.inventario_hilo.length > 0 ? "Abastecimiento óptimo" : "Sin inventario de hilo"}
                    </p>
                  )}
                </div>
              </div>

              {/* Central Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart: Calidad */}
                <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-on-surface">Calidad de Producción por Turno</h3>
                    <span className="text-xs font-bold text-secondary uppercase bg-surface-container px-2.5 py-1 rounded">Semana Actual</span>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-6 px-4">
                    {/* Columns */}
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((dia, i) => (
                      <div key={dia} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex items-end gap-1 h-36">
                          <div className="flex-1 bg-primary rounded-t-sm" style={{ height: backendState.lotes.length > 0 ? '50%' : '0%' }}></div>
                          <div className="flex-1 bg-secondary-container rounded-t-sm" style={{ height: '0%' }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">{dia}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-6 mt-6 border-t border-outline-variant pt-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-primary rounded-full"></span>
                      <span className="text-xs text-on-surface-variant font-semibold">Primeras (Apta Venta)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-secondary-container rounded-full"></span>
                      <span className="text-xs text-on-surface-variant font-semibold">Segundas (Defectuosas)</span>
                    </div>
                  </div>
                </div>

                {/* Cartera Pendiente (Debts) */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-on-surface mb-4">Cartera Pendiente</h3>
                    <div className="space-y-3">
                      {backendState.clientes.filter(c => c.cuotas_vencidas > 0).map(c => (
                        <div key={c.id} className="p-3 bg-surface-container-low rounded-lg border-l-4 border-error flex justify-between items-center hover:bg-surface-container-high transition-colors">
                          <div>
                            <p className="font-bold text-xs text-on-surface">{c.nombre_cliente}</p>
                            <p className="text-[10px] text-error font-extrabold mt-0.5">{c.cuotas_vencidas} cuota(s) vencida(s)</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xs font-bold text-on-surface">Doc: {c.numero_documento}</p>
                            <span className="text-[9px] text-on-surface-variant uppercase font-semibold">Bloqueado</span>
                          </div>
                        </div>
                      ))}
                      {backendState.clientes.filter(c => c.cuotas_vencidas > 0).length === 0 && (
                        <div className="p-6 text-center text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-emerald-500 text-2xl mb-1">verified</span>
                          <p className="font-bold">Sin cartera deudora pendiente.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('ventas')} className="w-full mt-4 py-2 border border-primary text-primary font-bold text-xs rounded-lg hover:bg-primary/5 transition-colors">
                    Ver Terminal POS
                  </button>
                </div>
              </div>

              {/* Lower Section: Active machines line monitoring */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
                  <h3 className="font-bold text-lg text-on-surface">Monitoreo de Línea de Producción (Knitting)</h3>
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Sistema Online
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Máquina</th>
                        <th className="px-6 py-3">Operario</th>
                        <th className="px-6 py-3">Producto Actual</th>
                        <th className="px-6 py-3">Eficiencia</th>
                        <th className="px-6 py-3 text-right">Producción</th>
                        <th className="px-6 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-mono">
                      {backendState.maquinas.filter(m => m.tipo === 'tejido').slice(0, 4).map((maq, index) => {
                        const lot = backendState.lotes.find(l => l.maquina_id === maq.id && l.estado === 'Tejiendo');
                        const encargado = backendState.operarios.find(o => o.id === maq.encargado_id);
                        return (
                          <tr key={index} className="hover:bg-surface-container-low transition-colors font-sans">
                            <td className="px-6 py-3.5 font-mono font-bold text-on-surface">{maq.id}</td>
                            <td className="px-6 py-3.5 text-secondary">{encargado ? encargado.nombre : 'S/O'}</td>
                            <td className="px-6 py-3.5 text-secondary">{lot ? `Medias de ${lot.color} (${lot.material})` : 'N/A'}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="w-24 bg-surface-container-high h-1.5 rounded-full block overflow-hidden">
                                  <div className={`h-full ${maq.estado === 'Tejiendo' ? 'bg-primary' : maq.estado === 'Averiada' ? 'bg-error' : 'bg-transparent'}`} style={{ width: maq.estado === 'Tejiendo' ? '92%' : maq.estado === 'Averiada' ? '12%' : '0%' }}></div>
                                </span>
                                <span className="font-bold text-xs font-mono">{maq.estado === 'Tejiendo' ? '92%' : maq.estado === 'Averiada' ? '12%' : '0%'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono text-secondary tabular-nums">
                              {lot ? `0 / ${lot.cantidad_pares_estimada}` : '0 / 0'}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase ${
                                maq.estado === 'Tejiendo' ? 'bg-emerald-100 text-emerald-700' :
                                maq.estado === 'Averiada' ? 'bg-error-container text-error' :
                                'bg-surface-variant text-on-surface-variant'
                              }`}>
                                {maq.estado === 'Tejiendo' ? 'Activa' : maq.estado === 'Averiada' ? 'Avería' : 'Inactiva'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'tejido' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side: Interactive Machine Grid (col-span-2) */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-2xl text-on-surface">Monitor de Producción</h2>
                      <p className="text-sm text-on-surface-variant">Control de máquinas en tiempo real</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={generatePDFTejido}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                        Reporte Semanal PDF
                      </button>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        {backendState.maquinas.filter(m => m.estado === 'Tejiendo').length} Activas
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        {backendState.maquinas.filter(m => m.estado === 'Inactiva' && m.tipo === 'tejido').length} Inactivas
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
                        <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                        {backendState.maquinas.filter(m => m.estado === 'Averiada').length} Averiada
                      </div>
                    </div>
                  </div>

                  {/* 64 Machines Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                    {backendState.maquinas.filter(m => m.tipo === 'tejido').map(m => {
                      const isSelected = selectedMaquinas.includes(m.id);
                      const encargado = backendState.operarios.find(o => o.id === m.encargado_id);
                      const lot = backendState.lotes.find(l => l.maquina_id === m.id && l.estado === 'Tejiendo');
                      return (
                        <div
                          key={m.id}
                          className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${
                            isSelected ? 'ring-2 ring-primary border-primary' : 'border-outline-variant'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-mono text-primary font-bold text-sm">{m.id}</p>
                              <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider truncate max-w-[100px]">
                                {encargado ? encargado.nombre.split(' ')[0] : 'Sin operario'}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                              m.estado === 'Tejiendo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              m.estado === 'Averiada' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                              'bg-surface-variant text-on-surface-variant border-outline-variant'
                            }`}>
                              {m.estado === 'Tejiendo' ? 'En Marcha' : m.estado === 'Averiada' ? 'Error Crítico' : 'En Pausa'}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${
                                  m.estado === 'Tejiendo' ? 'bg-primary' : m.estado === 'Averiada' ? 'bg-error' : 'bg-transparent'
                                }`}
                                style={{ width: m.estado === 'Tejiendo' ? '65%' : m.estado === 'Averiada' ? '12%' : '0%' }}
                              />
                            </div>
                            <div className="flex gap-1.5">
                              {m.estado === 'Inactiva' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Seleccionar máquina para encender
                                    if (selectedMaquinas.includes(m.id)) {
                                      setSelectedMaquinas(selectedMaquinas.filter(id => id !== m.id));
                                    } else {
                                      setSelectedMaquinas([...selectedMaquinas, m.id]);
                                    }
                                  }}
                                  className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors active:scale-95 ${
                                    isSelected ? 'bg-primary-container text-primary border border-primary' : 'bg-primary text-white hover:bg-primary-container'
                                  }`}
                                >
                                  {isSelected ? 'ELEGIDA' : 'INICIAR'}
                                </button>
                              ) : m.estado === 'Tejiendo' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFinTejidoMaq(m.id);
                                    if (lot) {
                                      setPrimeraCalidad(lot.cantidad_pares_estimada - 5);
                                      setSegundaCalidad(5);
                                    }
                                  }}
                                  className="flex-1 py-1 text-[10px] font-bold rounded border border-outline text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95"
                                >
                                  PARAR
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="flex-1 py-1 text-[10px] font-bold rounded bg-surface-container-high text-on-surface-variant opacity-60 cursor-not-allowed"
                                >
                                  AVERÍA
                                </button>
                              )}

                              {m.estado === 'Tejiendo' && (
                                <button
                                  type="button"
                                  onClick={() => handleReportBreakdown(m.id)}
                                  className="px-2 py-1 text-[10px] font-bold rounded bg-error text-white hover:bg-error-container transition-colors active:scale-95"
                                  title="Reportar avería"
                                >
                                  FALLA
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Volteado Machine Queue */}
                  <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-primary text-white flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm font-bold">rotate_right</span>
                        <h4 className="font-bold text-xs uppercase tracking-wider">Cola de Volteado (Máquina)</h4>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-white/20 rounded uppercase tracking-wider">Paso 2 del Proceso</span>
                    </div>
                    <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                      {backendState.lotes.filter(l => l.estado === 'Listo para Volteado').map((lot, index) => (
                        <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border border-outline-variant rounded-xl p-3 bg-white hover:shadow-md transition-all gap-3">
                          <div>
                            <span className="text-[9px] font-bold text-outline uppercase tracking-tight">Lote en Espera</span>
                            <p className="font-bold text-sm">Batch #LOT-{lot.id} - Calcetín {lot.material}</p>
                            <p className="text-[10px] text-on-surface-variant font-bold">Color: {lot.color} | Cantidad: {lot.cantidad_pares_estimada} pares</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleVoltearLote(lot.id)}
                            className="bg-primary text-white py-1.5 px-4 rounded-lg font-bold text-xs hover:bg-primary/90 transition active:scale-95 flex items-center gap-1 self-stretch sm:self-auto justify-center"
                          >
                            <span className="material-symbols-outlined text-sm">rotate_right</span>
                            Registrar Volteado
                          </button>
                        </div>
                      ))}
                      {backendState.lotes.filter(l => l.estado === 'Listo para Volteado').length === 0 && (
                        <p className="text-xs text-on-surface-variant text-center py-4 italic">No hay lotes en espera de volteado actualmente.</p>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Side: Sidebar Panels (col-span-1) */}
                <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-6">
                  
                  {/* Fin de Tejido Form (Inspección y Clasificación) */}
                  {finTejidoMaq && (
                    <div className="p-4 bg-primary-container text-on-primary-container rounded-xl border border-primary-container/30 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm">Fin de Tejido: Máquina {finTejidoMaq}</h4>
                        <button onClick={() => setFinTejidoMaq(null)} className="text-secondary hover:text-on-surface">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                      <form onSubmit={handleClasificarLote} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-on-surface">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-secondary">Medias de Primera</label>
                            <input
                              type="number"
                              value={primeraCalidad}
                              onChange={(e) => setPrimeraCalidad(parseInt(e.target.value) || 0)}
                              className="w-full mt-1 p-1.5 border border-outline-variant bg-surface rounded text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-secondary">Medias de Segunda</label>
                            <input
                              type="number"
                              value={segundaCalidad}
                              onChange={(e) => setSegundaCalidad(parseInt(e.target.value) || 0)}
                              className="w-full mt-1 p-1.5 border border-outline-variant bg-surface rounded text-xs font-bold"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-emerald-600 text-on-primary py-2 rounded-lg font-bold text-xs"
                        >
                          Clasificar e Inspeccionar Lote
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Encargado Assignment */}
                  <div>
                    <h4 className="font-bold text-sm text-primary mb-3 uppercase tracking-wider">Asignar Encargado</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-secondary">Encargado de Tejido</label>
                        <select
                          value={selectedEncargado}
                          onChange={(e) => setSelectedEncargado(e.target.value)}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                        >
                          <option value="">-- Seleccionar operario --</option>
                          {backendState.operarios.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.nombre} ({o.tipo_contrato === 'jornal' ? `Sueldo Fijo: S/ ${o.tarifa.toFixed(2)}/día` : `A Destajo: S/ ${o.tarifa.toFixed(2)}/docena`})
                            </option>
                          ))}
                          {backendState.operarios.length === 0 && (
                            <option value="">Sin operarios creados aún</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary">Máquinas seleccionadas ({selectedMaquinas.length})</label>
                        <div className="text-xs bg-surface p-2 rounded-lg border border-outline-variant min-h-[40px] flex flex-wrap gap-1 items-center">
                          {selectedMaquinas.map(id => (
                            <span key={id} className="bg-primary text-on-primary px-2 py-0.5 rounded font-mono text-[10px]">{id}</span>
                          ))}
                          {selectedMaquinas.length === 0 && <span className="text-secondary text-[11px]">Selecciona máquinas en la grilla para asignarlas</span>}
                        </div>
                      </div>
                      <button
                        onClick={handleAssignEncargado}
                        className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold hover:bg-primary-container transition text-xs"
                      >
                        Confirmar Asignación
                      </button>
                    </div>
                  </div>

                  <hr className="border-outline-variant" />

                  {/* Start knitting machine */}
                  <div>
                    <h4 className="font-bold text-sm text-primary mb-3 uppercase tracking-wider">Cargar Hilo e Iniciar Proceso</h4>
                    <form onSubmit={handleStartTejido} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-secondary">Seleccione Encargado</label>
                        <select
                          value={tejidoForm.encargado_id}
                          onChange={(e) => {
                            const encId = parseInt(e.target.value) || '';
                            const maquinasEnc = backendState.maquinas.filter(m => m.tipo === 'tejido' && m.encargado_id === encId);
                            const inactivas = maquinasEnc.filter(m => m.estado === 'Inactiva').map(m => m.id);
                            setTejidoForm({
                              ...tejidoForm,
                              encargado_id: encId,
                              maquinas_seleccionadas: inactivas
                            });
                          }}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                        >
                          <option value="">-- Seleccionar encargado --</option>
                          {backendState.operarios.filter(o => o.tipo_contrato === 'jornal').map(o => (
                            <option key={o.id} value={o.id}>{o.nombre} (Jornal)</option>
                          ))}
                        </select>
                      </div>

                      {/* Mostrar las máquinas asociadas al encargado */}
                      {tejidoForm.encargado_id && (() => {
                        const maquinasEnc = backendState.maquinas.filter(m => m.tipo === 'tejido' && m.encargado_id === tejidoForm.encargado_id);
                        if (maquinasEnc.length === 0) {
                          return (
                            <p className="text-xs text-error font-semibold py-1">⚠️ Este encargado no tiene máquinas asignadas.</p>
                          );
                        }

                        return (
                          <div className="bg-surface-container p-3 rounded-lg border border-outline-variant space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-secondary uppercase">
                              <span>Línea de producción:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const inactivas = maquinasEnc.filter(m => m.estado === 'Inactiva').map(m => m.id);
                                  const allSelected = tejidoForm.maquinas_seleccionadas.length === inactivas.length;
                                  setTejidoForm({
                                    ...tejidoForm,
                                    maquinas_seleccionadas: allSelected ? [] : inactivas
                                  });
                                }}
                                className="text-[10px] text-primary lowercase hover:underline font-bold"
                              >
                                {tejidoForm.maquinas_seleccionadas.length === maquinasEnc.filter(m => m.estado === 'Inactiva').length ? 'Desmarcar todas' : 'Seleccionar inactivas'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
                              {maquinasEnc.map(m => {
                                const isInactive = m.estado === 'Inactiva';
                                return (
                                  <label key={m.id} className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer select-none transition ${
                                    m.estado === 'Tejiendo' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-60 cursor-not-allowed' :
                                    m.estado === 'Averiada' ? 'bg-error-container border-error text-error opacity-60 cursor-not-allowed' :
                                    tejidoForm.maquinas_seleccionadas.includes(m.id) ? 'bg-primary-container border-primary text-primary font-bold' : 'bg-surface border-outline-variant text-secondary'
                                  }`}>
                                    <input
                                      type="checkbox"
                                      disabled={!isInactive}
                                      checked={tejidoForm.maquinas_seleccionadas.includes(m.id)}
                                      onChange={() => {
                                        if (!isInactive) return;
                                        const ids = tejidoForm.maquinas_seleccionadas.includes(m.id)
                                          ? tejidoForm.maquinas_seleccionadas.filter(id => id !== m.id)
                                          : [...tejidoForm.maquinas_seleccionadas, m.id];
                                        setTejidoForm({
                                          ...tejidoForm,
                                          maquinas_seleccionadas: ids
                                        });
                                      }}
                                      className="accent-primary"
                                    />
                                    <span>{m.id}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-secondary uppercase font-sans tracking-wide">Materiales / Hilos a Cargar</label>
                          <button
                            type="button"
                            onClick={() => setTejidoForm(prev => ({
                              ...prev,
                              hilos: [...prev.hilos, { hilo_id: '', cajas_por_maquina: 1 }]
                            }))}
                            className="text-primary hover:text-primary-container text-[11px] font-extrabold flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[14px]">add_circle</span> Añadir Hilo
                          </button>
                        </div>

                        {tejidoForm.hilos.map((item, index) => {
                          return (
                            <div key={index} className="border border-outline-variant p-2.5 rounded-lg bg-surface space-y-2 relative">
                              {tejidoForm.hilos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setTejidoForm(prev => ({
                                    ...prev,
                                    hilos: prev.hilos.filter((_, i) => i !== index)
                                  }))}
                                  className="absolute top-1.5 right-1.5 text-outline hover:text-error text-xs"
                                  title="Quitar material"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              )}

                              <div>
                                <label className="text-[9px] font-bold text-outline uppercase block">Hilo {index + 1}</label>
                                {backendState.inventario_hilo.length > 0 ? (
                                  <select
                                    value={item.hilo_id}
                                    onChange={(e) => {
                                      const selectedId = parseInt(e.target.value) || '';
                                      const updatedHilos = [...tejidoForm.hilos];
                                      updatedHilos[index] = { ...updatedHilos[index], hilo_id: selectedId };
                                      setTejidoForm({ ...tejidoForm, hilos: updatedHilos });
                                    }}
                                    className="w-full mt-0.5 p-1.5 border border-outline-variant bg-surface rounded text-xs font-bold text-primary outline-none"
                                    required
                                  >
                                    <option value="">-- Seleccionar Bobina --</option>
                                    {backendState.inventario_hilo.map(h => (
                                      <option key={h.id} value={h.id}>
                                        {h.material} {h.color} ({h.stock_cajas || 0} cajas disp)
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p className="text-[10px] text-error font-semibold py-1">
                                    ⚠️ Registre compras en la pestaña "Materia Prima".
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-outline uppercase">Cajas / Máquina</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.cajas_por_maquina}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 1;
                                      const updatedHilos = [...tejidoForm.hilos];
                                      updatedHilos[index] = { ...updatedHilos[index], cajas_por_maquina: val };
                                      setTejidoForm({ ...tejidoForm, hilos: updatedHilos });
                                    }}
                                    className="w-full p-1 border border-outline-variant rounded font-mono text-xs text-center font-bold text-primary"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-secondary font-sans">Pares / Máquina</label>
                        <input
                          type="number"
                          value={tejidoForm.cantidad}
                          onChange={(e) => setTejidoForm({ ...tejidoForm, cantidad: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                          min="1"
                        />
                      </div>

                      {/* Live Calculation Preview Card */}
                      {(() => {
                        const totalMaquinas = tejidoForm.maquinas_seleccionadas.length;
                        const itemsValidados = tejidoForm.hilos.filter(item => item.hilo_id !== '');
                        
                        let esTodoSuficiente = true;
                        const desgloseHilos = itemsValidados.map(item => {
                          const hiloSel = backendState.inventario_hilo.find(h => h.id === parseInt(item.hilo_id));
                          const cajasTotal = totalMaquinas * (item.cajas_por_maquina || 1);
                          const stockCajas = hiloSel ? (hiloSel.stock_cajas || 0) : 0;
                          const suficiente = stockCajas >= cajasTotal;
                          if (!suficiente) esTodoSuficiente = false;
                          
                          return {
                            nombre: hiloSel ? `${hiloSel.material} ${hiloSel.color}` : `Material ID ${item.hilo_id}`,
                            cajasTotal,
                            stockCajas,
                            suficiente
                          };
                        });

                        const totalCajasGlobal = desgloseHilos.reduce((acc, h) => acc + h.cajasTotal, 0);

                        return (
                          <div className={`p-3 rounded-lg border text-xs space-y-2 ${
                            totalCajasGlobal === 0 ? 'bg-surface-container border-outline-variant' :
                            esTodoSuficiente ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                          }`}>
                            <div className="flex justify-between items-center font-bold border-b border-outline-variant/30 pb-1.5">
                              <span>Total Cajas Requeridas:</span>
                              <span className="font-mono text-sm">{totalCajasGlobal} cajas</span>
                            </div>
                            
                            {desgloseHilos.map((h, i) => (
                              <div key={i} className="text-[10px] space-y-0.5">
                                <div className="flex justify-between items-center font-semibold">
                                  <span>• {h.nombre}:</span>
                                  <span>{h.cajasTotal} cajas</span>
                                </div>
                                <p className="opacity-80">
                                  {totalMaquinas} máq × {h.cajasTotal / (totalMaquinas || 1)} caja(s) = {h.cajasTotal} cajas req. (Disp: {h.stockCajas} cajas)
                                </p>
                              </div>
                            ))}

                            {itemsValidados.length > 0 && (
                              <p className={`text-[10px] font-bold pt-1 border-t border-outline-variant/20 ${esTodoSuficiente ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {esTodoSuficiente
                                  ? `✅ Todo en stock (${totalMaquinas} máquinas listas)`
                                  : `⚠️ Stock insuficiente en uno o más materiales cargados`}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      <button
                        type="submit"
                        className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold hover:bg-primary-container transition text-xs flex justify-center items-center gap-2 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">play_arrow</span>
                        Iniciar Tejido
                      </button>
                    </form>
                  </div>

                  {/* Stock Insuficiente Warning */}
                  {(() => {
                    const isLow = backendState.inventario_hilo.some(h => h.stock_kg < h.umbral_minimo);
                    if (isLow) {
                      return (
                        <div className="bg-rose-50 border border-rose-300 p-4 rounded-xl text-rose-800 text-xs font-semibold space-y-2">
                          <h4 className="flex items-center gap-1 text-sm font-bold">
                            <span className="material-symbols-outlined text-rose-600 text-[18px]">warning</span> Stock Insuficiente
                          </h4>
                          <p>
                            Alerta: El stock de bobinas de hilo de algunos colores clave está por debajo del umbral mínimo de seguridad. Verifique existencias antes de encender más máquinas de la línea.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'remallado' && (
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="font-bold text-2xl text-on-surface">Área de Remallado y Liquidación</h2>
                  <p className="text-sm text-on-surface-variant">Gestión de producción en tiempo real y nómina de operarios.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={generatePDFRemallado}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                    Reporte Diario PDF
                  </button>
                  <span className="bg-surface border border-outline-variant px-3 py-1.5 rounded-lg text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span> Periodo: Semanal
                  </span>
                </div>
              </div>

              {/* Bento Grid: Active Machines & KPIs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KPI Card */}
                <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">PRODUCCIÓN TOTAL (HOY)</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-extrabold text-primary font-mono tabular-nums">
                        {backendState.lotes.reduce((acc, l) => acc + (l.cantidad_pares_primera || 0) + (l.cantidad_pares_segunda || 0), 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-on-surface-variant">unidades</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-bold">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span>Producción en Tiempo Real</span>
                  </div>
                </div>

                {/* Remalladoras Activas Horizontal Cards */}
                <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Remalladoras Activas</h3>
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      {backendState.maquinas.filter(m => m.tipo === 'remalladora' && m.estado === 'Activa').length} En Línea
                    </span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 scroll-hide">
                    {backendState.maquinas.filter(m => m.tipo === 'remalladora').map((rem, idx) => {
                      const op = backendState.operarios.find(o => o.id === rem.encargado_id);
                      return (
                        <div key={rem.id} className="min-w-[170px] flex-1 bg-surface p-3.5 rounded-lg border border-outline-variant hover:border-primary transition-colors cursor-pointer group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="material-symbols-outlined text-primary text-lg">settings_input_component</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${rem.estado === 'Activa' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                          </div>
                          <h4 className="text-[10px] font-bold text-on-surface-variant">ID: {rem.id}</h4>
                          <p className="text-xs font-bold text-on-surface truncate">{op ? op.nombre : 'Sin asignar'}</p>
                          <div className="text-[9px] text-on-surface-variant uppercase font-semibold mt-1">Estado: <span className="text-primary font-bold">{rem.estado}</span></div>
                        </div>
                      );
                    })}
                    {backendState.maquinas.filter(m => m.tipo === 'remalladora').length === 0 && (
                      <div className="text-xs text-on-surface-variant p-4">No hay remalladoras configuradas.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Grid: Tables on Left, Forms on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side: Tables (col-span-2) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Table Jornal */}
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-outline-variant flex justify-between items-center">
                      <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Tabla: Jornal</h3>
                      <span className="bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded text-[9px] font-bold">PAGO FIJO</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-6 py-3">Operario</th>
                            <th className="px-6 py-3">Contrato</th>
                            <th className="px-6 py-3 text-right">Pago Diario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant font-sans">
                          {backendState.operarios.filter(o => o.tipo_contrato === 'jornal').map(o => (
                            <tr key={o.id} className="hover:bg-surface-container-high transition-colors">
                              <td className="px-6 py-3 font-semibold text-on-surface">{o.nombre}</td>
                              <td className="px-6 py-3"><span className="bg-primary-container text-primary text-[10px] px-2 py-0.5 rounded font-bold">Jornal Fijo</span></td>
                              <td className="px-6 py-3 text-right font-mono font-bold text-on-surface">S/ {o.tarifa.toFixed(2)}</td>
                            </tr>
                          ))}
                          {backendState.operarios.filter(o => o.tipo_contrato === 'jornal').length === 0 && (
                            <tr>
                              <td colSpan="3" className="text-center py-6 text-on-surface-variant font-medium">No hay operarios a jornal registrados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table Destajo */}
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-outline-variant flex justify-between items-center">
                      <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Tabla: Destajo</h3>
                      <div className="flex gap-1.5">
                        <span className="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded text-[9px] font-bold">PRODUCTIVIDAD</span>
                        <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded text-[9px] font-bold">SIN DESCUENTOS</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-6 py-3">Operario</th>
                            <th className="px-6 py-3 text-right">Cantidad (Docenas)</th>
                            <th className="px-6 py-3 text-right">Tarifa / Docena</th>
                            <th className="px-6 py-3 text-right">Total Liquidado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant font-sans">
                          {backendState.operarios.filter(o => o.tipo_contrato === 'destajo').map(o => {
                            const docenasProcesadas = o.docenas_remalladas || 0;
                            const totalLiquidado = o.total_liquidado || (docenasProcesadas * o.tarifa);
                            return (
                              <tr key={o.id} className="hover:bg-surface-container-high transition-colors">
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-[10px] text-primary">
                                      {o.nombre.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-on-surface">{o.nombre}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right font-mono font-bold text-on-surface">{docenasProcesadas} docenas</td>
                                <td className="px-6 py-3 text-right font-mono text-on-surface-variant">S/ {o.tarifa.toFixed(2)}</td>
                                <td className="px-6 py-3 text-right font-mono text-primary font-bold">S/ {totalLiquidado.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                          {backendState.operarios.filter(o => o.tipo_contrato === 'destajo').length === 0 && (
                            <tr>
                              <td colSpan="4" className="text-center py-6 text-on-surface-variant font-medium">No hay operarios a destajo registrados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 bg-surface-container-low flex justify-between items-baseline border-t border-outline-variant px-6">
                      <span className="text-[10px] font-bold text-on-surface-variant">TOTAL SEMANA ESTIMADO:</span>
                      <span className="text-sm font-bold text-primary font-mono">S/ 0.00</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Forms (col-span-1) */}
                <div className="space-y-6">
                  {/* Form Remallado */}
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-primary mb-3 uppercase tracking-wider">Registrar Costura</h4>
                    <form onSubmit={handleProcesarRemallado} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-secondary">Máquina Remalladora</label>
                        <select
                          value={remalladoForm.maquina_id}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const maq = backendState.maquinas.find(m => m.id === selectedId);
                            setRemalladoForm(prev => ({
                              ...prev,
                              maquina_id: selectedId,
                              operario_id: maq && maq.encargado_id ? maq.encargado_id : prev.operario_id
                            }));
                          }}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary"
                          required
                        >
                          <option value="">-- Seleccionar Remalladora --</option>
                          {backendState.maquinas.filter(m => m.tipo === 'remalladora').map(m => {
                            const opEnc = backendState.operarios.find(o => o.id === m.encargado_id);
                            return (
                              <option key={m.id} value={m.id}>
                                {m.id} {opEnc ? `(Encargado: ${opEnc.nombre})` : '(Sin Encargado)'}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary">Lote a Remallar</label>
                        <select
                          value={remalladoForm.lote_id}
                          onChange={(e) => setRemalladoForm({ ...remalladoForm, lote_id: parseInt(e.target.value) })}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                        >
                          <option value="">-- Seleccionar Lote --</option>
                          {backendState.lotes.filter(l => l.estado === 'Listo para Remallado' || l.estado === 'Tejiendo').map(l => (
                            <option key={l.id} value={l.id}>Lote #{l.id} ({l.cantidad_pares_estimada} pares - {l.material} {l.color})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary">Operario (Destajo)</label>
                        <select
                          value={remalladoForm.operario_id}
                          onChange={(e) => setRemalladoForm({ ...remalladoForm, operario_id: parseInt(e.target.value) })}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                        >
                          <option value="">-- Seleccionar Operario --</option>
                          {backendState.operarios.filter(o => o.tipo_contrato === 'destajo').map(o => (
                            <option key={o.id} value={o.id}>{o.nombre} (S/ {o.tarifa}/docena)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary">Cantidad Remallada (Docenas)</label>
                        <input
                          type="number"
                          value={remalladoForm.cantidad}
                          onChange={(e) => setRemalladoForm({ ...remalladoForm, cantidad: parseInt(e.target.value) || 0 })}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono"
                          min="1"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold hover:bg-primary-container transition text-xs"
                      >
                        Registrar Costura en Remalladora
                      </button>
                    </form>
                  </div>

                  {/* Form Nuevo Operario */}
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-primary mb-3 uppercase tracking-wider">Registrar Nuevo Operario</h4>
                    <form onSubmit={handleCrearOperario} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-secondary">Nombre del Operario</label>
                        <input
                          type="text"
                          value={nuevoOperarioForm.nombre}
                          onChange={(e) => setNuevoOperarioForm({ ...nuevoOperarioForm, nombre: e.target.value })}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                          placeholder="ej. Juan Carlos Pérez"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-secondary">Modalidad de Pago</label>
                          <select
                            value={nuevoOperarioForm.tipo_contrato}
                            onChange={(e) => {
                              const tipo = e.target.value;
                              setNuevoOperarioForm({
                                ...nuevoOperarioForm,
                                tipo_contrato: tipo,
                                tarifa: tipo === 'jornal' ? 50.00 : 0.40
                              });
                            }}
                            className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold"
                          >
                            <option value="jornal">Sueldo Fijo (Jornal / Diario)</option>
                            <option value="destajo">A Destajo (Por Docena)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary">
                            {nuevoOperarioForm.tipo_contrato === 'jornal' ? 'Sueldo Diario Fijo (S/)' : 'Tarifa por Docena (S/)'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={nuevoOperarioForm.tarifa}
                            onChange={(e) => setNuevoOperarioForm({ ...nuevoOperarioForm, tarifa: parseFloat(e.target.value) || 0 })}
                            className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold text-primary"
                            placeholder={nuevoOperarioForm.tipo_contrato === 'jornal' ? 'ej. 50.00' : 'ej. 0.40'}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-on-surface-variant bg-surface-container p-2 rounded border border-outline-variant/40">
                        {nuevoOperarioForm.tipo_contrato === 'jornal'
                          ? 'ℹ️ Sueldo Fijo: El operario percibe un monto fijo por jornada laboral (Tejedores u operarios de planta).'
                          : 'ℹ️ A Destajo: El operario cobra según la cantidad de docenas remalladas/procesadas.'}
                      </p>
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 text-on-primary py-2 rounded-lg font-bold hover:bg-emerald-700 transition text-xs"
                      >
                        Guardar Operario
                      </button>
                    </form>
                  </div>

                  {/* Form Nueva Máquina Remalladora */}
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-primary mb-3 uppercase tracking-wider">Registrar Nueva Remalladora</h4>
                    <form onSubmit={handleCrearRemalladora} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-secondary">Código / ID de Máquina</label>
                        <input
                          type="text"
                          value={nuevaRemalladoraForm.id}
                          onChange={(e) => setNuevaRemalladoraForm({ ...nuevaRemalladoraForm, id: e.target.value })}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                          placeholder="ej. REM-03"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary">Asignar Encargado / Operario</label>
                        <select
                          value={nuevaRemalladoraForm.encargado_id}
                          onChange={(e) => setNuevaRemalladoraForm({ ...nuevaRemalladoraForm, encargado_id: e.target.value })}
                          className="w-full mt-1 p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                        >
                          <option value="">-- Sin encargado inicial --</option>
                          {backendState.operarios.map(o => (
                            <option key={o.id} value={o.id}>{o.nombre} ({o.tipo_contrato === 'destajo' ? 'A Destajo' : 'Jornal'})</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold hover:bg-primary-container transition text-xs flex justify-center items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        Crear Remalladora
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Operational Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface border border-outline-variant p-4 rounded-xl flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-lg">analytics</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Eficiencia General</h4>
                    <p className="text-on-surface-variant text-xs mt-0.5">Promedio: 94.2%</p>
                  </div>
                </div>
                <div className="bg-surface border border-outline-variant p-4 rounded-xl flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                  <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-lg">warning</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Revisiones de Calidad</h4>
                    <p className="text-on-surface-variant text-xs mt-0.5">Sin descuentos por segundas</p>
                  </div>
                </div>
                <div className="bg-surface border border-outline-variant p-4 rounded-xl flex items-center gap-4 hover:bg-surface-container-low transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-lg">payments</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface font-sans">Presupuesto de Nómina</h4>
                    <p className="text-on-surface-variant text-xs mt-0.5">Liquidado al 100%</p>
                  </div>
                </div>
              </div>

              {/* SECCIÓN NUEVA: REPORTE DIARIO DE PERSONAL Y PRODUCCIÓN POR TIPO DE MEDIA */}
              <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-outline-variant">
                  <div>
                    <h3 className="font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined">assignment_ind</span>
                      Reporte de Personal y Nómina por Día (Lunes a Sábado)
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Visualice y simule la producción de costura (3 tipos de medias) y planchado (2 tipos de medias) por cada operario.
                    </p>
                  </div>
                  
                  {/* Fecha de semana selector */}
                  <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl border border-outline-variant text-xs">
                    <span className="font-bold text-secondary uppercase text-[10px]">Semana del:</span>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="bg-white border border-outline-variant rounded p-1 font-mono text-[11px] font-bold"
                    />
                    <span className="text-secondary text-[10px] uppercase font-bold">al</span>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="bg-white border border-outline-variant rounded p-1 font-mono text-[11px] font-bold"
                    />
                  </div>
                </div>

                {/* Grid principal: Tabla de reportes a la izquierda, Configuración de producción diaria a la derecha */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Tabla a la izquierda (col-span-8) */}
                  <div className="xl:col-span-8 overflow-x-auto border border-outline-variant rounded-xl shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-surface-container text-secondary font-bold uppercase text-[10px] border-b border-outline-variant">
                        <tr>
                          <th className="p-3">Operario / Rol</th>
                          <th className="p-2 text-center">Lun</th>
                          <th className="p-2 text-center">Mar</th>
                          <th className="p-2 text-center">Mié</th>
                          <th className="p-2 text-center">Jue</th>
                          <th className="p-2 text-center">Vie</th>
                          <th className="p-2 text-center">Sáb</th>
                          <th className="p-3 text-right">Producción Total</th>
                          <th className="p-3 text-right text-primary font-bold bg-primary/5">Total Pago</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant font-sans bg-white">
                        {reportePersonal.map((op) => {
                          // Calcular totales
                          let totalNinos = 0;
                          let totalDamas = 0;
                          let totalFutbol = 0;
                          let totalPlanchadoNormal = 0;
                          let totalPlanchadoFutbol = 0;

                          Object.values(op.registroDias).forEach(dia => {
                            totalNinos += dia.ninos || 0;
                            totalDamas += dia.damas || 0;
                            totalFutbol += dia.futbol || 0;
                            totalPlanchadoNormal += dia.planchadoNormal || 0;
                            totalPlanchadoFutbol += dia.planchadoFutbol || 0;
                          });

                          const totalProduccionDocenas = totalNinos + totalDamas + totalFutbol + totalPlanchadoNormal + totalPlanchadoFutbol;

                          // Pago total
                          const pagoCostura = (totalNinos * op.tarifas.ninos) + (totalDamas * op.tarifas.damas) + (totalFutbol * op.tarifas.futbol);
                          const pagoPlanchado = (totalPlanchadoNormal * op.tarifas.planchadoNormal) + (totalPlanchadoFutbol * op.tarifas.planchadoFutbol);
                          const pagoTotal = pagoCostura + pagoPlanchado;

                          return (
                            <tr
                              key={op.id}
                              onClick={() => setSelectedOperarioIdReporte(op.id)}
                              className={`cursor-pointer hover:bg-surface-container-low transition-colors ${
                                selectedOperarioIdReporte === op.id ? 'bg-primary/5 font-bold border-l-4 border-l-primary' : ''
                              }`}
                            >
                              <td className="p-3">
                                <div className="font-semibold text-on-surface">{op.nombre}</div>
                                <div className="text-[10px] text-on-surface-variant font-medium">{op.rol}</div>
                              </td>
                              
                              {/* Días Lunes a Sábado */}
                              {['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'].map(dia => {
                                const reg = op.registroDias[dia] || { ninos: 0, damas: 0, futbol: 0, planchadoNormal: 0, planchadoFutbol: 0 };
                                const totalDia = (reg.ninos || 0) + (reg.damas || 0) + (reg.futbol || 0) + (reg.planchadoNormal || 0) + (reg.planchadoFutbol || 0);
                                return (
                                  <td key={dia} className="p-2 text-center font-mono font-semibold text-on-surface-variant">
                                    {totalDia > 0 ? (
                                      <span className="bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant text-[10px] text-on-surface">
                                        {totalDia}
                                      </span>
                                    ) : (
                                      <span className="opacity-30">-</span>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Producción total */}
                              <td className="p-3 text-right font-mono text-secondary">
                                <div className="font-bold">{totalProduccionDocenas} doc.</div>
                                <div className="text-[9px] text-outline">
                                  {op.rol.includes('Costura') ? (
                                    <span>N:{totalNinos} | D:{totalDamas} | F:{totalFutbol}</span>
                                  ) : (
                                    <span>Nrm:{totalPlanchadoNormal} | Fut:{totalPlanchadoFutbol}</span>
                                  )}
                                </div>
                              </td>

                              {/* Total Pago */}
                              <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                                S/ {pagoTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Panel de Configuración a la derecha (col-span-4) */}
                  {(() => {
                    const opSeleccionado = reportePersonal.find(op => op.id === selectedOperarioIdReporte) || reportePersonal[0];
                    if (!opSeleccionado) return null;

                    return (
                      <div className="xl:col-span-4 bg-surface-container-low border border-outline-variant p-4 rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
                            <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                              Editar Producción: {opSeleccionado.nombre}
                            </h4>
                            <span className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                              {opSeleccionado.rol.includes('Costura') ? 'Costura' : 'Planchado'}
                            </span>
                          </div>

                          <p className="text-[10px] text-on-surface-variant mt-2 mb-4 leading-relaxed">
                            Configure las docenas de medias de este operario por día de la semana.
                          </p>

                          {/* Selector de Día */}
                          <div className="space-y-4 font-sans text-xs">
                            {['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'].map(dia => {
                              const reg = opSeleccionado.registroDias[dia] || { ninos: 0, damas: 0, futbol: 0, planchadoNormal: 0, planchadoFutbol: 0 };
                              
                              const handleUpdateField = (field, val) => {
                                const numericValue = Math.max(0, parseInt(val) || 0);
                                setReportePersonal(prev => prev.map(op => {
                                  if (op.id === opSeleccionado.id) {
                                    return {
                                      ...op,
                                      registroDias: {
                                        ...op.registroDias,
                                        [dia]: {
                                          ...op.registroDias[dia],
                                          [field]: numericValue
                                        }
                                      }
                                    };
                                  }
                                  return op;
                                }));
                              };

                              return (
                                <div key={dia} className="bg-white border border-outline-variant p-3 rounded-lg space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-secondary uppercase text-[10px] tracking-wider">{dia}</span>
                                    <span className="text-[10px] font-mono text-outline font-bold">
                                      Total: {(reg.ninos || 0) + (reg.damas || 0) + (reg.futbol || 0) + (reg.planchadoNormal || 0) + (reg.planchadoFutbol || 0)} doc
                                    </span>
                                  </div>

                                  {opSeleccionado.rol.includes('Costura') ? (
                                    /* Costura: 3 tipos de medias y sus tarifas */
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <label className="text-[9px] font-bold text-on-surface-variant block mb-1">Niños (S/ {opSeleccionado.tarifas.ninos.toFixed(2)})</label>
                                        <input
                                          type="number"
                                          value={reg.ninos}
                                          onChange={(e) => handleUpdateField('ninos', e.target.value)}
                                          className="w-full p-1.5 border border-outline-variant rounded bg-surface font-mono font-bold text-center text-xs"
                                          min="0"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-on-surface-variant block mb-1">Damas (S/ {opSeleccionado.tarifas.damas.toFixed(2)})</label>
                                        <input
                                          type="number"
                                          value={reg.damas}
                                          onChange={(e) => handleUpdateField('damas', e.target.value)}
                                          className="w-full p-1.5 border border-outline-variant rounded bg-surface font-mono font-bold text-center text-xs"
                                          min="0"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-on-surface-variant block mb-1">Fútbol (S/ {opSeleccionado.tarifas.futbol.toFixed(2)})</label>
                                        <input
                                          type="number"
                                          value={reg.futbol}
                                          onChange={(e) => handleUpdateField('futbol', e.target.value)}
                                          className="w-full p-1.5 border border-outline-variant rounded bg-surface font-mono font-bold text-center text-xs"
                                          min="0"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    /* Planchado: 2 tipos de medias (Normal y Fútbol) */
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[9px] font-bold text-on-surface-variant block mb-1">Media Normal (S/ {opSeleccionado.tarifas.planchadoNormal.toFixed(2)})</label>
                                        <input
                                          type="number"
                                          value={reg.planchadoNormal}
                                          onChange={(e) => handleUpdateField('planchadoNormal', e.target.value)}
                                          className="w-full p-1.5 border border-outline-variant rounded bg-surface font-mono font-bold text-center text-xs"
                                          min="0"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-on-surface-variant block mb-1">Media Fútbol (S/ {opSeleccionado.tarifas.planchadoFutbol.toFixed(2)})</label>
                                        <input
                                          type="number"
                                          value={reg.planchadoFutbol}
                                          onChange={(e) => handleUpdateField('planchadoFutbol', e.target.value)}
                                          className="w-full p-1.5 border border-outline-variant rounded bg-surface font-mono font-bold text-center text-xs"
                                          min="0"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tarifas Informativas */}
                        <div className="mt-4 p-3 bg-white border border-outline-variant rounded-lg space-y-2 text-[10px]">
                          <span className="font-bold text-secondary uppercase block tracking-wider">Tarifas por docena:</span>
                          {opSeleccionado.rol.includes('Costura') ? (
                            <div className="grid grid-cols-3 gap-1 text-center font-mono font-bold">
                              <div className="bg-surface-container-low p-1 rounded border border-outline-variant/50">Niños: S/ {opSeleccionado.tarifas.ninos.toFixed(2)}</div>
                              <div className="bg-surface-container-low p-1 rounded border border-outline-variant/50">Damas: S/ {opSeleccionado.tarifas.damas.toFixed(2)}</div>
                              <div className="bg-surface-container-low p-1 rounded border border-outline-variant/50">Fútbol: S/ {opSeleccionado.tarifas.futbol.toFixed(2)}</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1 text-center font-mono font-bold">
                              <div className="bg-surface-container-low p-1 rounded border border-outline-variant/50">Normal: S/ {opSeleccionado.tarifas.planchadoNormal.toFixed(2)}</div>
                              <div className="bg-surface-container-low p-1 rounded border border-outline-variant/50">Fútbol: S/ {opSeleccionado.tarifas.planchadoFutbol.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'acabado' && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-2xl text-on-surface">Planchado, Acabado y Preparado</h2>
                  <p className="text-sm text-on-surface-variant">Etapas finales de terminación manual de medias, control de calidad y empaquetado.</p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-surface border border-outline-variant rounded-xl p-3 flex flex-col items-end min-w-[120px]">
                    <span className="text-[10px] text-outline font-bold uppercase">Lotes en QA</span>
                    <span className="text-sm font-bold text-primary">
                      {backendState.lotes ? backendState.lotes.filter(l => l.estado === 'Planchado').length : 0} Pendientes
                    </span>
                  </div>
                  <div className="bg-surface border border-outline-variant rounded-xl p-3 flex flex-col items-end min-w-[120px]">
                    <span className="text-[10px] text-outline font-bold uppercase">Listos para Empaque</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {backendState.lotes ? backendState.lotes.filter(l => l.estado === 'Aprobado para Preparado').length : 0} Lotes
                    </span>
                  </div>
                </div>
              </div>

              {/* Layout: Bento Grid with the 3 main manual bottleneck stages */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column 1 (col-span-4): Planchado y Vaporizado */}
                <div className="lg:col-span-4 space-y-4">
                  <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col h-[550px]">
                    <div className="px-5 py-3 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm font-bold">iron</span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface">4. Planchado (Hormado)</h4>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Manual</span>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto space-y-3">
                      {backendState.lotes && backendState.lotes.filter(l => l.estado === 'Listo para Planchado').map((lot, index) => (
                        <div key={index} className="border border-outline-variant rounded-xl p-3 bg-white hover:shadow-sm transition-all space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8px] font-bold text-outline uppercase">Lote Volteado</span>
                              <p className="font-bold text-xs text-primary">#LOT-{lot.id}</p>
                            </div>
                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-200 uppercase">Listo</span>
                          </div>
                          
                          <div className="text-[11px] text-on-surface-variant space-y-0.5 font-sans">
                            <p><span className="font-bold">Producto:</span> Calcetín {lot.material}</p>
                            <p><span className="font-bold">Color:</span> {lot.color}</p>
                            <p><span className="font-bold">Cantidad:</span> {lot.cantidad_pares_estimada} pares</p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handlePlancharLote(lot.id)}
                            className="w-full bg-primary text-white py-1.5 rounded-lg font-bold text-[10px] hover:bg-primary-container transition active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">check</span>
                            Registrar Planchado
                          </button>
                        </div>
                      ))}
                      {(backendState.lotes ? backendState.lotes.filter(l => l.estado === 'Listo para Planchado').length : 0) === 0 && (
                        <p className="text-xs text-on-surface-variant text-center py-8 italic font-sans">No hay lotes volteados en cola de planchado.</p>
                      )}
                    </div>
                  </section>
                </div>

                {/* Column 2 (col-span-4): Acabado (Inspección y QA) */}
                <div className="lg:col-span-4 space-y-4">
                  <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col h-[550px]">
                    <div className="px-5 py-3 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm font-bold">verified</span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface">5. Acabado (Inspección)</h4>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Manual (QA)</span>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto space-y-3">
                      {backendState.lotes && backendState.lotes.filter(l => l.estado === 'Remallado').map((lot, index) => (
                        <div key={index} className="border border-outline-variant rounded-xl p-3 bg-white hover:shadow-sm transition-all space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8px] font-bold text-outline uppercase">Lote Remallado (Cosido)</span>
                              <p className="font-bold text-xs text-primary">#LOT-{lot.id}</p>
                            </div>
                            <span className="bg-teal-50 text-teal-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-teal-200 uppercase">QA Pendiente</span>
                          </div>
                          
                          <div className="text-[11px] text-on-surface-variant space-y-0.5 font-sans">
                            <p><span className="font-bold">Producto:</span> Calcetín {lot.material}</p>
                            <p><span className="font-bold">Color:</span> {lot.color}</p>
                            <p><span className="font-bold">Cantidad:</span> {lot.cantidad_pares_estimada} pares</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAprobarAcabado(lot.id)}
                              className="bg-emerald-600 text-white py-1.5 rounded font-bold text-[9px] hover:bg-emerald-700 transition active:scale-95 flex items-center justify-center gap-0.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-xs">done_all</span>
                              Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReprocesarLote(lot.id)}
                              className="bg-amber-600 text-white py-1.5 rounded font-bold text-[9px] hover:bg-amber-700 transition active:scale-95 flex items-center justify-center gap-0.5 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-xs">build</span>
                              Reprocesar
                            </button>
                          </div>
                        </div>
                      ))}
                      {(backendState.lotes ? backendState.lotes.filter(l => l.estado === 'Remallado').length : 0) === 0 && (
                        <p className="text-xs text-on-surface-variant text-center py-8 italic font-sans">No hay lotes cosidos pendientes de inspección.</p>
                      )}
                    </div>
                  </section>
                </div>

                {/* Column 3 (col-span-4): Preparado (Empaque Wizard) */}
                <div className="lg:col-span-4 space-y-4">
                  <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col h-[550px]">
                    <div className="px-5 py-3 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm font-bold">package_2</span>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface">6. Preparado (Empaque)</h4>
                      </div>
                      <span className="bg-zinc-100 text-zinc-800 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Final</span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
                      {/* Stepper Tabs Header */}
                      <div className="mb-4 border-b border-outline-variant/60 pb-3 flex justify-between items-center gap-1 text-center font-sans">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className={`flex-1 py-1 rounded-lg transition-all ${
                            wizardStep === 1 
                              ? 'bg-primary/10 text-primary border border-primary/20 font-bold' 
                              : 'text-on-surface-variant hover:bg-surface-container-low border border-transparent font-medium'
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-wider leading-tight">1. Lote y SKU</p>
                        </button>

                        <span className="text-secondary text-[8px] opacity-40">➔</span>

                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedLotToPack || !empaqueForm.sku) {
                              addNotification("Seleccione un Lote y SKU en el Paso 1", "warning");
                              setWizardStep(1);
                            } else {
                              setWizardStep(2);
                            }
                          }}
                          className={`flex-1 py-1 rounded-lg transition-all ${
                            wizardStep === 2 
                              ? 'bg-primary/10 text-primary border border-primary/20 font-bold' 
                              : 'text-on-surface-variant hover:bg-surface-container-low border border-transparent font-medium'
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-wider leading-tight">2. Emparejado</p>
                        </button>

                        <span className="text-secondary text-[8px] opacity-40">➔</span>

                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedLotToPack || !empaqueForm.sku) {
                              addNotification("Seleccione un Lote y SKU en el Paso 1", "warning");
                              setWizardStep(1);
                            } else {
                              setWizardStep(3);
                            }
                          }}
                          className={`flex-1 py-1 rounded-lg transition-all ${
                            wizardStep === 3 
                              ? 'bg-primary/10 text-primary border border-primary/20 font-bold' 
                              : 'text-on-surface-variant hover:bg-surface-container-low border border-transparent font-medium'
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-wider leading-tight">3. Bolsa Máster</p>
                        </button>
                      </div>

                      {/* Step Contents */}
                      <div className="flex-1 text-xs">
                        {wizardStep === 1 && (
                          <div className="space-y-3">
                            <h5 className="font-bold text-xs text-on-surface uppercase tracking-wide">Paso 1: Lote y Codificación</h5>
                            <p className="text-[11px] text-on-surface-variant">Seleccione un lote aprobado por control de calidad y el SKU del catálogo de destino.</p>
                            
                            <div className="space-y-3.5 pt-2">
                              <div>
                                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Seleccionar Lote Aprobado</label>
                                <select
                                  value={selectedLotToPack ? selectedLotToPack.id : ''}
                                  onChange={(e) => {
                                    const id = parseInt(e.target.value);
                                    const lot = backendState.lotes.find(l => l.id === id);
                                    setSelectedLotToPack(lot || null);
                                    if (lot) {
                                      // pre-select SKU based on material matching if possible
                                      const matchedModel = backendState.planilla.find(m => m.nombre_original && m.nombre_original.toLowerCase().includes(lot.material.toLowerCase()));
                                      setEmpaqueForm(prev => ({ ...prev, sku: matchedModel ? matchedModel.codigo : '' }));
                                    }
                                  }}
                                  className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary outline-none"
                                >
                                  <option value="">-- Seleccionar Lote --</option>
                                  {backendState.lotes && backendState.lotes.filter(l => l.estado === 'Aprobado para Preparado').map(l => (
                                    <option key={l.id} value={l.id}>
                                      #LOT-{l.id} - {l.material} {l.color} ({l.cantidad_pares_estimada} pares)
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Asignar Código SKU (Catálogo)</label>
                                <select
                                  value={empaqueForm.sku}
                                  onChange={(e) => setEmpaqueForm({ ...empaqueForm, sku: e.target.value })}
                                  className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary outline-none"
                                >
                                  <option value="">-- Seleccionar SKU Destino --</option>
                                  {backendState.planilla && backendState.planilla.map(m => (
                                    <option key={m.codigo} value={m.codigo}>
                                      {m.codigo} - {m.nombre_original} (S/ {m.precio_por_paquete ? m.precio_por_paquete.toFixed(2) : '0.00'}/paq)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {wizardStep === 2 && (
                          <div className="space-y-3">
                            <h5 className="font-bold text-xs text-on-surface uppercase tracking-wide">Paso 2: Emparejado e individual</h5>
                            <p className="text-[11px] text-on-surface-variant">Confirmar etiquetado individual y agrupación por docenas (12 pares).</p>
                            
                            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-3 text-center my-2">
                              <span className="material-symbols-outlined text-3xl text-primary font-light">sell</span>
                              <p className="font-bold text-xs mt-1">{selectedLotToPack ? `Lote #LOT-${selectedLotToPack.id}` : 'Ningún lote'}</p>
                              <p className="text-[10px] text-outline">Pares estimados: {selectedLotToPack ? selectedLotToPack.cantidad_pares_estimada : 0} pares</p>
                            </div>

                            <div className="space-y-2 text-[11px]">
                              <label className="flex items-center gap-2 p-2 bg-primary/5 rounded border border-primary/20 cursor-pointer">
                                <input type="checkbox" defaultChecked className="accent-primary" />
                                <span className="font-bold text-on-surface">Pares emparejados y etiquetados individualmente</span>
                              </label>
                              
                              <div>
                                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Paquetes de 12 pares (Docenas)</label>
                                <input
                                  type="number"
                                  value={empaqueForm.cantidad_paquetes}
                                  onChange={(e) => setEmpaqueForm({ ...empaqueForm, cantidad_paquetes: parseInt(e.target.value) || 1 })}
                                  className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold font-mono text-center"
                                  min="1"
                                />
                                <span className="text-[9px] text-on-surface-variant block mt-1">
                                  Equivale a {empaqueForm.cantidad_paquetes * 12} pares totales a empaquetar.
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {wizardStep === 3 && (
                          <div className="space-y-3">
                            <h5 className="font-bold text-xs text-on-surface uppercase tracking-wide">Paso 3: Bolsa Máster y Almacén</h5>
                            <p className="text-[11px] text-on-surface-variant">Configure la bolsa contenedora máster y finalize el empaque.</p>
                            
                            <div className="space-y-3 pt-2">
                              <div>
                                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Capacidad Bolsa Máster</label>
                                <select
                                  value={empaqueForm.tipo_bolsa}
                                  onChange={(e) => setEmpaqueForm({ ...empaqueForm, tipo_bolsa: e.target.value })}
                                  className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary"
                                >
                                  <option value="Chica">Chica (20 Docenas / 240 pares)</option>
                                  <option value="Mediana">Mediana (50 Docenas / 600 pares)</option>
                                  <option value="Grande">Grande (100 Docenas / 1200 pares)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Destino Pre-definido</label>
                                <input 
                                  type="text" 
                                  readOnly 
                                  defaultValue="Cola de Entrada Almacén / Distribución"
                                  className="w-full p-2 border border-outline-variant bg-surface-container-high rounded-lg text-xs text-on-surface-variant font-bold"
                                />
                              </div>

                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[10px] text-emerald-800 font-sans space-y-0.5">
                                <p className="font-bold">Resumen de Bulto Máster:</p>
                                <p>• Código SKU: {empaqueForm.sku || 'No seleccionado'}</p>
                                <p>• Cantidad: {empaqueForm.cantidad_paquetes} docenas ({empaqueForm.cantidad_paquetes * 12} pares)</p>
                                <p>• Tipo: Bolsa {empaqueForm.tipo_bolsa}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Navigation Stepper Controls */}
                      <div className="pt-3 border-t border-outline-variant flex justify-between items-center gap-2">
                        <button
                          type="button"
                          disabled={wizardStep === 1}
                          onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 border border-outline rounded-lg font-bold hover:bg-surface-container-high transition text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (wizardStep === 1) {
                              if (!selectedLotToPack) { addNotification("Por favor, seleccione un lote a empacar", "warning"); return; }
                              if (!empaqueForm.sku) { addNotification("Por favor, asigne un SKU para continuar", "warning"); return; }
                              // set default paquetes count based on selected lot size
                              setEmpaqueForm(prev => ({ ...prev, cantidad_paquetes: Math.ceil(selectedLotToPack.cantidad_pares_estimada / 12) }));
                              setWizardStep(2);
                            } else if (wizardStep === 2) {
                              setWizardStep(3);
                            } else {
                              // step 3: finalize empaque
                              handleEmpacarLote(selectedLotToPack, empaqueForm.sku, empaqueForm.tipo_bolsa, empaqueForm.cantidad_paquetes);
                              setSelectedLotToPack(null);
                              setEmpaqueForm({ sku: '', tipo_bolsa: 'Mediana', cantidad_paquetes: 10 });
                              setWizardStep(1);
                            }
                          }}
                          className="px-4 py-1.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-container transition text-[10px] flex items-center gap-1 shadow-sm"
                        >
                          {wizardStep === 3 ? 'Finalizar Empaque' : 'Siguiente'}
                        </button>
                      </div>
                    </div>
                  </section>
                </div>

              </div>
              
              {/* Historical Flow of Production Batches Table */}
              <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">timeline</span>
                    Flujo de Lotes e Historial de Producción
                  </h4>
                  <span className="text-[10px] font-bold text-outline uppercase font-sans">
                    Total: {backendState.lotes ? backendState.lotes.length : 0} lotes procesados
                  </span>
                </div>
                <div className="border border-outline-variant rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-[10px] text-secondary uppercase font-bold">
                      <tr>
                        <th className="p-3">ID Lote</th>
                        <th className="p-3">Producto / Material</th>
                        <th className="p-3">Color</th>
                        <th className="p-3 text-right">Cant. Estimada</th>
                        <th className="p-3">Estado Actual</th>
                        <th className="p-3 text-right">Progreso Flujo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-sans bg-white">
                      {backendState.lotes && backendState.lotes.map(l => {
                        const stepNum = 
                          l.estado === 'Tejiendo' ? 1 :
                          l.estado === 'Listo para Volteado' ? 2 :
                          l.estado === 'Listo para Planchado' ? 3 :
                          l.estado === 'Listo para Remallado' ? 4 :
                          l.estado === 'Remallado' ? 5 :
                          l.estado === 'Aprobado para Preparado' ? 6 :
                          l.estado === 'Empacado' ? 7 : 7;
                        const pct = Math.round((stepNum / 7) * 100);
                        return (
                          <tr key={l.id} className="hover:bg-surface-container-low transition-colors">
                            <td className="p-3 font-mono font-bold text-primary">#LOT-{l.id}</td>
                            <td className="p-3 font-semibold text-on-surface">Calcetín {l.material}</td>
                            <td className="p-3">{l.color}</td>
                            <td className="p-3 text-right font-mono font-bold">{l.cantidad_pares_estimada} prs</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                l.estado === 'Tejiendo' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                l.estado === 'Listo para Volteado' ? 'bg-blue-50 text-blue-800 border-blue-200 font-bold' :
                                l.estado === 'Listo para Planchado' ? 'bg-yellow-50 text-yellow-800 border-yellow-200 font-bold' :
                                l.estado === 'Listo para Remallado' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold' :
                                l.estado === 'Remallado' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' :
                                l.estado === 'Aprobado para Preparado' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {l.estado === 'Tejiendo' ? '1. Tejido' : 
                                 l.estado === 'Listo para Volteado' ? '2. Espera Volteado' :
                                 l.estado === 'Listo para Planchado' ? '3. Espera Planchado' :
                                 l.estado === 'Listo para Remallado' ? '4. Espera Costura' :
                                 l.estado === 'Remallado' ? '5. Costura Terminada' :
                                 l.estado === 'Aprobado para Preparado' ? '6. QA Aprobado' :
                                 '7. Empacado (Listo)'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 justify-end">
                                <div className="w-20 bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${pct}%` }}></div>
                                </div>
                                <span className="text-[10px] font-bold text-primary">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {(!backendState.lotes || backendState.lotes.length === 0) && (
                        <tr>
                          <td colSpan="6" className="text-center py-6 text-on-surface-variant font-medium">No hay lotes en el sistema actualmente.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <hr className="border-outline-variant my-6" />

              {/* CODIFICACIÓN Y CATÁLOGO SKU (Integrado en Acabado y Preparación) */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-primary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined">barcode_scanner</span>
                    Codificación y Catálogo de Productos (SKU)
                  </h3>
                  <p className="text-xs text-on-surface-variant">Genere nuevos códigos SKU y estime consumos de material e hilado antes de empacar.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* SKU Generator Card (col-span-5) */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="p-5 border-b border-outline-variant bg-surface-container-lowest">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-base">add_box</span>
                        Generador de SKU Dinámico
                      </h4>
                    </div>
                    <div className="p-5 space-y-4 flex-1">
                      {/* Dropdowns */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-bold text-secondary uppercase block mb-1 text-[10px]">Categoría</label>
                          <select
                            value={skuForm.categoria}
                            onChange={(e) => setSkuForm({ ...skuForm, categoria: e.target.value })}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2 font-semibold focus:ring-2 focus:ring-primary-container outline-none"
                          >
                            <option value="Niños">Niños (NIN)</option>
                            <option value="Bebés">Bebés (BEB)</option>
                            <option value="Damas">Damas (DAM)</option>
                            <option value="Adultos">Adultos (ADU)</option>
                            <option value="Fútbol">Fútbol (FUT)</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-secondary uppercase block mb-1 text-[10px]">Talla</label>
                          <select
                            value={skuForm.talla}
                            onChange={(e) => setSkuForm({ ...skuForm, talla: e.target.value })}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2 font-semibold focus:ring-2 focus:ring-primary-container outline-none"
                          >
                            <option value="Talla Única">Talla Única (UNI)</option>
                            <option value="4">Talla 4 (04)</option>
                            <option value="5">Talla 5 (05)</option>
                            <option value="6">Talla 6 (06)</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-secondary uppercase block mb-1 text-[10px]">Diseño</label>
                          <select
                            value={skuForm.diseno}
                            onChange={(e) => setSkuForm({ ...skuForm, diseno: e.target.value })}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2 font-semibold focus:ring-2 focus:ring-primary-container outline-none"
                          >
                            <option value="Color entero">Color entero (ENT)</option>
                            <option value="Con diseño">Con diseño (DIS)</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-secondary uppercase block mb-1 text-[10px]">Calidad</label>
                          <select
                            value={skuForm.calidad}
                            onChange={(e) => setSkuForm({ ...skuForm, calidad: e.target.value })}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2 font-semibold focus:ring-2 focus:ring-primary-container outline-none"
                          >
                            <option value="Delgada">Delgada (DEL)</option>
                            <option value="Afelpada">Afelpada (AFE)</option>
                          </select>
                        </div>
                      </div>

                      {/* Real-time Preview */}
                      <div className="sku-card-gradient rounded-xl p-4 text-center shadow-sm text-white flex flex-col justify-center items-center">
                        <p className="text-[9px] text-white/80 font-bold uppercase tracking-widest mb-1">Previsualización de SKU</p>
                        <div className="font-bold text-white text-xl tracking-wider font-mono bg-white/10 px-3 py-1.5 rounded-lg">{generatedSku}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setBackendState(prev => ({
                            ...prev,
                            modelos: [...prev.modelos, { sku: generatedSku, peso: 280, costo_hilo: 0.035, material_cost: 9.80, mo_cost: 4.80 }]
                          }));
                          addNotification(`SKU ${generatedSku} registrado en el catálogo del sistema`, "success");
                        }}
                        className="w-full bg-primary text-on-primary py-2 rounded-xl font-bold hover:bg-primary-container transition text-xs shadow-md mt-2 flex justify-center items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">barcode_reader</span>
                        Añadir SKU al Catálogo
                      </button>
                    </div>
                  </div>

                  {/* Table Section (col-span-7) */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface">Modelos en Catálogo</h4>
                    </div>
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-outline-variant font-bold text-secondary uppercase text-[10px]">
                            <th className="p-3">SKU</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3 text-center">Calidad</th>
                            <th className="p-3 text-right">Peso/Doc (g)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-primary">NIN-ENT-DEL-04</td>
                            <td className="p-3">
                              <span className="font-bold text-on-surface">Media Niño Entera</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
                                Delgada
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-secondary">280 g</td>
                          </tr>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-primary">DAM-UNI-BAS-01</td>
                            <td className="p-3">
                              <span className="font-bold text-on-surface">Media Dama Única</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Delgada
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-secondary">240 g</td>
                          </tr>
                          {backendState.modelos && backendState.modelos.filter(m => !['NIN-ENT-DEL-04', 'DAM-UNI-BAS-01'].includes(m.sku)).map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-mono font-bold text-primary">{m.sku}</td>
                              <td className="p-3">
                                <span className="font-bold text-on-surface">Nuevo Modelo Registrado</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-100">
                                  Estándar
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-secondary">{m.peso} g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Maestro de Costos y Calculadora */}
                <div className="bg-surface border border-outline-variant p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    {/* Tabla de Modelos y Costos */}
                    <div className="flex-1 border border-outline-variant rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-surface-container text-secondary font-bold">
                          <tr className="border-b border-outline-variant uppercase text-[10px]">
                            <th className="px-4 py-3">Código SKU</th>
                            <th className="px-4 py-3 text-center">Peso / Docena</th>
                            <th className="px-4 py-3 text-right">Costo Material / Doc</th>
                            <th className="px-4 py-3 text-right font-bold text-primary bg-primary/5">Costo Total / Docena</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {backendState.modelos && backendState.modelos.map((m, idx) => (
                            <tr key={idx} className="border-b border-outline-variant hover:bg-surface/50">
                              <td className="px-4 py-2 font-bold text-primary font-mono">{m.sku}</td>
                              <td className="px-4 py-2 text-center font-bold text-secondary">{m.peso} g</td>
                              <td className="px-4 py-2 text-right">S/ {m.material_cost.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-bold text-emerald-700 bg-emerald-50/30">S/ {(m.material_cost + m.mo_cost).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Calculadora de Consumo de Hilo */}
                    <div className="lg:w-1/3 bg-surface-container-low border border-outline-variant p-4 rounded-xl space-y-3">
                      <h5 className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm">calculate</span>
                        Calculadora de Hilado
                      </h5>
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-secondary uppercase text-[9px] font-bold block mb-1">Modelo</label>
                          <select
                            value={selectedModeloEstimador}
                            onChange={(e) => setSelectedModeloEstimador(e.target.value)}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg font-mono font-bold text-xs"
                          >
                            {backendState.modelos && backendState.modelos.map(m => (
                              <option key={m.sku} value={m.sku}>{m.sku}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-secondary uppercase text-[9px] font-bold block mb-1">Docenas a Producir</label>
                          <input
                            type="number"
                            value={cantidadDocenasEstimador}
                            onChange={(e) => setCantidadDocenasEstimador(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg font-mono font-bold text-xs text-center"
                            min="1"
                          />
                        </div>

                        {(() => {
                          const mSelected = backendState.modelos && backendState.modelos.find(m => m.sku === selectedModeloEstimador) || (backendState.modelos && backendState.modelos[0]);
                          if (!mSelected) return null;
                          const pesoTotalKg = (mSelected.peso * cantidadDocenasEstimador) / 1000;
                          const costoMaterial = mSelected.material_cost * cantidadDocenasEstimador;
                          const costoMO = mSelected.mo_cost * cantidadDocenasEstimador;
                          return (
                            <div className="p-3 bg-white rounded-lg space-y-1.5 border border-outline-variant font-mono text-[11px] font-bold">
                              <div className="flex justify-between">
                                <span className="text-secondary font-sans">Peso hilo:</span>
                                <span className="text-primary">{pesoTotalKg.toFixed(2)} Kg</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-secondary font-sans">Costo total:</span>
                                <span className="text-emerald-700">S/ {(costoMaterial + costoMO).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. SALONES E INVENTARIO */}
          {activeTab === 'salones' && (
            <div className="space-y-6">
              {/* Modal Crear Nuevo Salón */}
              {showNuevoSalonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowNuevoSalonModal(false)}
                      className="absolute top-4 right-4 text-secondary hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    <h3 className="font-bold text-lg text-primary mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined">add_home</span> Crear Nuevo Salón
                    </h3>
                    <form
                      onSubmit={(e) => {
                        handleCrearSalon(e);
                        setShowNuevoSalonModal(false);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-xs font-bold text-secondary uppercase block mb-1">Nombre del Salón</label>
                        <input
                          type="text"
                          required
                          value={salonForm.nombre}
                          onChange={(e) => setSalonForm({ ...salonForm, nombre: e.target.value })}
                          className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                          placeholder="ej. Salón D"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-secondary uppercase block mb-1">Capacidad Máxima (Bultos)</label>
                        <input
                          type="number"
                          required
                          value={salonForm.capacidad}
                          onChange={(e) => setSalonForm({ ...salonForm, capacidad: e.target.value })}
                          className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                          min="1"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold hover:bg-primary-container transition text-xs shadow-sm"
                      >
                        Habilitar Nuevo Salón
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-2xl text-on-surface">Almacenamiento y Salones</h2>
                  <p className="text-sm text-on-surface-variant">Monitoreo en tiempo real de capacidad y flujo de inventario.</p>
                </div>
                <button
                  onClick={() => setShowNuevoSalonModal(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary-container transition-all active:scale-95 text-xs self-start sm:self-center"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Crear Nuevo Salón
                </button>
              </div>

              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Floor Map Section (lg:col-span-8) */}
                <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">map</span>
                      <h3 className="font-bold text-sm uppercase tracking-wider text-on-surface">Mapa de Planta</h3>
                    </div>
                    <div className="flex gap-2 text-[9px] font-bold">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 uppercase">Óptimo</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 uppercase">Alerta</span>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 uppercase">Crítico</span>
                    </div>
                  </div>

                  {/* Factory Grid Visualizer */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-h-[220px]">
                    {backendState.salones.map((salon) => {
                      const perc = Math.min(100, Math.round((salon.bultos_actuales / salon.capacidad_maxima_bultos) * 100));
                      const isFull = perc >= 100;
                      return (
                        <div
                          key={salon.id}
                          className={`relative group h-full rounded-xl p-4 flex flex-col justify-between transition-all border-2 ${
                            isFull
                              ? 'bg-rose-50 border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse-slow'
                              : 'bg-white border-outline-variant hover:border-primary hover:shadow-md'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className={`font-bold text-sm ${isFull ? 'text-rose-800' : 'text-on-surface'}`}>{salon.id}</h4>
                              {isFull ? (
                                <span className="material-symbols-outlined text-rose-600 text-lg fill-current">error</span>
                              ) : (
                                <span className="text-[10px] font-mono text-outline font-semibold">SLN-0{salon.id.slice(-1) || '0'}</span>
                              )}
                            </div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-4 ${isFull ? 'text-rose-700' : 'text-on-surface-variant'}`}>
                              {salon.id === 'Salon A' ? 'Producto Terminado' : salon.id === 'Salon B' ? 'Materia Prima' : 'Empaque y Despacho'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>Ocupación</span>
                              <span>{perc}%</span>
                            </div>
                            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-rose-600' : perc > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                                style={{ width: `${perc}%` }}
                              ></div>
                            </div>
                            <p className="text-[9px] text-outline text-right font-bold font-mono">{salon.bultos_actuales} / {salon.capacidad_maxima_bultos} Bultos</p>
                            
                            {isFull && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!connectionError) {
                                    try {
                                      const res = await fetch(`${API_BASE}/inventario/trasladar`, {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ origen_id: salon.id, destino_id: 'Almacen General', cantidad_bultos: salon.bultos_actuales })
                                      });
                                      const data = await res.json();
                                      addNotification(data.message || data.error, data.error ? 'error' : 'success');
                                      fetchData();
                                    } catch { addNotification('Error de red', 'error'); }
                                  } else {
                                    setBackendState(prev => {
                                      const fromSalon = prev.salones.find(s => s.id === salon.id);
                                      const toSalon = prev.salones.find(s => s.id === 'Almacen General');
                                      const count = fromSalon.bultos_actuales;
                                      if (count > 0 && toSalon) {
                                        fromSalon.bultos_actuales = 0;
                                        toSalon.bultos_actuales += count;
                                        const updatedBultos = prev.bultos.map(b => b.salon_id === salon.id ? { ...b, salon_id: 'Almacen General' } : b);
                                        addNotification(`Redireccion: ${count} bultos de ${salon.id} a Almacen General.`, "success");
                                        return { ...prev, bultos: updatedBultos };
                                      }
                                      return prev;
                                    });
                                  }
                                }}
                                className="w-full mt-2 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 transition shadow-sm active:scale-95"
                              >
                                Redirigir a Almacén Gral.
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sidebar (lg:col-span-4) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Traslado Rápido Card */}
                  <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">swap_horiz</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Traslado Rápido</h3>
                        <p className="text-[10px] text-on-surface-variant font-bold">Movimiento interno de stock</p>
                      </div>
                    </div>
                    <form onSubmit={handleTrasladar} className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase">Origen</label>
                        <select
                          value={trasladoForm.origen}
                          onChange={(e) => setTrasladoForm({ ...trasladoForm, origen: e.target.value })}
                          className="w-full rounded-lg border-outline-variant bg-surface-container-lowest focus:ring-primary focus:border-primary py-2 text-xs"
                        >
                          {backendState.salones.map(s => (
                            <option key={s.id} value={s.id}>{s.id} ({s.bultos_actuales} Bultos)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase">Destino</label>
                        <select
                          value={trasladoForm.destino}
                          onChange={(e) => setTrasladoForm({ ...trasladoForm, destino: e.target.value })}
                          className="w-full rounded-lg border-outline-variant bg-surface-container-lowest focus:ring-primary focus:border-primary py-2 text-xs"
                        >
                          {backendState.salones.map(s => (
                            <option key={s.id} value={s.id}>{s.id}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase">Bultos</label>
                          <input
                            type="number"
                            min="1"
                            value={trasladoForm.bultos}
                            onChange={(e) => setTrasladoForm({ ...trasladoForm, bultos: parseInt(e.target.value) || 1 })}
                            className="w-full rounded-lg border-outline-variant bg-surface-container-lowest py-2 text-xs font-mono font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase">Prioridad</label>
                          <select className="w-full rounded-lg border-outline-variant bg-surface-container-lowest py-2 text-xs">
                            <option>Normal</option>
                            <option className="text-rose-600 font-bold">Urgente</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-primary text-on-primary rounded-lg font-bold shadow-md hover:bg-primary-container transition active:scale-95 text-xs flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                        Ejecutar Traslado
                      </button>
                    </form>
                  </div>

                  {/* Statistics Summary Card */}
                  <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-outline mb-2 uppercase tracking-wider">Resumen Global</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-on-surface-variant">Capacidad Total</span>
                        <span className="font-mono text-on-surface">{backendState.salones.reduce((acc, s) => acc + s.capacidad_maxima_bultos, 0)} Bultos</span>
                      </div>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-on-surface-variant">Uso Promedio</span>
                        <span className="font-mono text-on-surface">
                          {Math.round((backendState.salones.reduce((acc, s) => acc + s.bultos_actuales, 0) / backendState.salones.reduce((acc, s) => acc + s.capacidad_maxima_bultos, 0)) * 100)}%
                        </span>
                      </div>
                      {backendState.salones.some(s => s.bultos_actuales >= s.capacidad_maxima_bultos) && (
                        <div className="pt-2 border-t border-outline-variant">
                          <div className="flex items-center gap-1.5 text-rose-600 font-bold mb-1">
                            <span className="material-symbols-outlined text-base">warning</span>
                            <span className="text-[10px] uppercase">Alerta Activa</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-relaxed">
                            Uno o más salones han alcanzado el límite operativo. Use la redirección automática o el traslado rápido para normalizar el flujo.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Master Bags Registradas */}
              <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Bultos Máster (Bolsas Distribución) Registrados</h4>
                <div className="border border-outline-variant rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-surface-container text-secondary font-bold border-b border-outline-variant">
                      <tr>
                        <th className="px-4 py-2.5">ID Bulto</th>
                        <th className="px-4 py-2.5">SKU / Modelo</th>
                        <th className="px-4 py-2.5">Tipo Bolsa</th>
                        <th className="px-4 py-2.5 text-center">Pares de Medias</th>
                        <th className="px-4 py-2.5">Ubicación</th>
                        <th className="px-4 py-2.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-mono">
                      {backendState.bultos.map(b => (
                        <tr key={b.id} className="hover:bg-surface-container-lowest/50 font-sans">
                          <td className="px-4 py-2.5 font-mono font-bold text-primary">#B-{b.id}</td>
                          <td className="px-4 py-2.5 font-bold font-mono text-secondary text-[11px]">{b.sku}</td>
                          <td className="px-4 py-2.5 text-[11px]">{b.tipo_bolsa} ({b.cantidad_paquetes} docenas)</td>
                          <td className="px-4 py-2.5 text-center font-bold font-mono text-secondary">{b.total_pares} prs</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${b.salon_id ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-800'}`}>
                              {b.salon_id || 'Sin Almacenar'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {!b.salon_id && (
                              <button
                                onClick={async () => {
                                  if (!connectionError) {
                                    try {
                                      const res = await fetch(`${API_BASE}/inventario/almacenar`, {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ bulto_id: b.id, salon_id: 'Salon A' })
                                      });
                                      const data = await res.json();
                                      if (data.warning) addNotification(data.warning, 'warning');
                                      else addNotification(data.message, 'success');
                                      fetchData();
                                    } catch { addNotification('Error de red al almacenar', 'error'); }
                                  } else {
                                    setBackendState(prev => {
                                      const bult = prev.bultos.find(bu => bu.id === b.id);
                                      const dest = prev.salones.find(s => s.id === 'Salon A');
                                      const almGen = prev.salones.find(s => s.id === 'Almacen General');
                                      if (dest.bultos_actuales >= dest.capacidad_maxima_bultos) {
                                        bult.salon_id = 'Almacen General';
                                        bult.estado = 'Almacenado';
                                        if (almGen) almGen.bultos_actuales += 1;
                                        addNotification("Advertencia: Salon A lleno! Bulto redirigido a Almacen General.", "warning");
                                      } else {
                                        bult.salon_id = 'Salon A';
                                        bult.estado = 'Almacenado';
                                        dest.bultos_actuales += 1;
                                        addNotification(`Bulto #${b.id} almacenado en Salon A`, "success");
                                      }
                                      return { ...prev };
                                    });
                                  }
                                }}
                                className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-1 rounded hover:bg-emerald-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                              >
                                Guardar en Salon A
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {backendState.bultos.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-6 text-on-surface-variant font-medium font-sans">No hay bultos máster registrados en espera de almacenamiento.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PLANILLA DIARIA DE INVENTARIO (Excel style ALMACEN PASN.xlsx) */}
              <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Planilla Diaria de Inventario (Excel ALMACEN PASN.xlsx)</h4>
                    <p className="text-xs text-on-surface-variant font-bold">Mapeo de entradas de empaquetado y salidas de la terminal de ventas por días de la semana.</p>
                  </div>
                  <div className="flex gap-2 bg-surface p-1 rounded-lg border border-outline-variant">
                    {['Salon A', 'Salon B'].map(sal => (
                      <button
                        key={sal}
                        onClick={() => setSelectedPlanillaSalon(sal)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${selectedPlanillaSalon === sal ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
                      >
                        {sal}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-outline-variant rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                    <thead className="bg-surface-container text-secondary font-bold border-b border-outline-variant">
                      <tr>
                        <th className="px-3 py-2.5 border-r border-outline-variant">Código</th>
                        <th className="px-3 py-2.5 border-r border-outline-variant min-w-[200px]">Descripción del Producto</th>
                        <th className="px-3 py-2.5 border-r border-outline-variant text-center">Inv. Inicial (Doc)</th>
                        {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map(dia => (
                          <th key={dia} className="border-r border-outline-variant text-center" colSpan={2}>
                            <div className="border-b border-outline-variant py-1 text-[9px] uppercase tracking-wider">{dia}</div>
                            <div className="grid grid-cols-2 text-[9px] py-1">
                              <span className="text-emerald-700">Ing (Doc)</span>
                              <span className="text-rose-700">Vta (Doc)</span>
                            </div>
                          </th>
                        ))}
                        <th className="px-3 py-2.5 text-center font-bold">Stock Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backendState.planilla
                        .filter(item => item.salon === selectedPlanillaSalon)
                        .map((item, idx) => {
                          const totIng = Object.values(item.ingresos || {}).reduce((a, b) => a + b, 0);
                          const totVta = Object.values(item.ventas || {}).reduce((a, b) => a + b, 0);
                          const currentStock = item.inicial + totIng - totVta;
                          return (
                            <tr key={idx} className="border-b border-outline-variant hover:bg-surface/50 font-mono">
                              <td className="px-3 py-2 border-r border-outline-variant font-bold text-primary">{item.codigo}</td>
                              <td className="px-3 py-2 border-r border-outline-variant font-sans text-secondary text-[11px] font-semibold">{item.descripcion}</td>
                              <td className="px-3 py-2 border-r border-outline-variant text-center text-secondary font-semibold bg-surface-container-low">{item.inicial}</td>
                              {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map(dia => (
                                <td key={dia} className="border-r border-outline-variant text-center" colSpan={2}>
                                  <div className="grid grid-cols-2">
                                    <span className="text-emerald-600 font-bold border-r border-outline-variant/30 py-1">{item.ingresos?.[dia] || '-'}</span>
                                    <span className="text-rose-600 font-bold py-1">{item.ventas?.[dia] || '-'}</span>
                                  </div>
                                </td>
                              ))}
                              <td className={`px-3 py-2 text-center font-bold text-sm bg-surface-container-low ${currentStock <= 0 ? 'text-error font-extrabold animate-pulse' : 'text-primary'}`}>{currentStock}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}



          {/* 7. TERMINAL DE VENTAS (POS) */}
          {activeTab === 'ventas' && (
            <div className="space-y-6">
              {/* POS Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4">
                <div>
                  <h2 className="font-bold text-2xl text-on-surface">Terminal de Ventas (POS)</h2>
                  <p className="text-sm text-on-surface-variant">Asistente guiado de facturación rápida y despacho de bultos.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-full self-start text-xs font-bold text-primary">
                  <span className="material-symbols-outlined text-[16px]">store</span>
                  Caja Principal
                </div>
              </div>

              {/* Overdue Debt Block Alert */}
              {ventasForm.cliente_documento === '20123456789' && (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3 text-rose-800">
                    <span className="material-symbols-outlined text-rose-600 font-bold">warning</span>
                    <div>
                      <p className="font-bold text-sm">BLOQUEO: Deuda Vencida (Alerta de Cobro)</p>
                      <p className="text-xs text-on-surface-variant">El cliente presenta facturas impagas. Se requiere clave de supervisor para autorizar.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={ventasForm.supervisor_pwd}
                      onChange={(e) => setVentasForm({ ...ventasForm, supervisor_pwd: e.target.value })}
                      className="p-1.5 border border-rose-300 rounded bg-white text-xs"
                      placeholder="Clave de Supervisor..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (ventasForm.supervisor_pwd === 'admin123' || ventasForm.supervisor_pwd === '123') {
                          addNotification("Acceso de Supervisor concedido. Venta desbloqueada.", "success");
                        } else {
                          addNotification("Clave incorrecta. La venta sigue bloqueada.", "error");
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 active:scale-95 transition"
                    >
                      Autorizar
                    </button>
                  </div>
                </div>
              )}

              {/* Stepper Progress Bar */}
              <div className="max-w-xl mx-auto mb-8 mt-2">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-outline-variant -translate-y-1/2 z-0"></div>
                  <div
                    className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
                    style={{ width: `${(posStep - 1) * 33.3}%` }}
                  ></div>
                  {[
                    { nr: 1, label: 'Categoría' },
                    { nr: 2, label: 'Talla' },
                    { nr: 3, label: 'Detalles' },
                    { nr: 4, label: 'Pago' }
                  ].map((st) => (
                    <div key={st.nr} className="relative z-10 flex flex-col items-center">
                      <div
                        onClick={() => {
                          if (st.nr < posStep || (posSelection.categoria && st.nr === 2) || (posSelection.talla && st.nr === 3)) {
                            setPosStep(st.nr);
                          }
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer transition ${
                          posStep === st.nr
                            ? 'bg-primary text-white ring-4 ring-primary/20 shadow'
                            : posStep > st.nr
                            ? 'bg-primary text-white'
                            : 'bg-surface-container-highest border border-outline-variant text-secondary'
                        }`}
                      >
                        {st.nr}
                      </div>
                      <span className={`mt-1.5 text-[10px] font-bold ${posStep === st.nr ? 'text-primary' : 'text-outline'}`}>{st.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* POS Step Canvas */}
              <div className="max-w-4xl mx-auto">
                {/* Step 1: Category Grid */}
                {posStep === 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {[
                      { id: 'Adultos', name: 'Adultos', icon: 'person', desc: 'Calcetines standard' },
                      { id: 'Niños', name: 'Niños', icon: 'child_care', desc: 'Colección infantil' },
                      { id: 'Bebes', name: 'Bebés', icon: 'baby_changing_station', desc: 'Prendas suaves' },
                      { id: 'Damas', name: 'Damas', icon: 'woman', desc: 'Diseños de vestir' },
                      { id: 'Fútbol', name: 'Fútbol', icon: 'sports_soccer', desc: 'Caña alta compresión' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setPosSelection(prev => ({
                            ...prev,
                            categoria: cat.id,
                            talla: cat.id === 'Damas' || cat.id === 'Adultos' ? 'Talla Única' : prev.talla
                          }));
                          setPosStep(2);
                        }}
                        className="group flex flex-col bg-white rounded-xl shadow-sm border border-outline-variant hover:border-primary hover:shadow-md transition-all p-4 items-center text-center cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/5 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition duration-300">
                          <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                        </div>
                        <span className="font-bold text-xs text-on-surface">{cat.name}</span>
                        <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">{cat.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2: Size Selector */}
                {posStep === 2 && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant max-w-lg mx-auto">
                    <h3 className="font-bold text-sm text-center mb-6 uppercase tracking-wider text-secondary">Seleccione la Talla</h3>
                    
                    {['Damas', 'Adultos'].includes(posSelection.categoria) ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold text-center">
                          Esta categoría cuenta con Talla Única por estándar de fábrica.
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPosSelection(prev => ({ ...prev, talla: 'Talla Única' }));
                            setPosStep(3);
                          }}
                          className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold text-xs hover:bg-primary-container transition active:scale-95"
                        >
                          Confirmar Talla Única y Continuar
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {['2', '4', '5', '6'].map(sz => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => {
                              setPosSelection(prev => ({ ...prev, talla: sz }));
                              setPosStep(3);
                            }}
                            className={`py-4 border-2 rounded-xl font-bold font-mono text-sm hover:border-primary transition-all active:scale-95 cursor-pointer ${
                              posSelection.talla === sz ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface'
                            }`}
                          >
                            Talla {sz}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setPosSelection(prev => ({ ...prev, talla: 'Talla Única' }));
                            setPosStep(3);
                          }}
                          className="col-span-2 py-3 border-2 border-dashed border-outline-variant hover:bg-slate-50 transition rounded-xl font-bold text-xs active:scale-95"
                        >
                          Talla Única (Estándar)
                        </button>
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-start">
                      <button type="button" onClick={() => setPosStep(1)} className="flex items-center gap-1 text-primary text-xs font-bold hover:underline">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Volver a Categorías
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Design & Quality Selection */}
                {posStep === 3 && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant max-w-xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h3 className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-lg">palette</span> Diseño
                        </h3>
                        <div className="space-y-2">
                          {[
                            { value: 'Color entero', title: 'Entero / Unicolor', desc: 'Tejido básico plano' },
                            { value: 'Con diseño', title: 'Con Diseño / Jacquard', desc: 'Patrones o figuras' }
                          ].map(d => (
                            <label key={d.value} className={`flex items-center p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors ${posSelection.diseno === d.value ? 'border-primary bg-primary/5' : 'border-outline-variant'}`}>
                              <input
                                type="radio"
                                name="design"
                                checked={posSelection.diseno === d.value}
                                onChange={() => setPosSelection(prev => ({ ...prev, diseno: d.value }))}
                                className="w-4 h-4 text-primary border-outline-variant focus:ring-primary"
                              />
                              <div className="ml-3">
                                <p className="font-bold text-xs">{d.title}</p>
                                <p className="text-[10px] text-on-surface-variant font-medium">{d.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-lg">texture</span> Calidad
                        </h3>
                        <div className="space-y-2">
                          {[
                            { value: 'Delgada', title: 'Delgada / Verano', desc: 'Ligereza transpirable' },
                            { value: 'Afelpada', title: 'Afelpada / Invierno', desc: 'Interior acolchado térmico' }
                          ].map(q => (
                            <label key={q.value} className={`flex items-center p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors ${posSelection.calidad === q.value ? 'border-primary bg-primary/5' : 'border-outline-variant'}`}>
                              <input
                                type="radio"
                                name="quality"
                                checked={posSelection.calidad === q.value}
                                onChange={() => setPosSelection(prev => ({ ...prev, calidad: q.value }))}
                                className="w-4 h-4 text-primary border-outline-variant focus:ring-primary"
                              />
                              <div className="ml-3">
                                <p className="font-bold text-xs">{q.title}</p>
                                <p className="text-[10px] text-on-surface-variant font-medium">{q.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {posSelection.diseno && posSelection.calidad && (
                      <div className="mt-5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-center flex flex-col items-center">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">PRODUCTO CODIFICADO DUREY</p>
                        <p className="text-xl font-black font-mono text-emerald-950 tracking-widest">
                          {posSelection.categoria.substring(0, 3).toUpperCase()}-
                          {posSelection.diseno === 'Color entero' ? 'ENT' : 'DIS'}-
                          {posSelection.calidad === 'Delgada' ? 'DEL' : 'AFE'}-
                          {posSelection.talla === 'Talla Única' ? 'UNI' : String(posSelection.talla).padStart(2, '0')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const sku = `${posSelection.categoria.substring(0, 3).toUpperCase()}-${posSelection.diseno === 'Color entero' ? 'ENT' : 'DIS'}-${posSelection.calidad === 'Delgada' ? 'DEL' : 'AFE'}-${posSelection.talla === 'Talla Única' ? 'UNI' : String(posSelection.talla).padStart(2, '0')}`;
                            setVentasForm(prev => ({ ...prev, sku }));
                            addNotification(`SKU ${sku} cargado con éxito en la boleta de venta`, "success");
                            setPosStep(4);
                          }}
                          className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition active:scale-95 shadow-sm mt-1"
                        >
                          Confirmar y Cargar Boleta
                        </button>
                      </div>
                    )}

                    <div className="mt-6 flex justify-between items-center border-t border-outline-variant pt-4">
                      <button type="button" onClick={() => setPosStep(2)} className="flex items-center gap-1 text-on-surface-variant text-xs font-bold hover:underline">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Anterior
                      </button>
                      <button
                        type="button"
                        disabled={!posSelection.diseno || !posSelection.calidad}
                        onClick={() => setPosStep(4)}
                        className="px-5 py-2 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container transition text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        Ver Resumen de Venta
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Checkout Summary and Payment */}
                {posStep === 4 && (
                  <form onSubmit={handleCrearVenta} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Summary Column */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant space-y-4">
                        <h3 className="font-bold text-sm text-primary uppercase border-b pb-2 border-outline-variant tracking-wider">Detalle del Producto</h3>
                        <div className="flex gap-4 items-center flex-col sm:flex-row">
                          <div className="w-20 h-20 rounded-xl bg-surface-container-low overflow-hidden border border-outline-variant flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-4xl">checkroom</span>
                          </div>
                          <div className="flex-1 text-xs space-y-1">
                            <p className="text-[10px] text-primary font-bold uppercase">Categoría: {posSelection.categoria}</p>
                            <p className="font-bold text-sm text-on-surface">Media Durey Seleccionada</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-semibold text-on-surface-variant pt-1 font-mono">
                              <p>TALLA: <span className="text-on-surface font-bold">{posSelection.talla}</span></p>
                              <p>CALIDAD: <span className="text-on-surface font-bold">{posSelection.calidad}</span></p>
                              <p>DISEÑO: <span className="text-on-surface font-bold">{posSelection.diseno}</span></p>
                              <p>SKU: <span className="text-primary font-black">{ventasForm.sku}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant space-y-3.5 text-xs">
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Información del Cliente</h3>
                        <div className="grid sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Nro Documento (RUC/DNI)</label>
                            <input
                              type="text"
                              value={ventasForm.cliente_documento}
                              onChange={(e) => {
                                const doc = e.target.value;
                                const match = (backendState.clientes || []).find(c => (c.numero_documento || c.ruc) === doc);
                                if (match) {
                                  setVentasForm(prev => ({
                                    ...prev,
                                    cliente_documento: doc,
                                    nombre_cliente: match.nombre_cliente || match.nombre || '',
                                    telefono: match.telefono || '',
                                    direccion: match.direccion || ''
                                  }));
                                } else {
                                  setVentasForm(prev => ({
                                    ...prev,
                                    cliente_documento: doc
                                  }));
                                }
                              }}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                              placeholder="Ej. 20123456789"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Nombre / Razón Social</label>
                            <input
                              type="text"
                              value={ventasForm.nombre_cliente}
                              onChange={(e) => setVentasForm(prev => ({ ...prev, nombre_cliente: e.target.value }))}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold text-primary"
                              placeholder="Ej. Comercializadora Durey RUC"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Teléfono</label>
                            <input
                              type="text"
                              value={ventasForm.telefono}
                              onChange={(e) => setVentasForm(prev => ({ ...prev, telefono: e.target.value }))}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                              placeholder="Ej. 987654321"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Dirección de Despacho</label>
                            <input
                              type="text"
                              value={ventasForm.direccion}
                              onChange={(e) => setVentasForm(prev => ({ ...prev, direccion: e.target.value }))}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold"
                              placeholder="Ej. Jr. Gamarra 820, La Victoria"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Docenas a Comprar</label>
                            <input
                              type="number"
                              min="1"
                              value={ventasForm.cantidad}
                              onChange={(e) => setVentasForm({ ...ventasForm, cantidad: parseInt(e.target.value) || 1 })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Precio por Docena (S/)</label>
                            <input
                              type="number"
                              step="0.10"
                              min="0"
                              value={ventasForm.precio_docena}
                              onChange={(e) => setVentasForm({ ...ventasForm, precio_docena: parseFloat(e.target.value) || 0 })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold text-primary"
                              placeholder="Ej. 18.00"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Condición de Crédito</label>
                            <select
                              value={ventasForm.condicion}
                              onChange={(e) => setVentasForm({ ...ventasForm, condicion: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold"
                            >
                              <option value="Contado">Contado (Efectivo/Transferencia)</option>
                              <option value="Por partes">Al Crédito (Facturación Directa)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Column */}
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant space-y-4">
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Medio de Pago</h3>
                        
                        <div className="space-y-2">
                          {[
                            { id: 'Efectivo', label: 'Efectivo', icon: 'payments' },
                            { id: 'Tarjeta', label: 'Tarjeta de Débito/Crédito', icon: 'credit_card' },
                            { id: 'Transferencia', label: 'Transferencia (Yape/Plin/Banco)', icon: 'qr_code_2' }
                          ].map(pm => (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setVentasForm(prev => ({ ...prev, medio: pm.id }))}
                              className={`w-full p-3 border rounded-xl flex items-center justify-between text-xs font-bold transition active:scale-95 ${
                                ventasForm.medio === pm.id ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">{pm.icon}</span>
                                <span>{pm.label}</span>
                              </div>
                              {ventasForm.medio === pm.id && (
                                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Invoice Breakdown */}
                        {(() => {
                          const docenas = ventasForm.cantidad || 1;
                          const precioDocena = ventasForm.precio_docena !== undefined ? ventasForm.precio_docena : 18.00;
                          const total = precioDocena * docenas;
                          const subtotal = total / 1.18;
                          const igv = total - subtotal;
                          return (
                            <div className="pt-4 border-t border-outline-variant text-xs space-y-1.5 font-bold font-mono">
                              <div className="flex justify-between items-center text-on-surface-variant">
                                <span>Subtotal</span>
                                <span>S/ {subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-on-surface-variant">
                                <span>IGV (18%)</span>
                                <span>S/ {igv.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm font-extrabold text-primary pt-1 border-t border-outline-variant/30">
                                <span>TOTAL GENERAL</span>
                                <span>S/ {total.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}

                        <button
                          type="submit"
                          className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary-container transition active:scale-95 text-xs flex justify-center items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>
                          Completar Venta
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {/* CLIENTES Y CRÉDITO */}
          {activeTab === 'clientes' && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-2xl text-on-surface">Clientes y Gestión de Crédito</h2>
                  <p className="text-sm text-on-surface-variant">
                    Verificación de clientes en tiempo real, registro de nuevos compradores y estado de su historial crediticio.
                  </p>
                </div>
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form Panel: Add / Edit Client (col-span-4) */}
                <div className="lg:col-span-4 space-y-4">
                  <section className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col p-5 space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-outline-variant pb-2">
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      Registrar / Editar Cliente
                    </h3>

                    <form onSubmit={handleGuardarCliente} className="space-y-3.5 text-xs font-sans">
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Nro Documento (RUC / DNI)</label>
                        <input
                          type="text"
                          required
                          value={clienteForm.numero_documento}
                          onChange={(e) => setClienteForm({ ...clienteForm, numero_documento: e.target.value })}
                          className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                          placeholder="Ej. 20601234567"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Nombre / Razón Social</label>
                        <input
                          type="text"
                          required
                          value={clienteForm.nombre_cliente}
                          onChange={(e) => setClienteForm({ ...clienteForm, nombre_cliente: e.target.value })}
                          className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold"
                          placeholder="Ej. Comercializadora Durey SAC"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Teléfono</label>
                        <input
                          type="text"
                          value={clienteForm.telefono || ''}
                          onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })}
                          className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono"
                          placeholder="Ej. 987654321"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Dirección</label>
                        <input
                          type="text"
                          value={clienteForm.direccion || ''}
                          onChange={(e) => setClienteForm({ ...clienteForm, direccion: e.target.value })}
                          className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold"
                          placeholder="Ej. Av. Gamarra 450, Lima"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Cuotas Vencidas (Simular Deuda)</label>
                        <input
                          type="number"
                          min="0"
                          value={clienteForm.cuotas_vencidas || 0}
                          onChange={(e) => setClienteForm({ ...clienteForm, cuotas_vencidas: parseInt(e.target.value) || 0 })}
                          className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold text-red-600"
                        />
                        <p className="text-[9px] text-on-surface-variant mt-1 leading-tight">
                          * Configurar cuotas vencidas &gt; 0 bloqueará al vendedor en el POS hasta ingresar la clave del supervisor.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-primary text-on-primary rounded-xl font-bold shadow-md hover:bg-primary-container transition active:scale-95 text-xs flex justify-center items-center gap-1.5 mt-2"
                      >
                        <span className="material-symbols-outlined text-sm">save</span>
                        Guardar Cliente
                      </button>
                    </form>
                  </section>
                </div>

                {/* Right Panel: Clientes List & Real-time Verification (col-span-8) */}
                <div className="lg:col-span-8 space-y-4">
                  <section className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-outline-variant">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-600 text-sm">verified_user</span>
                        Verificación de Clientes Registrados
                      </h3>

                      {/* Buscador en tiempo real */}
                      <div className="w-full sm:w-64 relative">
                        <input
                          type="text"
                          placeholder="Buscar por RUC/DNI o Nombre..."
                          value={busquedaCliente}
                          onChange={(e) => setBusquedaCliente(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 border border-outline-variant rounded-lg text-xs bg-surface focus:ring-2 focus:ring-primary-container outline-none"
                        />
                        <span className="material-symbols-outlined absolute left-2 top-2 text-on-surface-variant text-base">search</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-outline-variant rounded-xl shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-surface-container-low text-secondary font-bold uppercase text-[10px] border-b border-outline-variant">
                          <tr>
                            <th className="p-3">Documento</th>
                            <th className="p-3">Nombre / Razón Social</th>
                            <th className="p-3">Contacto</th>
                            <th className="p-3 text-center">Estado de Crédito</th>
                            <th className="p-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant font-sans bg-white">
                          {(() => {
                            const filtrados = (backendState.clientes || []).filter(c => {
                              const doc = c.numero_documento || c.ruc || "";
                              const name = c.nombre_cliente || c.nombre || "";
                              return doc.includes(busquedaCliente) || 
                                     name.toLowerCase().includes(busquedaCliente.toLowerCase());
                            });

                            if (filtrados.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="5" className="text-center py-6 text-on-surface-variant font-medium font-sans">
                                    No se encontraron clientes registrados con ese criterio de búsqueda.
                                  </td>
                                </tr>
                              );
                            }

                            return filtrados.map((c) => {
                              const doc = c.numero_documento || c.ruc || "";
                              const name = c.nombre_cliente || c.nombre || "Cliente sin nombre";
                              const tieneDeuda = (c.cuotas_vencidas || 0) > 0;
                              return (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 font-mono font-bold text-primary">
                                    <span className="bg-primary/5 px-2 py-0.5 rounded border border-primary/10 text-[10px]">
                                      {c.tipo_documento || (doc.length === 8 ? 'DNI' : 'RUC')}: {doc}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-on-surface">{name}</div>
                                    <div className="text-[10px] text-on-surface-variant font-medium">{c.direccion || 'Sin dirección registrada'}</div>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-mono font-bold text-on-surface-variant flex items-center gap-1.5">
                                      <span>{c.telefono || 'Sin teléfono'}</span>
                                      {c.telefono && (
                                        <a
                                          href={`https://wa.me/51${c.telefono.replace(/\s+/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition active:scale-95 shadow-sm"
                                          title="Enviar WhatsApp (Reventa de Leads)"
                                        >
                                          <span className="material-symbols-outlined text-[12px] font-bold">chat</span>
                                        </a>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    {tieneDeuda ? (
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-red-50 text-red-700 border border-red-200">
                                        BLOQUEADO ({c.cuotas_vencidas} cuotas venc.)
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        AL DÍA (Aprobado)
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setClienteForm({
                                        numero_documento: doc,
                                        nombre_cliente: name,
                                        telefono: c.telefono || '',
                                        direccion: c.direccion || '',
                                        cuotas_vencidas: c.cuotas_vencidas || 0
                                      })}
                                      className="bg-surface hover:bg-slate-100 border border-outline-variant p-1.5 rounded-lg text-primary transition active:scale-95 flex items-center justify-center gap-1 ml-auto"
                                    >
                                      <span className="material-symbols-outlined text-xs">edit</span>
                                      <span className="text-[9px] font-bold">Editar</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* 8. DESPACHO */}
          {activeTab === 'despacho' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-bold text-2xl text-on-surface">Despacho de Mercadería</h2>
                <p className="text-sm text-on-surface-variant">Control de envíos y validación de pagos pendientes.</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-surface-container text-secondary font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">ID Orden</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-center">Paquetes</th>
                        <th className="px-4 py-3">Condición</th>
                        <th className="px-4 py-3">Estado Despacho</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {ordenesDespacho.map(o => (
                        <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-primary">#{o.id}</td>
                          <td className="px-4 py-3 font-semibold">{o.cliente?.nombre_cliente || 'N/A'}</td>
                          <td className="px-4 py-3 font-mono">{o.sku}</td>
                          <td className="px-4 py-3 text-center font-bold">{o.cantidad_paquetes}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${o.condicion_pago === 'Por partes' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {o.condicion_pago}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              o.estado_despacho === 'Listo para Enviar' ? 'bg-blue-100 text-blue-800' :
                              o.estado_despacho === 'Bloqueado' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {o.estado_despacho}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {o.estado_despacho === 'Listo para Enviar' && (
                              <button onClick={() => handleDespachar(o.id)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-emerald-700 active:scale-95 transition shadow-sm">
                                Enviar
                              </button>
                            )}
                            {o.estado_despacho === 'Bloqueado' && o.condicion_pago === 'Por partes' && (
                              <button onClick={() => handleConfirmarPagoInicial(o.id)} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-amber-600 active:scale-95 transition shadow-sm">
                                Confirmar Pago Inicial
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {ordenesDespacho.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-on-surface-variant font-medium">No hay órdenes pendientes de despacho.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 9. MANTENIMIENTO Y BITÁCORA */}
          {activeTab === 'mantenimiento' && (
            <div className="space-y-6">
              
              {/* Recurring Failure Alert Section */}
              {backendState.bitacora.filter(b => b.maquina_id === 'M-08' && b.diagnostico === 'Falla en sensor de aguja').length >= 1 && (
                <div className="bg-rose-50 text-rose-850 rounded-xl p-4 flex items-center gap-4 shadow-sm border border-rose-200 animate-pulse-slow">
                  <div className="bg-rose-600 text-white p-2.5 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg font-bold">warning</span>
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-bold uppercase tracking-wider text-rose-700 text-[10px]">Alerta de Falla Recurrente</p>
                    <h3 className="font-extrabold text-sm text-rose-950 mt-0.5">Falla Crítica detectada en <span className="underline">M-08 Sensor Aguja</span></h3>
                    <p className="text-on-surface-variant font-medium mt-1">Esta máquina ha reportado el mismo error recurrentemente en el último período. Se recomienda revisión de calibración de motor primario y cambio preventivo de bobina.</p>
                  </div>
                  <button type="button" onClick={() => addNotification("Detalles de falla recurrente: Máquina M-08 presenta fallas de tensión de aguja.", "warning")} className="px-4 py-2 bg-white border border-rose-300 text-rose-700 font-bold rounded-lg hover:bg-rose-50 transition text-xs shadow-sm active:scale-95 whitespace-nowrap">
                    Ver Detalles
                  </button>
                </div>
              )}

              {/* Bento Grid for Stats & Liquidations */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Liquidation Table (Small Card - col-span-4) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-outline-variant p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-secondary">Tarifas de Reparación</h4>
                    <span className="material-symbols-outlined text-primary text-lg">payments</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 font-semibold">
                      <span className="text-on-surface">Motor Principal</span>
                      <span className="font-mono text-primary font-bold">$500.00</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 font-semibold">
                      <span className="text-on-surface">Sensor Óptico / Aguja</span>
                      <span className="font-mono text-primary font-bold">$150.00</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/30 font-semibold">
                      <span className="text-on-surface">Limpieza y Ajuste</span>
                      <span className="font-mono text-primary font-bold">$75.00</span>
                    </div>
                  </div>
                  <div className="p-3 bg-primary-container text-primary rounded-xl flex items-start gap-2.5 text-[10px] font-bold">
                    <span className="material-symbols-outlined text-base">info</span>
                    <p>Los costos se debitan de caja y se registran en planilla de caja chica de manera automática al cerrar el reporte de reparación.</p>
                  </div>
                </div>

                {/* History Summary / Micro Chart (col-span-8) */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-outline-variant p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Estado de Mantenimiento Anual</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">Distribución de fallas y tickets técnicos por severidad.</p>
                    </div>
                    <div className="flex gap-2 text-[9px] font-bold">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">92% Resuelto</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">8% Pendiente</span>
                    </div>
                  </div>
                  {/* Simulated Chart Bars */}
                  <div className="mt-6 h-28 flex items-end gap-2 px-2">
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[40%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[65%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[45%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[80%] transition-all"></div>
                    <div className="flex-1 bg-primary rounded-t hover:opacity-85 h-[95%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[30%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[55%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[20%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[60%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[40%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[15%] transition-all"></div>
                    <div className="flex-1 bg-surface-container-high rounded-t hover:bg-primary/20 h-[10%] transition-all"></div>
                  </div>
                  <div className="flex justify-between mt-2 text-[9px] font-bold text-outline px-2">
                    <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
                  </div>
                </div>
              </div>

              {/* Technical Forms & Historical Table Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Form Registro de Reparación (lg:col-span-4) */}
                <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant p-5 rounded-2xl shadow-sm space-y-4">
                  <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Cierre Técnico de Fallas</h4>
                  <form onSubmit={handleReparar} className="space-y-3.5 text-xs font-semibold">
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Ticket de Falla de Máquina</label>
                      <select
                        value={mantenimientoForm.ticket_id}
                        onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, ticket_id: parseInt(e.target.value) || 1 })}
                        className="w-full p-2 border border-outline-variant bg-surface rounded-lg font-mono font-bold text-xs"
                      >
                        {backendState.bitacora.filter(b => b.estado_ticket !== 'Cerrado').map(b => (
                          <option key={b.id} value={b.id}>Ticket #{b.id} - Máquina {b.maquina_id}</option>
                        ))}
                        {backendState.bitacora.filter(b => b.estado_ticket !== 'Cerrado').length === 0 && (
                          <option value="">No hay tickets abiertos</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Técnico Asignado</label>
                      <input
                        type="text"
                        value={mantenimientoForm.tecnico}
                        onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, tecnico: e.target.value })}
                        className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                        placeholder="ej. Ricardo Alarcón"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Tipo de Reparación (Tarifa)</label>
                      <select
                        value={mantenimientoForm.tipo}
                        onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, tipo: e.target.value })}
                        className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                      >
                        <option value="Cambio de Sensor">Cambio de Sensor Aguja ($150.00)</option>
                        <option value="Cambio de Motor">Cambio de Motor Principal ($500.00)</option>
                        <option value="Ajuste Mecánico Base">Ajuste Mecánico Base ($75.00)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Diagnóstico Final</label>
                      <textarea
                        value={mantenimientoForm.problema}
                        onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, problema: e.target.value })}
                        className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs h-16 font-semibold"
                        placeholder="Describa el trabajo realizado..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Repuestos Utilizados</label>
                      <input
                        type="text"
                        value={mantenimientoForm.repuestos}
                        onChange={(e) => setMantenimientoForm({ ...mantenimientoForm, repuestos: e.target.value })}
                        className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                        placeholder="ej. Sensor de aguja M8, Fusible 10A"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold hover:bg-primary-container transition text-xs shadow-md mt-2 flex justify-center items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">build</span>
                      Cerrar Ticket y Cargar Caja
                    </button>
                  </form>
                </div>

                {/* Table Historical Bitacora (lg:col-span-8) */}
                <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Bitácora Digital de Fallas y Reparaciones</h4>
                    <div className="flex gap-2">
                      <button onClick={() => addNotification("Filtros de bitácora abiertos", "info")} className="flex items-center gap-1 border border-outline px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition">
                        <span className="material-symbols-outlined text-sm">filter_list</span> Filtrar
                      </button>
                    </div>
                  </div>
                  
                  <div className="border border-outline-variant rounded-xl overflow-hidden overflow-x-auto max-h-[360px]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-surface-container text-secondary font-bold border-b border-outline-variant uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Fecha</th>
                          <th className="px-3 py-2.5">Máquina</th>
                          <th className="px-3 py-2.5">Falla / Diagnóstico</th>
                          <th className="px-3 py-2.5">Técnico</th>
                          <th className="px-3 py-2.5 text-right">Costo</th>
                          <th className="px-3 py-2.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backendState.bitacora.map(b => (
                          <tr key={b.id} className="border-b border-outline-variant hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2.5 font-mono text-[10px] text-outline">{b.fecha}</td>
                            <td className="px-3 py-2.5 font-bold font-mono text-primary text-center">#{b.maquina_id}</td>
                            <td className="px-3 py-2.5">
                              <span className="font-bold text-on-surface text-[11px] block">{b.diagnostico || 'Diagnóstico pendiente'}</span>
                              <span className="text-[10px] text-on-surface-variant font-medium block">Repuestos: {b.repuestos || 'Ninguno'}</span>
                            </td>
                            <td className="px-3 py-2.5 font-sans font-semibold text-secondary">{b.tecnico || 'Sin asignar'}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-secondary">
                              ${b.costo_reparacion ? b.costo_reparacion.toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                b.estado_ticket === 'Cerrado' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800 animate-pulse'
                              }`}>
                                {b.estado_ticket}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {backendState.bitacora.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center py-6 text-on-surface-variant font-medium font-sans">No hay registros de fallas en la bitácora actualmente.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 9. MATERIA PRIMA (HILO) */}
          {activeTab === 'materia_prima' && (
            <div className="space-y-6">
              
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4">
                <div>
                  <h2 className="font-bold text-2xl text-on-surface">Gestión de Materia Prima: Hilo por Cajas</h2>
                  <div className="flex gap-2 text-[10px] font-bold text-outline uppercase tracking-wider mt-1">
                    <span>Materia Prima</span>
                    <span>/</span>
                    <span className="text-primary">Distribución y Control de Cajas</span>
                  </div>
                </div>
                <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setHiloSubTab('inventario')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      hiloSubTab === 'inventario'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">inventory_2</span> Inventario e Ingresos
                  </button>
                  <button
                    type="button"
                    onClick={() => setHiloSubTab('distribucion')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      hiloSubTab === 'distribucion'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">badge</span> Distribución a Turnos
                  </button>
                  <button
                    type="button"
                    onClick={() => setHiloSubTab('proveedores')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                      hiloSubTab === 'proveedores'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">hail</span> Proveedores de Hilo
                  </button>
                </div>
              </div>

              {/* KPI Bento Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-outline-variant p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">RECIBIDO HOY (CAJAS)</p>
                    <span className="material-symbols-outlined text-primary text-lg">download</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono">15</span>
                    <span className="text-[10px] text-on-surface-variant font-bold font-mono">cajas</span>
                  </div>
                  <div className="mt-2 flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span>Recepción al día</span>
                  </div>
                </div>

                <div className="bg-white border border-outline-variant p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">STOCK TOTAL DISPONIBLE</p>
                    <span className="material-symbols-outlined text-secondary text-lg">inventory_2</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono">
                      {backendState.inventario_hilo.reduce((acc, h) => acc + (h.stock_cajas || 0), 0)}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-bold font-mono">cajas</span>
                  </div>
                  <div className="mt-2 text-on-surface-variant text-[10px] font-bold">
                    <span>{backendState.inventario_hilo.length > 0 ? "Stock listo en fábrica" : "Sin inventario de hilo"}</span>
                  </div>
                </div>

                <div className="bg-white border border-outline-variant p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">CONOS ESTIMADOS</p>
                    <span className="material-symbols-outlined text-tertiary text-lg">checkroom</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono">
                      {backendState.inventario_hilo.reduce((acc, h) => acc + (h.stock_cajas || 0), 0) * 24}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-bold font-mono font-sans">conos</span>
                  </div>
                  <div className="mt-2 text-on-surface-variant text-[10px] font-bold">
                    <span>~24 conos por caja</span>
                  </div>
                </div>

                <div className="bg-white border border-outline-variant p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">CAJAS EN USO (TURNO)</p>
                    <span className="material-symbols-outlined text-error text-lg">play_arrow</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono">
                      {backendState.distribucion_hilo.filter(x => x.estado === 'En Uso').length}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-bold font-mono">cajas</span>
                  </div>
                  <div className="mt-2 flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>En máquina actualmente</span>
                  </div>
                </div>
              </div>

              {/* Sub-Tab Content */}
              {hiloSubTab === 'inventario' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Inventario de Cajas */}
                  <div className="lg:col-span-8 bg-white border border-outline-variant rounded-2xl overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                      <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Inventario de Cajas de Hilo en Almacén</h3>
                      <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[10px] font-bold text-on-surface-variant">Lotes Activos</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] text-secondary font-bold uppercase border-b border-outline-variant">
                          <tr>
                            <th className="px-4 py-2.5">Código Hilo</th>
                            <th className="px-4 py-2.5">Material</th>
                            <th className="px-4 py-2.5">Color</th>
                            <th className="px-4 py-2.5 text-right">Cajas en Almacén</th>
                            <th className="px-4 py-2.5 text-right">Conos Estimados</th>
                            <th className="px-4 py-2.5 text-center">Estado Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30">
                          {backendState.inventario_hilo.map((hilo) => {
                            const isLow = (hilo.stock_cajas || 0) < (hilo.umbral_minimo || 3);
                            return (
                              <tr key={hilo.id} className="hover:bg-slate-50 transition font-semibold">
                                <td className="px-4 py-3 font-mono text-primary font-bold">#HILO-CAJA-{hilo.id}</td>
                                <td className="px-4 py-3 text-on-surface font-sans">{hilo.material}</td>
                                <td className="px-4 py-3 text-on-surface-variant font-bold">{hilo.color}</td>
                                <td className="px-4 py-3 text-right font-mono text-secondary font-black">{(hilo.stock_cajas || 0)} cajas</td>
                                <td className="px-4 py-3 text-right font-mono text-outline">{(hilo.stock_cajas || 0) * 24} conos</td>
                                <td className="px-4 py-3 text-center">
                                  {isLow ? (
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-full text-[8px] font-bold uppercase tracking-wider">Bajo Stock</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[8px] font-bold uppercase tracking-wider">Suficiente</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {backendState.inventario_hilo.length === 0 && (
                            <tr>
                              <td colSpan="6" className="text-center py-8 text-on-surface-variant font-medium">No hay lotes de materia prima registrados.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Formulario Ingreso de Cajas */}
                  <div className="lg:col-span-4 bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="p-4 bg-primary text-on-primary">
                      <h3 className="font-bold text-sm uppercase tracking-wider">Ingreso de Cajas de Hilo</h3>
                      <p className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5">Control de Recepción en Almacén</p>
                    </div>
                    
                    <div className="p-4 space-y-4 text-xs font-semibold flex-1">
                      <form onSubmit={handleComprarMateriaPrima} className="space-y-3 font-semibold text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Color de Hilo</label>
                            <input
                              type="text"
                              value={materiaPrimaForm.color}
                              onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, color: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                              placeholder="ej. Gris"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Material</label>
                            <input
                              type="text"
                              value={materiaPrimaForm.material}
                              onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, material: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                              placeholder="ej. Algodón Peinado"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Cajas Ingresadas</label>
                            <input
                              type="number"
                              min="1"
                              value={materiaPrimaForm.cantidad}
                              onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, cantidad: parseInt(e.target.value) || 0 })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Proveedor Lote</label>
                            <select
                              value={materiaPrimaForm.proveedor}
                              onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, proveedor: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary"
                              required
                            >
                              <option value="">-- Seleccione Proveedor --</option>
                              {(backendState.proveedores_hilo || []).map(p => (
                                <option key={p.id} value={p.nombre}>{p.nombre}</option>
                              ))}
                              <option value="Otro">Otro Proveedor (Especificar...)</option>
                            </select>
                          </div>
                        </div>

                        {materiaPrimaForm.proveedor === 'Otro' && (
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Nombre de Proveedor (Otro)</label>
                            <input
                              type="text"
                              value={materiaPrimaForm.proveedor_otro || ''}
                              onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, proveedor_otro: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-semibold text-primary"
                              placeholder="Escriba nombre de proveedor..."
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Resultado de Control de Calidad</label>
                          <select
                            value={materiaPrimaForm.estado}
                            onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, estado: e.target.value })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary"
                          >
                            <option value="Recibida">Aprobado (Ingresar a Stock de Hilo)</option>
                            <option value="Devuelto a Proveedor">Rechazado (Iniciar Devolución a Proveedor)</option>
                          </select>
                        </div>

                        {materiaPrimaForm.estado === 'Devuelto a Proveedor' && (
                          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">warning</span> ¿Devolver a Proveedor?
                            </p>
                            <p className="text-[9px] text-on-surface-variant font-medium">Si detecta fallas críticas, las cajas se devuelven sin afectar el inventario productivo.</p>
                            <input
                              type="text"
                              value={materiaPrimaForm.motivo}
                              onChange={(e) => setMateriaPrimaForm({ ...materiaPrimaForm, motivo: e.target.value })}
                              className="w-full p-1.5 border border-rose-300 rounded bg-white text-xs"
                              placeholder="Motivo de devolución..."
                              required
                            />
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow active:scale-95 text-xs flex justify-center items-center gap-1 mt-2"
                        >
                          <span className="material-symbols-outlined text-sm">inventory</span>
                          Finalizar e Ingresar Cajas
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {hiloSubTab === 'distribucion' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Historial de distribución de cajas de hilo */}
                  <div className="lg:col-span-8 bg-white border border-outline-variant rounded-2xl overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                      <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Rendimiento y Asignación de Hilo por Turno</h3>
                      <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[10px] font-bold text-on-surface-variant">Control de Turnos</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] text-secondary font-bold uppercase border-b border-outline-variant">
                          <tr>
                            <th className="px-4 py-2.5">Fecha / Turno</th>
                            <th className="px-4 py-2.5">Operario</th>
                            <th className="px-4 py-2.5">Hilo (Cajas Entregadas)</th>
                            <th className="px-4 py-2.5 text-right">Rendimiento (Pares)</th>
                            <th className="px-4 py-2.5 text-center">Estado</th>
                            <th className="px-4 py-2.5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30">
                          {backendState.distribucion_hilo.map((dist) => {
                            const isCompletado = dist.estado === 'Completado';
                            const standard = (dist.cajas_entregadas || 1) * 240;
                            const efficiency = isCompletado ? Math.round((dist.pares_producidos / standard) * 100) : null;
                            
                            return (
                              <tr key={dist.id} className="hover:bg-slate-50 transition font-semibold">
                                <td className="px-4 py-3">
                                  <span className="font-bold block">{dist.fecha}</span>
                                  <span className="text-[10px] text-outline block">Turno: {dist.turno}</span>
                                </td>
                                <td className="px-4 py-3 text-on-surface font-sans">
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-secondary">person</span>
                                    <span>{dist.operario_nombre}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-bold block text-primary">{dist.material} - {dist.color}</span>
                                  <span className="text-[10px] text-emerald-700 block">Entregado: {dist.cajas_entregadas} Caja(s)</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isCompletado ? (
                                    <div>
                                      <span className="font-bold font-mono text-emerald-800">{dist.pares_producidos} pares</span>
                                      <span className={`text-[9px] block font-bold ${efficiency >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        Eficiencia: {efficiency}%
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-outline italic">En máquina...</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isCompletado ? (
                                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[8px] font-bold uppercase tracking-wider">Caja Rendida</span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full text-[8px] font-bold uppercase tracking-wider">En Producción</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {!isCompletado ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDistribucionACompletar(dist);
                                        setParesRendimientoForm({ pares: '240', comentario: 'Se agotó la caja completa.' });
                                      }}
                                      className="bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-lg hover:bg-primary-container transition active:scale-95 shadow-sm"
                                    >
                                      Medir Rendimiento
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-outline block max-w-[120px] truncate" title={dist.rendimiento_comentario}>
                                      {dist.rendimiento_comentario || 'Sin comentarios'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {backendState.distribucion_hilo.length === 0 && (
                            <tr>
                              <td colSpan="6" className="text-center py-8 text-on-surface-variant font-medium">No se han registrado distribuciones de hilo a turnos.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Formulario de entrega de caja */}
                  <div className="lg:col-span-4 bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="p-4 bg-primary text-on-primary">
                      <h3 className="font-bold text-sm uppercase tracking-wider">Entregar Caja para Turno</h3>
                      <p className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5">Control Individual de Hilo</p>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-semibold flex-1">
                      <form onSubmit={handleDistribuirCaja} className="space-y-3 font-semibold text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Operario Responsable</label>
                          <select
                            value={distribucionForm.operario_id}
                            onChange={(e) => setDistribucionForm({ ...distribucionForm, operario_id: e.target.value })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary"
                            required
                          >
                            <option value="">Seleccione Operario...</option>
                            {backendState.operarios.map(op => (
                              <option key={op.id} value={op.id}>{op.nombre} ({op.tipo_contrato})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Seleccionar Hilo en Almacén</label>
                          <select
                            value={distribucionForm.hilo_id}
                            onChange={(e) => setDistribucionForm({ ...distribucionForm, hilo_id: e.target.value })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold"
                            required
                          >
                            <option value="">Seleccione Hilo...</option>
                            {backendState.inventario_hilo.map(h => (
                              <option key={h.id} value={h.id} disabled={h.stock_cajas <= 0}>
                                {h.material} - {h.color} ({h.stock_cajas} cajas disponibles)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Fecha de Turno</label>
                            <input
                              type="date"
                              value={distribucionForm.fecha}
                              onChange={(e) => setDistribucionForm({ ...distribucionForm, fecha: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Turno Asignado</label>
                            <select
                              value={distribucionForm.turno}
                              onChange={(e) => setDistribucionForm({ ...distribucionForm, turno: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-bold text-primary"
                              required
                            >
                              <option value="Mañana">Mañana</option>
                              <option value="Tarde">Tarde</option>
                              <option value="Noche">Noche</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Cajas a Entregar</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={distribucionForm.cajas_entregadas}
                            onChange={(e) => setDistribucionForm({ ...distribucionForm, cajas_entregadas: parseInt(e.target.value) || 1 })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold text-center text-primary"
                            required
                          />
                          <p className="text-[9px] text-outline mt-1 font-normal italic">
                            Nota: Se entregará una caja cerrada al operario, restando del stock del almacén central.
                          </p>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-container transition shadow active:scale-95 text-xs flex justify-center items-center gap-1 mt-2"
                        >
                          <span className="material-symbols-outlined text-sm">send</span>
                          Entregar Caja e Iniciar Control
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {hiloSubTab === 'proveedores' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Directorio de Proveedores */}
                  <div className="lg:col-span-8 bg-white border border-outline-variant rounded-2xl overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                      <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Directorio de Proveedores de Hilo</h3>
                      <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[10px] font-bold text-on-surface-variant">Contactos Homologados</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-[10px] text-secondary font-bold uppercase border-b border-outline-variant">
                          <tr>
                            <th className="px-4 py-2.5">Proveedor</th>
                            <th className="px-4 py-2.5">RUC</th>
                            <th className="px-4 py-2.5">Contacto Principal</th>
                            <th className="px-4 py-2.5">Tipos de Hilos</th>
                            <th className="px-4 py-2.5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30 bg-white">
                          {(backendState.proveedores_hilo || []).map((prov) => (
                            <tr key={prov.id} className="hover:bg-slate-50 transition font-semibold">
                              <td className="px-4 py-3">
                                <span className="font-bold block text-primary">{prov.nombre}</span>
                                <span className="text-[10px] text-outline block">{prov.direccion || 'Sin dirección'}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-on-surface">{prov.RUC || 'Sin RUC'}</td>
                              <td className="px-4 py-3">
                                <span className="block font-bold">{prov.contacto}</span>
                                <span className="text-[10px] text-outline block">{prov.telefono}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold uppercase">
                                  {prov.tipos_hilo || 'Hilo Genérico'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center gap-1.5">
                                  <a
                                    href={`tel:${prov.telefono}`}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-secondary transition active:scale-95"
                                    title="Llamar Proveedor"
                                  >
                                    <span className="material-symbols-outlined text-sm">call</span>
                                  </a>
                                  {prov.telefono && (
                                    <a
                                      href={`https://wa.me/51${prov.telefono.replace(/\s+/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition active:scale-95 border border-emerald-200"
                                      title="WhatsApp Proveedor"
                                    >
                                      <span className="material-symbols-outlined text-sm font-bold">chat</span>
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(backendState.proveedores_hilo || []).length === 0 && (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-on-surface-variant font-medium">No hay proveedores registrados en el sistema.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Formulario Registro Proveedor */}
                  <div className="lg:col-span-4 bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="p-4 bg-primary text-on-primary">
                      <h3 className="font-bold text-sm uppercase tracking-wider">Nuevo Proveedor de Hilo</h3>
                      <p className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5">Homologación y Registro</p>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-semibold flex-1">
                      <form onSubmit={handleCrearProveedor} className="space-y-3 font-semibold text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Nombre / Razón Social</label>
                          <input
                            type="text"
                            required
                            value={proveedorForm.nombre}
                            onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                            placeholder="ej. Hilados del Sur S.A.C."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">RUC</label>
                            <input
                              type="text"
                              value={proveedorForm.RUC}
                              onChange={(e) => setProveedorForm({ ...proveedorForm, RUC: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono font-bold"
                              placeholder="ej. 20123456789"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Teléfono</label>
                            <input
                              type="text"
                              required
                              value={proveedorForm.telefono}
                              onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
                              className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs font-mono"
                              placeholder="ej. 987654321"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Persona de Contacto</label>
                          <input
                            type="text"
                            value={proveedorForm.contacto}
                            onChange={(e) => setProveedorForm({ ...proveedorForm, contacto: e.target.value })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                            placeholder="ej. Eduardo Gómez"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Dirección Oficina / Almacén</label>
                          <input
                            type="text"
                            value={proveedorForm.direccion}
                            onChange={(e) => setProveedorForm({ ...proveedorForm, direccion: e.target.value })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                            placeholder="ej. Av. Industrial 450, Lima"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Tipos de Hilos que Suministra</label>
                          <input
                            type="text"
                            value={proveedorForm.tipos_hilo}
                            onChange={(e) => setProveedorForm({ ...proveedorForm, tipos_hilo: e.target.value })}
                            className="w-full p-2 border border-outline-variant bg-surface rounded-lg text-xs"
                            placeholder="ej. Algodón Peinado, Poliéster 30/2"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-container transition shadow active:scale-95 text-xs flex justify-center items-center gap-1 mt-2"
                        >
                          <span className="material-symbols-outlined text-sm">save</span>
                          Registrar Proveedor
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Specs Card and Details Footer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 bg-white border border-outline-variant p-5 rounded-2xl shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Especificaciones de Distribución y Rendimiento</h4>
                  <div className="grid md:grid-cols-3 gap-4 text-xs font-semibold">
                    <div className="border border-outline-variant rounded-xl p-3 bg-slate-50 space-y-1">
                      <h5 className="font-bold text-[10px] text-primary uppercase">Caja Estándar Durey</h5>
                      <p className="text-on-surface-variant font-medium">Contiene 24 conos de hilo del mismo material y color. Peso aproximado: 24 kg netos.</p>
                    </div>
                    <div className="border border-outline-variant rounded-xl p-3 bg-slate-50 space-y-1">
                      <h5 className="font-bold text-[10px] text-primary uppercase">Rendimiento Esperado</h5>
                      <p className="text-on-surface-variant font-medium">Se calcula un promedio de 10 pares de medias por cono (~240 pares o 20 docenas por caja de hilo completa).</p>
                    </div>
                    <div className="border border-outline-variant rounded-xl p-3 bg-slate-50 space-y-1">
                      <h5 className="font-bold text-[10px] text-primary uppercase">Control del Turno</h5>
                      <p className="text-on-surface-variant font-medium">El operario recibe la caja cerrada para su turno y el supervisor registra el total final producido al terminar la jornada.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default App;
