import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { Header } from '../components/Header'
import { supabase } from '../integrations/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { usePageMeta } from '../hooks/usePageMeta'
import { Plus, Loader2 } from '@/components/AnimatedIcons'
import {
  ShieldAlert, Edit, Trash2,
  Image as ImageIcon, Users, BarChart3, Calendar,
  Download, Wifi, TrendingUp, ChevronDown, Check, Sparkles, X, Upload,
  Activity, LayoutGrid, type LucideIcon,
  ArrowUp, ArrowDown, Minus, RefreshCw, Clock, AlertTriangle,
  CheckCircle2, XCircle, Timer, FileText, Layers,
  UserPlus, User, KeyRound, Mail, GraduationCap, Hash,
} from '@/components/icons'
import { cn } from '../lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useTalleres } from '../hooks/useTalleres'
import type { Taller } from '../lib/talleres'
import { useAsistenciasAdmin, useEstadisticasAdmin, exportarCSV } from '../hooks/useAsistencias'
import type { AdminStats } from '../hooks/useAsistencias'
import { EstadoBadge } from '../components/asistencia/EstadoBadge'
import { ESTADO_CONFIG, type FiltroAsistencia, type TallerConInstructor, type Horario } from '../lib/types'
import { useRole } from '../hooks/useRole'
import { generateWorkshopDescription } from '../lib/ai'
import { registerInstructor } from '../services/authService'

export const Route = createLazyFileRoute('/admin')({
  component: AdminPanel,
})

type TabId = 'monitoreo' | 'metricas' | 'talleres' | 'instructores'

const TABS: { id: TabId; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'monitoreo', label: 'Asistencia RT', icon: Wifi, hint: 'Monitoreo en vivo' },
  { id: 'metricas', label: 'Dashboard', icon: BarChart3, hint: 'Indicadores' },
  { id: 'talleres', label: 'Talleres', icon: LayoutGrid, hint: 'Catálogo' },
  { id: 'instructores', label: 'Instructores', icon: UserPlus, hint: 'Alta de cuentas' },
]

