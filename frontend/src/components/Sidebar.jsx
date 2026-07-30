import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, theme, setTheme, userRole }) => {
  const ROLE_TABS = {
    admin: ['dashboard', 'tejido', 'remallado', 'acabado', 'salones', 'ventas', 'clientes', 'despacho', 'mantenimiento', 'materia_prima'],
    supervisor: ['tejido', 'remallado', 'acabado', 'salones', 'mantenimiento', 'materia_prima'],
    vendedor: ['ventas', 'clientes', 'despacho', 'salones'],
    almacenero: ['salones', 'materia_prima', 'despacho']
  };

  const menuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: 'dashboard' },
    { id: 'tejido', label: 'Tejido y Volteado', icon: 'precision_manufacturing' },
    { id: 'remallado', label: 'Remallado (Costura)', icon: 'payments' },
    { id: 'acabado', label: 'Planchado, Acabado y Prep.', icon: 'package_2' },
    { id: 'salones', label: 'Almacén y Stock', icon: 'inventory_2' },
    { id: 'ventas', label: 'Distribución (Ventas)', icon: 'point_of_sale' },
    { id: 'clientes', label: 'Clientes y Crédito', icon: 'group' },
    { id: 'despacho', label: 'Distribución (Despacho)', icon: 'local_shipping' },
    { id: 'mantenimiento', label: 'Fallas y Mantenimiento', icon: 'settings_suggest' },
    { id: 'materia_prima', label: 'Abastecimiento y MP', icon: 'rebase_edit' }
  ];

  const allowedTabs = ROLE_TABS[userRole] || ROLE_TABS.supervisor;
  const filteredItems = menuItems.filter(item => allowedTabs.includes(item.id));

  return (
    <aside className="w-72 bg-surface border-r border-outline-variant h-screen flex flex-col fixed left-0 top-0 z-40">
      {/* Brand Header */}
      <div className="p-5 border-b border-outline-variant flex flex-col items-center gap-2 bg-surface text-on-surface">
        <img 
          src="/logo_transparent.png?v=3" 
          alt="Durey Logo" 
          className="h-20 w-auto object-contain transition-all duration-200 dark:brightness-100 brightness-0" 
        />
        <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Factory Admin</p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-1">
        {filteredItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Dark/Light mode toggle */}
      <div className="p-4 border-t border-outline-variant bg-surface-container-low flex flex-col gap-3">
        <div className="flex items-center justify-between bg-surface-container-high p-1 rounded-lg border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              theme === 'light'
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">light_mode</span>
            <span>Claro</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              theme === 'dark'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dark_mode</span>
            <span>Oscuro</span>
          </button>
        </div>
        <p className="text-[10px] text-on-surface-variant/70 text-center font-bold">Sistema Durey final v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
