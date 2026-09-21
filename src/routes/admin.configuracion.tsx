import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  RotateCw,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  X,
  Settings as SettingsIcon,
  Building2,
  Bell,
  Lock,
  Palette,
  Check,
  Phone,
  MapPin,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { useConfiguracion, useUpdateConfigBulk, useChangePassword } from "@/hooks/useConfiguracion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/configuracion")({
  component: ConfiguracionConsole,
});

type TabType = "estancia" | "umbrales" | "interfaz" | "seguridad";

function ConfiguracionConsole() {
  const { data, isLoading, isError, refetch } = useConfiguracion();
  const updateBulk = useUpdateConfigBulk();
  const [activeTab, setActiveTab] = useState<TabType>("estancia");
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Local UI settings
  const [uiTheme, setUiTheme] = useState(() => localStorage.getItem("estancia_ui_theme") || "selva");
  const [tableDensity, setTableDensity] = useState(() => localStorage.getItem("estancia_table_density") || "comoda");

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = useCallback((type: "success" | "error", msg: string) => setToast({ type, msg }), []);

  const currentValue = (clave: string, defaultVal: string = "") => {
    if (dirty[clave] !== undefined) return dirty[clave];
    if (data?.configuraciones) {
      const found = data.configuraciones.find((c: any) => c.clave === clave);
      if (found) return found.valor;
    }
    return defaultVal;
  };

  const setValue = (clave: string, valor: string) => {
    setDirty((prev) => ({ ...prev, [clave]: valor }));
  };

  const handleSave = async () => {
    const items = Object.entries(dirty).map(([clave, valor]) => ({ clave, valor }));
    localStorage.setItem("estancia_ui_theme", uiTheme);
    localStorage.setItem("estancia_table_density", tableDensity);

    if (items.length === 0) {
      showToast("success", "Preferencias visuales guardadas exitosamente");
      return;
    }

    try {
      await updateBulk.mutateAsync(items);
      setDirty({});
      showToast("success", "Configuración de la hacienda actualizada");
    } catch (err: any) {
      showToast("error", err?.message || "Error al guardar configuración");
    }
  };

  // Password form
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const changePassword = useChangePassword();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("error", "Las contraseñas nuevas no coinciden");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast("error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("success", "Contraseña cambiada exitosamente");
    } catch (err: any) {
      showToast("error", err?.message || "Error al cambiar contraseña");
    }
  };

  const isSaving = updateBulk.isPending;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto font-sans text-slate-900 antialiased">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs text-white animate-fade-up ${
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 cursor-pointer"><X className="size-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Ajustes & Configuración</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Parámetros del establecimiento, números de WhatsApp y alertas automáticas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs">
            <RotateCw className="size-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white cursor-pointer shadow-xs transition"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 text-emerald-400" />}
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none no-scrollbar pb-0.5">
        <button
          onClick={() => setActiveTab("estancia")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "estancia" ? "border-emerald-600 text-emerald-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 className="size-4" /> Datos de la Hacienda
        </button>

        <button
          onClick={() => setActiveTab("umbrales")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "umbrales" ? "border-emerald-600 text-emerald-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Bell className="size-4" /> Umbrales & Alertas
        </button>

        <button
          onClick={() => setActiveTab("interfaz")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "interfaz" ? "border-emerald-600 text-emerald-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Palette className="size-4" /> Personalización UI
        </button>

        <button
          onClick={() => setActiveTab("seguridad")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "seguridad" ? "border-emerald-600 text-emerald-600 font-bold" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Lock className="size-4" /> Seguridad & Clave
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {/* TAB 1: DATOS DE LA HACIENDA */}
          {activeTab === "estancia" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs text-xs">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="size-4 text-emerald-600" /> Información Oficial de la Hacienda
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nombre de la Estancia / Hacienda</Label>
                  <Input
                    value={currentValue("nombre_estancia", "Hacienda Guayabal")}
                    onChange={(e) => setValue("nombre_estancia", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Propietario / Representante Legal</Label>
                  <Input
                    value={currentValue("propietario", "Camila Aponte Suárez & Mauricio Suárez")}
                    onChange={(e) => setValue("propietario", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Teléfono WhatsApp de Alertas por Defecto</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={currentValue("whatsapp_phone", "+591 76543210")}
                      onChange={(e) => setValue("whatsapp_phone", e.target.value)}
                      placeholder="+591 76543210"
                      className="pl-9 h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Registro RUNSA / SENASAG</Label>
                  <Input
                    value={currentValue("registro_senasag", "RUNSA-78219-SCZ")}
                    onChange={(e) => setValue("registro_senasag", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label>Ubicación Geográfica / Provincia</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={currentValue("ubicacion", "San Ignacio de Velasco, Santa Cruz, Bolivia")}
                      onChange={(e) => setValue("ubicacion", e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UMBRALES DE ALERTAS */}
          {activeTab === "umbrales" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs text-xs">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="size-4 text-amber-600" /> Días de Aviso & Umbrales Automáticos
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Aviso Previo de Parto (Días)</Label>
                  <Input
                    type="number"
                    value={currentValue("dias_alerta_parto", "30")}
                    onChange={(e) => setValue("dias_alerta_parto", e.target.value)}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Notificar cuándo falten estos días para la fecha estimada de parto (283d).</span>
                </div>

                <div className="space-y-1">
                  <Label>Día Objetivo de Secado de Leche (Días Gestación)</Label>
                  <Input
                    type="number"
                    value={currentValue("dias_secado_leche", "210")}
                    onChange={(e) => setValue("dias_secado_leche", e.target.value)}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Recomendación técnica para suspender el ordeño (Día 210 preñez).</span>
                </div>

                <div className="space-y-1">
                  <Label>Stock Mínimo Alerta Medicamentos</Label>
                  <Input
                    type="number"
                    value={currentValue("stock_minimo_salud", "5")}
                    onChange={(e) => setValue("stock_minimo_salud", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Alerta de Pérdida de Peso (Kg/mes)</Label>
                  <Input
                    type="number"
                    value={currentValue("alerta_perdida_peso", "15")}
                    onChange={(e) => setValue("alerta_perdida_peso", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PERSONALIZACIÓN INTERFAZ */}
          {activeTab === "interfaz" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs text-xs">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Palette className="size-4 text-purple-600" /> Preferencias Visuales del Sistema
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Tema de la Aplicación</Label>
                  <select
                    value={uiTheme}
                    onChange={(e) => setUiTheme(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white font-semibold outline-none"
                  >
                    <option value="selva">🌿 Verde Selva (Por defecto)</option>
                    <option value="azul">🔷 Azul Clásico</option>
                    <option value="oscuro">🌙 Modo Oscuro Elegante</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Densidad de Tablas</Label>
                  <select
                    value={tableDensity}
                    onChange={(e) => setTableDensity(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white font-semibold outline-none"
                  >
                    <option value="comoda">Cómoda (Recomendada)</option>
                    <option value="compacta">Compacta (Más filas en pantalla)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEGURIDAD & CAMBIO DE CLAVE */}
          {activeTab === "seguridad" && (
            <form onSubmit={handlePasswordChange} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs text-xs max-w-md">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Lock className="size-4 text-rose-600" /> Cambiar Contraseña de Administrador
              </h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Contraseña Actual *</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Nueva Contraseña *</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Confirmar Nueva Contraseña *</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                >
                  {changePassword.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4 text-emerald-400" />}
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