function AdminPanel() {
  usePageMeta({
    title: 'Panel Administrativo',
    description: 'Panel de administración del Sistema Integral de Talleres Escolares. Gestiona talleres, alumnos y asistencias del CBTis No. 61.',
    canonicalPath: '/admin',
    noindex: true,
  })
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useRole(user?.id);
  const [activeTab, setActiveTab] = useState<TabId>('monitoreo');

  const [filtro, setFiltro] = useState<FiltroAsistencia>({
    fecha: new Date().toISOString().split('T')[0],
    taller_id: '',
    estado: ''
  });

  const { talleres, refreshTalleres } = useTalleres();
  const { asistencias, loading: loadingAsistencias } = useAsistenciasAdmin(filtro);
  const { stats, loading: loadingStats, refresh: refreshStats } = useEstadisticasAdmin();

  const [editingTaller, setEditingTaller] = useState<TallerConInstructor | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user && !roleLoading) {
      navigate({ to: '/auth' });
    }
  }, [user, roleLoading]);

  if (roleLoading) {
    return (
      <div className="admin-shell flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-white/50">
          <Loader2 className="animate-spin" />
          <span className="text-xs uppercase tracking-[0.2em]">Cargando permisos…</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-shell flex flex-col pt-4 pb-20 w-full min-h-screen">
        <div className="admin-card max-w-[1400px] mx-auto w-full px-4 md:px-0">
          <Header />
          <div className="py-24 text-center">
            <div className="inline-flex items-center justify-center size-20 rounded-full bg-[#721422]/15 border border-[#721422]/30 mb-6">
              <ShieldAlert className="size-10 text-[#721422]" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">Acceso Denegado</h2>
            <p className="text-white/50 mt-2 text-sm">No tienes permisos administrativos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell flex flex-col pt-4 pb-20 w-full min-h-screen">
      <div className="relative max-w-[1400px] mx-auto w-full px-4 md:px-0 z-10">
        <div className="admin-card admin-card-elevated p-5 md:p-7">
          <Header />

          <div className="pt-6 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.25em] text-[#721422] mb-3">
                  <span className="size-1.5 rounded-full bg-[#721422] admin-pulse" />
                  SITE — Control Administrativo
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  Panel de{' '}
                  <span className="text-wine-glow">Control</span>
                </h1>
                <p className="text-white/40 text-sm mt-2 max-w-md">
                  Gestiona asistencia, métricas y catálogo de talleres del CBTis No. 61.
                </p>
              </div>

              <div className="flex bg-black/40 p-1 rounded-xl border border-white/[0.06] self-start md:self-end">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      data-active={active}
                      className="admin-tab"
                    >
                      <Icon className="size-3.5" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto w-full space-y-6 px-4 md:px-0 mt-6 relative z-10">
        {activeTab === 'monitoreo' && (
          <div className="space-y-6 admin-fade-in">
            <div className="admin-card p-5 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
              <div>
                <label className="text-[10px] uppercase font-bold text-white/30 ml-1 mb-2 block tracking-widest">
                  Fecha de consulta
                </label>
                <input
                  type="date"
                  value={filtro.fecha}
                  onChange={(e) => setFiltro({...filtro, fecha: e.target.value})}
                  className="admin-input [color-scheme:dark]"
                />
              </div>

              <div className="relative">
                <label className="text-[10px] uppercase font-bold text-white/30 ml-1 mb-2 block tracking-widest">
                  Filtrar por Taller
                </label>
                <CustomSelect
                  options={[{ id: '', nombre: 'Todos los talleres' }, ...talleres]}
                  value={filtro.taller_id}
                  onChange={(val) => setFiltro({...filtro, taller_id: val})}
                  placeholder="Seleccionar taller"
                />
              </div>

              <div className="relative">
                <label className="text-[10px] uppercase font-bold text-white/30 ml-1 mb-2 block tracking-widest">
                  Estado
                </label>
                <CustomSelect
                  options={[
                    { id: '', nombre: 'Todos los estados' },
                    { id: 'presente', nombre: 'Presente' },
                    { id: 'ausente', nombre: 'Ausente' },
                    { id: 'retardo', nombre: 'Retardo' },
                    { id: 'justificado', nombre: 'Justificado' },
                  ]}
                  value={filtro.estado}
                  onChange={(val) => setFiltro({...filtro, estado: val as any})}
                  placeholder="Filtrar estado"
                />
              </div>

              <Button
                onClick={() => exportarCSV(asistencias)}
                variant="outline"
                className="h-[42px] border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-white text-[11px] font-bold uppercase tracking-widest"
              >
                <Download data-icon="inline-start" />
                Exportar
              </Button>
            </div>

            <div className="admin-card p-6 md:p-8 min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  <span className="relative flex items-center justify-center">
                    <span className="absolute size-3 rounded-full bg-emerald-400/40 admin-pulse" />
                    <span className="relative size-2 rounded-full bg-emerald-400" />
                  </span>
                  Monitoreo en Vivo
                </h2>
                <span className="admin-pill bg-white/5 text-white/40 border border-white/10">
                  <Activity className="size-3" />
                  {asistencias.length} registros
                </span>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-white/30 text-[10px] uppercase tracking-widest font-bold">
                      <th className="pb-3 px-3">Alumno</th>
                      <th className="pb-3 px-3">Taller</th>
                      <th className="pb-3 px-3">Fecha / Hora</th>
                      <th className="pb-3 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {loadingAsistencias ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-[#721422]" />
                        </td>
                      </tr>
                    ) : asistencias.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-24 text-center">
                          <div className="inline-flex flex-col items-center gap-3">
                            <div className="size-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                              <Calendar className="size-6 text-white/15" />
                            </div>
                            <p className="text-white/20 font-bold uppercase tracking-[0.3em] text-xs">
                              Sin registros
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      asistencias.map((a) => (
                        <tr key={a.id} className="admin-row group">
                          <td className="py-4 px-3 first:rounded-l-xl last:rounded-r-xl bg-white/[0.02] group-hover:bg-white/[0.04]">
                            <p className="font-semibold text-white">{a.profiles?.nombre}</p>
                            <p className="text-[10px] text-white/30 font-mono tracking-wider">
                              {a.profiles?.matricula}
                            </p>
                          </td>
                          <td className="py-4 px-3 bg-white/[0.02] group-hover:bg-white/[0.04] text-white/70">
                            {a.talleres?.nombre}
                          </td>
                          <td className="py-4 px-3 bg-white/[0.02] group-hover:bg-white/[0.04]">
                            <p className="text-white/60">{a.fecha}</p>
                            <p className="text-[10px] text-white/30 font-mono">
                              {a.hora?.slice(0, 5)} hrs
                            </p>
                          </td>
                          <td className="py-4 px-3 first:rounded-l-xl last:rounded-r-xl bg-white/[0.02] group-hover:bg-white/[0.04] text-center">
                            <EstadoBadge estado={a.estado} size="sm" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metricas' && (
          <StatsView stats={stats} loading={loadingStats} onRefresh={refreshStats} />
        )}
        {activeTab === 'talleres' && (
          <TalleresView
            talleres={talleres}
            onEdit={(t: TallerConInstructor & { horarios: Horario[] }) => { setEditingTaller(t); setShowModal(true); }}
            onNew={() => { setEditingTaller(null); setShowModal(true); }}
          />
        )}
        {activeTab === 'instructores' && (
          <InstructoresView
            talleres={talleres}
            onSuccess={refreshTalleres}
          />
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent
          showCloseButton={false}
          className="max-w-2xl w-full max-h-[90vh] overflow-hidden p-0 rounded-3xl border border-white/10 bg-transparent shadow-none"
          overlayClassName="bg-black/70 backdrop-blur-md"
        >
          <div className="admin-card admin-card-elevated overflow-y-auto custom-scrollbar max-h-[90vh]">
            <TallerModal
              taller={editingTaller}
              onClose={() => setShowModal(false)}
              onSuccess={() => {
                setShowModal(false);
                refreshTalleres();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TallerModal({ taller, onClose, onSuccess }: { taller: TallerConInstructor | null, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [formData, setFormData] = useState({
    nombre: taller?.nombre || '',
    categoria: taller?.categoria || 'DIFUSIÓN CULTURAL',
    lugar: taller?.lugar || '',
    instructor: taller?.instructor || '',
    cupo: taller?.cupo || 30,
    descripcion: taller?.descripcion || '',
    imagen_url: taller?.imagen_url || ''
  });
  const [horarios, setHorarios] = useState<Partial<Horario>[]>(taller?.horarios || []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(taller?.imagen_url || '');

  const addHorario = () => {
    setHorarios([...horarios, { dia: 'lunes', hora_inicio: '15:00', hora_fin: '16:00' }]);
  };

  const removeHorario = (index: number) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const updateHorario = (index: number, field: string, value: string) => {
    const newHorarios = [...horarios];
    newHorarios[index] = { ...newHorarios[index], [field]: value };
    setHorarios(newHorarios);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const generateAIDescription = async () => {
    if (!formData.nombre) {
      toast.error('Ingresa el nombre del taller primero');
      return;
    }
    setGeneratingAI(true);

    try {
      const newDesc = await generateWorkshopDescription(formData.nombre, formData.categoria);
      setFormData(prev => ({ ...prev, descripcion: newDesc }));
      toast.success('Descripción generada con éxito');
    } catch (error) {
      toast.error('Error al generar descripción');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrl = formData.imagen_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `talleres/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('taller-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('taller-images')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const workshopData = {
        ...formData,
        imagen_url: finalImageUrl
      };

      let tallerId = taller?.id;

      if (tallerId) {
        const { error } = await supabase
          .from('talleres')
          .update(workshopData)
          .eq('id', tallerId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('talleres')
          .insert([workshopData])
          .select()
          .single();
        if (error) throw error;
        tallerId = data.id;
      }

      await supabase.from('horarios').delete().eq('taller_id', tallerId);
      if (horarios.length > 0) {
        const { error: hError } = await supabase.from('horarios').insert(
          horarios.map(h => ({
            taller_id: tallerId,
            dia: h.dia,
            hora_inicio: h.hora_inicio,
            hora_fin: h.hora_fin
          }))
        );
        if (hError) throw hError;
      }

      toast.success(taller ? 'Taller actualizado' : 'Taller creado');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <span className="inline-flex items-center gap-2 admin-pill bg-[#721422]/15 text-[#721422] border border-[#721422]/30 mb-3">
            <span className="size-1.5 rounded-full bg-[#721422]" />
            {taller ? 'Editar' : 'Nuevo'}
          </span>
          <DialogTitle className="text-2xl font-extrabold text-white tracking-tight">
            {taller ? 'Editar Taller' : 'Nuevo Taller'}
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs uppercase tracking-widest font-bold mt-1">
            Configuración de catálogo
          </DialogDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-white/40 hover:text-white hover:bg-white/5"
        >
          <X />
          <span className="sr-only">Cerrar</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Nombre del Taller
            </label>
            <input
              required
              type="text"
              value={formData.nombre}
              onChange={e => setFormData({...formData, nombre: e.target.value})}
              className="admin-input"
              placeholder="Ej. Teatro, Futbol..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Categoría
            </label>
            <select
              value={formData.categoria}
              onChange={e => setFormData({...formData, categoria: e.target.value})}
              className="admin-input [color-scheme:dark] appearance-none cursor-pointer"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
                paddingRight: '2.5rem',
              }}
            >
              <option value="DIFUSIÓN CULTURAL">DIFUSIÓN CULTURAL</option>
              <option value="ACTIVIDADES CÍVICAS">ACTIVIDADES CÍVICAS</option>
              <option value="PROMOCIÓN DEPORTIVA — MATUTINO">PROMOCIÓN DEPORTIVA — MATUTINO</option>
              <option value="PROMOCIÓN DEPORTIVA — VESPERTINO">PROMOCIÓN DEPORTIVA — VESPERTINO</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Lugar
            </label>
            <input
              required
              type="text"
              value={formData.lugar}
              onChange={e => setFormData({...formData, lugar: e.target.value})}
              className="admin-input"
              placeholder="Ej. Gimnasio 1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Instructor
            </label>
            <input
              required
              type="text"
              value={formData.instructor}
              onChange={e => setFormData({...formData, instructor: e.target.value})}
              className="admin-input"
              placeholder="Nombre completo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Cupo Máximo
            </label>
            <input
              required
              type="number"
              value={formData.cupo}
              onChange={e => setFormData({...formData, cupo: parseInt(e.target.value) || 0})}
              className="admin-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Descripción
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={generateAIDescription}
              disabled={generatingAI}
              className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-widest text-[#721422] hover:bg-[#721422]/10 hover:text-[#a82a3e]"
            >
              {generatingAI ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              Generar con IA
            </Button>
          </div>
          <textarea
            rows={4}
            value={formData.descripcion}
            onChange={e => setFormData({...formData, descripcion: e.target.value})}
            className="admin-input resize-none"
            placeholder="Describe los objetivos y actividades del taller..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
            Imagen de Portada
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => document.getElementById('image-upload')?.click()}
              className="relative h-40 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#721422]/50 hover:bg-[#721422]/[0.04] transition-all group overflow-hidden"
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                    <Upload className="size-6 text-white mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Cambiar imagen</span>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="size-8 text-white/20 mb-2 group-hover:text-[#721422] transition-colors" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 group-hover:text-white/60">Subir imagen</span>
                </>
              )}
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 leading-relaxed">
                Recomendado: 800x400px o superior.<br />
                La imagen se mostrará en el catálogo.<br />
                Si no subes ninguna, se usará una por defecto.
              </p>
              <div className="space-y-2 mt-4">
                <label className="text-[9px] uppercase font-bold text-white/25 tracking-widest">O URL externa</label>
                <input
                  type="url"
                  value={formData.imagen_url}
                  onChange={e => {
                    setFormData({...formData, imagen_url: e.target.value});
                    setPreviewUrl(e.target.value);
                  }}
                  className="admin-input text-xs"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Horarios
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addHorario}
              className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-widest text-[#721422] hover:bg-[#721422]/10 hover:text-[#a82a3e]"
            >
              <Plus data-icon="inline-start" />
              Agregar
            </Button>
          </div>

          {horarios.length === 0 ? (
            <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-6 text-center text-white/25 text-[10px] font-bold uppercase tracking-widest">
              Sin horarios asignados
            </div>
          ) : (
            <div className="space-y-2">
              {horarios.map((h, i) => (
                <div
                  key={i}
                  className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
                >
                  <select
                    value={h.dia}
                    onChange={e => updateHorario(i, 'dia', e.target.value)}
                    className="admin-input [color-scheme:dark] md:w-36 text-xs h-9"
                  >
                    {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'].map(d => (
                      <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={h.hora_inicio}
                      onChange={e => updateHorario(i, 'hora_inicio', e.target.value)}
                      className="admin-input [color-scheme:dark] text-xs h-9 flex-1 min-w-0"
                    />
                    <span className="text-white/20 text-xs font-bold">a</span>
                    <input
                      type="time"
                      value={h.hora_fin}
                      onChange={e => updateHorario(i, 'hora_fin', e.target.value)}
                      className="admin-input [color-scheme:dark] text-xs h-9 flex-1 min-w-0"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeHorario(i)}
                    className="text-white/30 hover:text-red-400 hover:bg-red-500/10 ml-auto"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-white/5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 border-white/10 bg-transparent hover:bg-white/5 text-white/70 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="btn-wine-glow flex-[2] h-11 text-sm"
          >
            {loading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            {taller ? 'Guardar Cambios' : 'Crear Taller'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CustomSelect({
  options,
  value,
  onChange,
  placeholder
}: {
  options: any[],
  value: string,
  onChange: (val: string) => void,
  placeholder: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value) || options[0];

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    };
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "admin-input h-[42px] text-sm text-left flex items-center justify-between cursor-pointer",
          isOpen && "border-[#721422] bg-white/[0.05] shadow-[0_0_0_3px_var(--wine-glow-faint),0_0_18px_var(--wine-glow-soft)]"
        )}
      >
        <span className="truncate">{selectedOption?.nombre || placeholder}</span>
        <ChevronDown
          className={cn(
            "size-4 text-white/30 transition-transform duration-300",
            isOpen && "rotate-180 text-[#721422]"
          )}
        />
      </button>

      {isOpen && pos && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-[#0a0205] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,1),0_0_30px_var(--wine-glow-faint)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto custom-scrollbar"
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-4 py-2.5 text-sm text-left flex items-center justify-between transition-colors",
                value === opt.id
                  ? "bg-[#721422]/20 text-white font-semibold"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {opt.nombre}
              {value === opt.id && <Check className="size-3.5 text-[#721422]" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function StatsView({ stats, loading, onRefresh }: { stats: AdminStats; loading: boolean; onRefresh: () => void }) {
  const sesHoy = stats.sesionesHoy;
  const sesAyer = stats.sesionesAyer;
  const diff = sesHoy - sesAyer;
  const sesDeltaPct = sesAyer > 0 ? Math.round((diff / sesAyer) * 100) : (sesHoy > 0 ? 100 : 0);
  const sesTrend: 'up' | 'down' | 'flat' = sesHoy > sesAyer ? 'up' : sesHoy < sesAyer ? 'down' : 'flat';
  const asisDelta = stats.promedioAsistencia - stats.promedioSemanaPasada;

  return (
    <div className="space-y-6 admin-fade-in">
      <div className="admin-card admin-card-elevated p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.25em] text-emerald-400/80 mb-2">
            <span className="size-1.5 rounded-full bg-emerald-400 admin-pulse" />
            En vivo · últimos 7 días
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Panel de Control General
          </h2>
          <p className="text-white/40 text-sm mt-1 max-w-xl">
            Métricas agregadas de todos los talleres del CBTis No. 61.
            Se actualiza automáticamente con cada nuevo registro.
          </p>
        </div>
        <Button
          onClick={onRefresh}
          variant="outline"
          className="h-10 border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-white text-[10px] font-bold uppercase tracking-widest self-start md:self-auto"
        >
          <RefreshCw data-icon="inline-start" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Asistencia Global"
          value={`${stats.promedioAsistencia}%`}
          sub={`${asisDelta >= 0 ? '+' : ''}${asisDelta} pts vs semana anterior`}
          icon={TrendingUp}
          accent="text-emerald-400"
          glow="shadow-emerald-500/20"
          trend={asisDelta > 0 ? 'up' : asisDelta < 0 ? 'down' : 'flat'}
          loading={loading}
        />
        <KpiCard
          label="Sesiones Hoy"
          value={sesHoy}
          sub={`${sesDeltaPct >= 0 ? '+' : ''}${sesDeltaPct}% vs ayer`}
          icon={Wifi}
          accent="text-blue-400"
          glow="shadow-blue-500/20"
          trend={sesTrend}
          loading={loading}
        />
        <KpiCard
          label="Talleres Activos"
          value={stats.talleresActivos}
          sub="Disponibles en catálogo"
          icon={Users}
          accent="text-amber-400"
          glow="shadow-amber-500/20"
          trend="flat"
          loading={loading}
        />
        <KpiCard
          label="Total Registros"
          value={stats.totalSesiones}
          sub="Histórico acumulado"
          icon={Calendar}
          accent="text-[#d24a6b]"
          glow="shadow-[#721422]/30"
          trend="flat"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card p-6 md:p-7 lg:col-span-2">
          <ChartHeader
            title="Asistencia por día"
            subtitle="Últimos 7 días · desglose por estado"
          />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <StackedBarChart data={stats.asistenciaPorDia} />
          )}
        </div>

        <div className="admin-card p-6 md:p-7">
          <ChartHeader
            title="Distribución por estado"
            subtitle="Acumulado 7 días"
          />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <DonutChart distribution={stats.distribucionEstados} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="admin-card p-6 md:p-7">
          <ChartHeader
            title="Top Talleres"
            subtitle="Por registros en los últimos 7 días"
          />
          {loading ? (
            <ChartSkeleton />
          ) : stats.topTalleres.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="Sin actividad reciente"
              description="No se han registrado asistencias en los últimos 7 días."
            />
          ) : (
            <TopTalleresList items={stats.topTalleres} />
          )}
        </div>

        <div className="admin-card p-6 md:p-7">
          <ChartHeader
            title="Alumnos con más faltas"
            subtitle="Top 5 injustificadas"
          />
          {loading ? (
            <ChartSkeleton />
          ) : stats.alumnosConMasFaltas.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Sin faltas registradas"
              description="Todos los alumnos tienen asistencia limpia."
            />
          ) : (
            <TopFaltasList items={stats.alumnosConMasFaltas} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card p-6 md:p-7 lg:col-span-2">
          <ChartHeader
            title="Actividad reciente"
            subtitle="Últimos registros de asistencia"
          />
          {loading ? (
            <ChartSkeleton />
          ) : stats.actividadReciente.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Sin actividad"
              description="Aún no se han registrado asistencias."
            />
          ) : (
            <ActivityFeed items={stats.actividadReciente} />
          )}
        </div>

        <div className="admin-card p-6 md:p-7">
          <ChartHeader
            title="Por categoría"
            subtitle="Distribución de registros"
          />
          {loading ? (
            <ChartSkeleton />
          ) : stats.categorias.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Sin datos"
              description="No hay talleres con actividad reciente."
            />
          ) : (
            <CategoryBars items={stats.categorias} />
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  glow,
  trend,
  loading,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  accent: string;
  glow: string;
  trend: 'up' | 'down' | 'flat';
  loading: boolean;
}) {
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white/30';
  const trendBg =
    trend === 'up' ? 'bg-emerald-500/10 border-emerald-500/20' :
    trend === 'down' ? 'bg-red-500/10 border-red-500/20' :
    'bg-white/5 border-white/10';

  return (
    <div className={cn("admin-stat-card", glow)}>
      <div className="flex items-center justify-between mb-4">
        <div className="size-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/5">
          <Icon className={cn("size-5", accent)} />
        </div>
        {trend !== 'flat' && (
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
            trendColor, trendBg
          )}>
            <TrendIcon className="size-3" />
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1">
        {label}
      </p>
      <p className="text-3xl font-extrabold text-white tracking-tight">
        {loading ? <span className="inline-block w-20 h-8 rounded bg-white/[0.06] animate-pulse" /> : value}
      </p>
      <p className={cn("text-[10px] font-semibold mt-2 uppercase tracking-wider", trendColor)}>
        {sub}
      </p>
    </div>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-[10px] text-white/35 uppercase tracking-widest font-bold mt-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-40 rounded-xl bg-white/[0.03]" />
      <div className="flex gap-2">
        <div className="h-3 w-12 rounded bg-white/[0.05]" />
        <div className="h-3 w-12 rounded bg-white/[0.05]" />
        <div className="h-3 w-12 rounded bg-white/[0.05]" />
        <div className="h-3 w-12 rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="py-10 flex flex-col items-center text-center gap-3">
      <div className="size-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
        <Icon className="size-5 text-white/25" />
      </div>
      <div>
        <p className="text-sm font-bold text-white/70">{title}</p>
        <p className="text-xs text-white/35 mt-1 max-w-xs mx-auto">{description}</p>
      </div>
    </div>
  );
}

function StackedBarChart({ data }: { data: AdminStats['asistenciaPorDia'] }) {
  const maxTotal = Math.max(1, ...data.map(d => d.total));
  const hasData = data.some(d => d.total > 0);
  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin registros esta semana"
        description="No hay datos de asistencia para los últimos 7 días."
      />
    );
  }

  const COLORS = {
    presentes: '#10b981',
    retardos: '#f59e0b',
    ausentes: '#ef4444',
    justificados: '#3b82f6',
  };

  return (
    <div>
      <div className="flex items-end gap-2 md:gap-3 h-48 px-1">
        {data.map((d, i) => {
          const heightPct = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
          const presentesPct = d.total > 0 ? (d.presentes / d.total) * heightPct : 0;
          const retardosPct = d.total > 0 ? (d.retardos / d.total) * heightPct : 0;
          const ausentesPct = d.total > 0 ? (d.ausentes / d.total) * heightPct : 0;
          const justificadosPct = d.total > 0 ? (d.justificados / d.total) * heightPct : 0;

          return (
            <div key={d.fecha} className="flex-1 flex flex-col items-center gap-2 min-w-0 group">
              <div className="text-[10px] text-white/30 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                {d.total}
              </div>
              <div className="w-full h-full flex items-end">
                <div
                  className="dashboard-bar w-full rounded-t-md overflow-hidden flex flex-col-reverse bg-white/[0.04] dashboard-bar-grow"
                  style={{ height: `${heightPct}%`, animationDelay: `${i * 60}ms` }}
                  title={`${d.label}: ${d.presentes}P · ${d.retardos}R · ${d.ausentes}A · ${d.justificados}J`}
                >
                  {d.presentes > 0 && (
                    <div
                      className="dashboard-bar-segment"
                      style={{ height: `${(presentesPct / heightPct) * 100}%`, background: COLORS.presentes }}
                    />
                  )}
                  {d.retardos > 0 && (
                    <div
                      className="dashboard-bar-segment"
                      style={{ height: `${(retardosPct / heightPct) * 100}%`, background: COLORS.retardos }}
                    />
                  )}
                  {d.ausentes > 0 && (
                    <div
                      className="dashboard-bar-segment"
                      style={{ height: `${(ausentesPct / heightPct) * 100}%`, background: COLORS.ausentes }}
                    />
                  )}
                  {d.justificados > 0 && (
                    <div
                      className="dashboard-bar-segment"
                      style={{ height: `${(justificadosPct / heightPct) * 100}%`, background: COLORS.justificados }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-3 px-1">
        {data.map(d => (
          <div key={d.fecha} className="flex-1 text-center text-[10px] uppercase tracking-widest font-bold text-white/35">
            {d.label}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-white/5">
        {[
          { color: COLORS.presentes, label: 'Presentes' },
          { color: COLORS.retardos, label: 'Retardos' },
          { color: COLORS.ausentes, label: 'Ausentes' },
          { color: COLORS.justificados, label: 'Justificados' },
        ].map(legend => (
          <div key={legend.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: legend.color }} />
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">
              {legend.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ distribution }: { distribution: AdminStats['distribucionEstados'] }) {
  const total = distribution.presente + distribution.ausente + distribution.retardo + distribution.justificado;
  if (total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin datos"
        description="No hay registros en los últimos 7 días."
      />
    );
  }

  const segments = [
    { key: 'presente', value: distribution.presente, color: '#10b981', label: 'Presente' },
    { key: 'ausente', value: distribution.ausente, color: '#ef4444', label: 'Ausente' },
    { key: 'retardo', value: distribution.retardo, color: '#f59e0b', label: 'Retardo' },
    { key: 'justificado', value: distribution.justificado, color: '#3b82f6', label: 'Justificado' },
  ];

  const size = 180;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <svg width={size} height={size} className="donut-chart -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {segments.map(seg => {
            if (seg.value === 0) return null;
            const pct = seg.value / total;
            const dashLength = circumference * pct;
            const dashGap = circumference - dashLength;
            const offset = circumference * cumulative;
            cumulative += pct;
            return (
              <circle
                key={seg.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${dashGap}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="donut-segment"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[9px] uppercase tracking-widest font-bold text-white/35">Total</p>
          <p className="text-3xl font-extrabold text-white tracking-tight">{total}</p>
          <p className="text-[10px] text-white/40 mt-0.5">registros</p>
        </div>
      </div>

      <div className="w-full space-y-2">
        {segments.map(seg => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.key} className="flex items-center gap-3">
              <span
                className="size-2.5 rounded-sm shrink-0"
                style={{ background: seg.color }}
              />
              <span className="text-xs text-white/70 flex-1">{seg.label}</span>
              <span className="text-xs font-bold text-white font-mono">{seg.value}</span>
              <span className="text-[10px] text-white/30 font-mono w-9 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopTalleresList({ items }: { items: AdminStats['topTalleres'] }) {
  const maxRegistros = Math.max(1, ...items.map(i => i.registros));
  return (
    <div className="space-y-3">
      {items.map((t, idx) => {
        const widthPct = (t.registros / maxRegistros) * 100;
        const colorClass = idx === 0 ? 'from-amber-500/30 to-amber-500/5 border-amber-500/30' : 'from-[#721422]/25 to-transparent border-[#721422]/20';
        return (
          <div key={t.id} className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-white/30 font-mono w-5">
                  #{idx + 1}
                </span>
                <p className="text-sm font-semibold text-white truncate">{t.nombre}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-white/60 font-mono">{t.registros}</span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                  t.promedio >= 80 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                  t.promedio >= 60 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                  "text-red-400 bg-red-500/10 border-red-500/20"
                )}>
                  {t.promedio}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r border", colorClass, "dashboard-bar-grow")}
                style={{ width: `${widthPct}%`, animationDelay: `${idx * 80}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopFaltasList({ items }: { items: AdminStats['alumnosConMasFaltas'] }) {
  const maxFaltas = Math.max(1, ...items.map(i => i.faltas));
  return (
    <div className="space-y-2.5">
      {items.map((a, idx) => {
        const widthPct = (a.faltas / maxFaltas) * 100;
        return (
          <div key={a.alumno_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className={cn(
              "size-8 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 border",
              idx === 0
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-white/[0.04] text-white/40 border-white/10"
            )}>
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{a.nombre}</p>
              {a.matricula && (
                <p className="text-[10px] text-white/30 font-mono tracking-wider">{a.matricula}</p>
              )}
              <div className="h-1 mt-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500/80 to-red-500/30 dashboard-bar-grow"
                  style={{ width: `${widthPct}%`, animationDelay: `${idx * 80}ms` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-extrabold text-red-400 leading-none">{a.faltas}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mt-0.5">faltas</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityFeed({ items }: { items: AdminStats['actividadReciente'] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => {
        const meta = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG['sin_registro'];
        const Icon = item.estado === 'presente' ? CheckCircle2
          : item.estado === 'ausente' ? XCircle
          : item.estado === 'retardo' ? Timer
          : item.estado === 'justificado' ? FileText
          : AlertTriangle;
        const colorClass = item.estado === 'presente' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
          : item.estado === 'ausente' ? 'text-red-400 bg-red-500/10 border-red-500/20'
          : item.estado === 'retardo' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          : item.estado === 'justificado' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
          : 'text-white/30 bg-white/5 border-white/10';
        return (
          <div
            key={item.id}
            className="admin-row flex items-center gap-3 p-2.5 rounded-xl group"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className={cn(
              "size-9 rounded-xl flex items-center justify-center border shrink-0",
              colorClass
            )}>
              <Icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold text-white truncate">{item.alumno}</p>
                {item.matricula && (
                  <span className="text-[10px] text-white/30 font-mono tracking-wider shrink-0">
                    {item.matricula}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/40 truncate">
                <span className="text-white/60 font-medium">{item.taller}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-white/50 font-mono">{item.hora?.slice(0, 5) ?? '—'}</p>
              <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold mt-0.5">{meta.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryBars({ items }: { items: AdminStats['categorias'] }) {
  const maxTotal = Math.max(1, ...items.map(i => i.total));
  return (
    <div className="space-y-3.5">
      {items.map((cat, idx) => {
        const widthPct = (cat.total / maxTotal) * 100;
        return (
          <div key={cat.nombre}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-white/80 uppercase tracking-wider truncate pr-2">
                {cat.nombre}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-white/35 font-mono">
                  {cat.talleres} taller{cat.talleres !== 1 ? 'es' : ''}
                </span>
                <span className="text-xs font-bold text-white font-mono">{cat.total}</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#721422] via-[#a82a3e] to-[#d24a6b] dashboard-bar-grow"
                style={{ width: `${widthPct}%`, animationDelay: `${idx * 70}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TalleresView({ talleres, onEdit, onNew }: { talleres: (TallerConInstructor & { horarios: Horario[] })[], onEdit: (t: TallerConInstructor & { horarios: Horario[] }) => void, onNew: () => void }) {
  return (
    <div className="admin-card p-6 md:p-8 admin-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Gestión de Talleres</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
            {talleres.length} talleres registrados
          </p>
        </div>
        <Button
          onClick={onNew}
          className="btn-wine-glow h-10 px-5 text-sm"
        >
          <Plus data-icon="inline-start" />
          Nuevo Taller
        </Button>
      </div>

      {talleres.length === 0 ? (
        <div className="py-16 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="size-14 rounded-full bg-[#721422]/10 border border-[#721422]/20 flex items-center justify-center">
              <LayoutGrid className="size-6 text-[#721422]" />
            </div>
            <p className="text-white/40 text-sm">No hay talleres registrados aún</p>
            <Button onClick={onNew} className="btn-wine-glow mt-2 h-9 px-4 text-xs">
              <Plus data-icon="inline-start" />
              Crear el primero
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {talleres.map((t) => (
            <div
              key={t.id}
              className="admin-card group overflow-hidden"
            >
              <div className="p-5 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-[#721422]/40 transition-colors">
                    {t.imagen_url ? (
                      <img src={t.imagen_url} className="w-full h-full object-cover" alt={t.nombre} />
                    ) : (
                      <ImageIcon className="size-5 text-white/20" />
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(t)}
                      className="text-white/40 hover:text-white hover:bg-white/5"
                    >
                      <Edit />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        if (confirm(`¿Eliminar taller ${t.nombre}?`)) {
                          const { error } = await supabase.from('talleres').delete().eq('id', t.id);
                          if (error) toast.error('No se pudo eliminar el taller');
                          else {
                            toast.success('Taller eliminado');
                            window.location.reload();
                          }
                        }
                      }}
                      className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="admin-pill bg-[#721422]/10 text-[#d24a6b] border border-[#721422]/25">
                    {t.categoria}
                  </span>
                  <p className="text-white font-bold text-lg leading-tight group-hover:text-[#d24a6b] transition-colors">
                    {t.nombre}
                  </p>
                  <p className="text-[11px] text-white/40 font-medium">
                    {t.instructor}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Users className="size-3" />
                    <span className="text-[10px] font-bold">
                      {t.cupo} <span className="opacity-50">cupo</span>
                    </span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {t.horarios?.map((h, idx) => (
                      <div
                        key={idx}
                        className="size-6 rounded-full bg-white/10 border border-[#0a0205] flex items-center justify-center text-[8px] font-bold text-white uppercase"
                        title={`${h.dia}: ${h.hora_inicio}`}
                      >
                        {h.dia.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InstructoresView({ talleres, onSuccess }: { talleres: (Taller & { horarios: Horario[] })[], onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ nombre: string; email: string; taller: string } | null>(null);
  const initialTallerId = talleres[0]?.id ?? '';
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    matricula: '',
    taller_id: initialTallerId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.taller_id) {
      toast.error('Selecciona un taller');
      return;
    }
    setLoading(true);
    try {
      await registerInstructor(formData);
      const tallerAsignado = talleres.find(t => t.id === formData.taller_id);
      toast.success('Instructor creado y asignado al taller');
      setLastCreated({
        nombre: formData.nombre,
        email: formData.email,
        taller: tallerAsignado?.nombre ?? '—',
      });
      setFormData({
        nombre: '',
        email: '',
        password: '',
        matricula: '',
        taller_id: talleres.find(t => t.id !== formData.taller_id)?.id ?? '',
      });
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al crear el instructor');
    } finally {
      setLoading(false);
    }
  };

  const talleresSinAsignar = talleres;

  return (
    <div className="space-y-6 admin-fade-in">
      <div className="admin-card admin-card-elevated p-5 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.25em] text-[#d24a6b] mb-3">
            <span className="size-1.5 rounded-full bg-[#d24a6b] admin-pulse" />
            SITE — Alta de instructores
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Cuentas de <span className="text-wine-glow">Instructores</span>
          </h2>
          <p className="text-white/40 text-sm mt-2 max-w-xl">
            Da de alta las cuentas de los instructores del CBTis No. 61 y asígnalas a un taller.
            Solo el administrador tiene acceso a este módulo.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="admin-pill bg-[#721422]/10 text-[#d24a6b] border border-[#721422]/25">
            <UserPlus className="size-3" />
            {talleresSinAsignar.length} taller{talleresSinAsignar.length !== 1 ? 'es' : ''} sin instructor
          </span>
        </div>
      </div>

      {lastCreated && (
        <div className="admin-card p-5 border-emerald-500/30 bg-emerald-500/[0.04]">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Instructor creado</p>
              <p className="text-xs text-white/50 mt-0.5">
                <span className="text-white/80 font-semibold">{lastCreated.nombre}</span>
                {' · '}
                <span className="font-mono">{lastCreated.email}</span>
                {' · '}
                <span className="text-white/70">{lastCreated.taller}</span>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setLastCreated(null)}
              className="text-white/40 hover:text-white"
            >
              <X />
              <span className="sr-only">Cerrar</span>
            </Button>
          </div>
        </div>
      )}

      <div className="admin-card p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
                Nombre completo
              </label>
              <div className="relative">
                <User className="size-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  required
                  minLength={3}
                  type="text"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  className="admin-input pl-10"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
                Matrícula
              </label>
              <div className="relative">
                <Hash className="size-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  required
                  minLength={4}
                  type="text"
                  value={formData.matricula}
                  onChange={e => setFormData({ ...formData, matricula: e.target.value })}
                  className="admin-input pl-10"
                  placeholder="Matrícula del instructor"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="size-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="admin-input pl-10"
                placeholder="instructor@cbtis61.edu.mx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Contraseña inicial
            </label>
            <div className="relative">
              <KeyRound className="size-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                required
                minLength={6}
                type="text"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="admin-input pl-10 font-mono"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <p className="text-[10px] text-white/30 ml-1">
              Compártela con el instructor de forma segura. Podrá cambiarla al iniciar sesión.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
              Asignar a taller
            </label>
            {talleresSinAsignar.length === 0 ? (
              <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-5 text-center">
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                  Todos los talleres ya tienen instructor
                </p>
              </div>
            ) : (
              <div className="relative">
                <LayoutGrid className="size-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  required
                  value={formData.taller_id}
                  onChange={e => setFormData({ ...formData, taller_id: e.target.value })}
                  className="admin-input pl-10 [color-scheme:dark] appearance-none cursor-pointer"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem',
                    paddingRight: '2.5rem',
                  }}
                >
                  {talleresSinAsignar.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} — {t.categoria}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 border-t border-white/5">
            <Button
              type="submit"
              disabled={loading || talleresSinAsignar.length === 0}
              className="btn-wine-glow h-11 text-sm w-full sm:w-auto sm:px-8"
            >
              {loading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <UserPlus data-icon="inline-start" />
              )}
              Crear Instructor
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
