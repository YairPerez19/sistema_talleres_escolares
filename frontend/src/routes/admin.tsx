import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { Header } from '../components/Header'
import { supabase } from '../integrations/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { 
  ShieldAlert, Plus, Edit, Trash2, 
  Image as ImageIcon, Loader2, Users, BarChart3, Calendar, 
  Download, Wifi, TrendingUp, ChevronDown, Check, Sparkles, X, Upload
} from '@/components/AnimatedIcons'
import { cn } from '../lib/utils'
import { useTalleres } from '../hooks/useTalleres'
import { useAsistenciasAdmin, useEstadisticasAdmin, exportarCSV } from '../hooks/useAsistencias'
import { EstadoBadge } from '../components/asistencia/EstadoBadge'
import type { FiltroAsistencia } from '../lib/types'
import { useRole } from '../hooks/useRole'
import { generateWorkshopDescription } from '../lib/ai'

export const Route = createFileRoute('/admin')({
  component: AdminPanel,
})

function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useRole(user?.id);
  const [activeTab, setActiveTab] = useState<'monitoreo' | 'metricas' | 'talleres'>('monitoreo');
  
  const [filtro, setFiltro] = useState<FiltroAsistencia>({
    fecha: new Date().toISOString().split('T')[0],
    taller_id: '',
    estado: ''
  });

  const { talleres, refreshTalleres } = useTalleres();
  const { asistencias, loading: loadingAsistencias } = useAsistenciasAdmin(filtro);
  const { stats, loading: loadingStats } = useEstadisticasAdmin();

  const [editingTaller, setEditingTaller] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user && !roleLoading) {
      navigate({ to: '/auth' });
    }
  }, [user, roleLoading]);

  if (roleLoading) return <div className="pt-20 text-center text-white/50">Cargando permisos...</div>;

  if (!isAdmin) {
    return (
      <div className="flex flex-col pt-4 pb-20 w-full">
        <div className="glass-card mb-10 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto">
          <Header />
          <div className="py-20 text-center text-white">
            <ShieldAlert size={64} className="mx-auto mb-4 text-primary-glow opacity-50" />
            <h2 className="text-3xl font-bold">Acceso Denegado</h2>
            <p className="text-white/50 mt-2">No tienes permisos administrativos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 pb-20 w-full">
      <div className="glass-card mb-10 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto">
        <Header />
        <div className="pt-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary-glow mb-2 block">SITE — Control Administrativo</span>
            <h1 className="text-4xl font-extrabold text-white">Panel de Control</h1>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 self-start">
            {[
              { id: 'monitoreo', label: 'Asistencia RT', icon: <Wifi size={14} /> },
              { id: 'metricas', label: 'Estadísticas', icon: <BarChart3 size={14} /> },
              { id: 'talleres', label: 'Talleres', icon: <Calendar size={14} /> },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                  activeTab === tab.id ? "bg-primary text-white shadow-lg" : "text-white/50 hover:text-white"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto w-full space-y-8 px-4 md:px-0">
        {activeTab === 'monitoreo' && (
          <div className="space-y-6">
            {/* CORRECCIÓN: Se añadió z-30 y relative para que el menú flote sobre la tabla */}
            <div className="glass-card p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-6 border border-white/5 items-end relative z-30">
              <div>
                <label className="text-[10px] uppercase font-black text-white/30 ml-1 mb-2 block">Fecha de consulta</label>
                <input 
                  type="date" 
                  value={filtro.fecha} 
                  onChange={(e) => setFiltro({...filtro, fecha: e.target.value})} 
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40 [color-scheme:dark]" 
                />
              </div>

              <div className="relative">
                <label className="text-[10px] uppercase font-black text-white/30 ml-1 mb-2 block">Filtrar por Taller</label>
                <CustomSelect 
                  options={[{ id: '', nombre: 'Todos los talleres' }, ...talleres]}
                  value={filtro.taller_id}
                  onChange={(val) => setFiltro({...filtro, taller_id: val})}
                  placeholder="Seleccionar taller"
                />
              </div>

              <div className="relative">
                <label className="text-[10px] uppercase font-black text-white/30 ml-1 mb-2 block">Estado</label>
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

              <button 
                onClick={() => exportarCSV(asistencias)} 
                className="bg-white/5 hover:bg-white/10 text-white h-[42px] px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <Download size={14} /> Exportar
              </button>
            </div>

            {/* TABLA: Ahora con z-10 para quedar debajo de los filtros */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 min-h-[400px] relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Monitoreo en Vivo
                </h2>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                  {asistencias.length} REGISTROS ENCONTRADOS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/30 text-[10px] uppercase tracking-widest font-black">
                      <th className="pb-4 px-2">Alumno</th>
                      <th className="pb-4 px-2">Taller</th>
                      <th className="pb-4 px-2">Fecha / Hora</th>
                      <th className="pb-4 px-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {loadingAsistencias ? (
                      <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary-glow" size={32} /></td></tr>
                    ) : asistencias.length === 0 ? (
                      <tr><td colSpan={4} className="py-32 text-center text-white/10 font-black uppercase tracking-[0.3em] text-lg">Sin registros</td></tr>
                    ) : (
                      asistencias.map((a) => (
                        <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                          <td className="py-5 px-2">
                            <p className="font-bold text-white group-hover:text-primary-glow transition-colors">{a.profiles?.nombre}</p>
                            <p className="text-[10px] text-white/30 font-mono">{a.profiles?.matricula}</p>
                          </td>
                          <td className="py-5 px-2 text-white/70 font-medium">{a.talleres?.nombre}</td>
                          <td className="py-5 px-2">
                            <p className="text-white/60">{a.fecha}</p>
                            <p className="text-[10px] text-white/20">{a.hora?.slice(0,5)} hrs</p>
                          </td>
                          <td className="py-5 px-2 text-center"><EstadoBadge estado={a.estado} size="sm" /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metricas' && <StatsView stats={stats} loading={loadingStats} />}
        {activeTab === 'talleres' && (
          <TalleresView 
            talleres={talleres} 
            onEdit={(t: any) => { setEditingTaller(t); setShowModal(true); }} 
            onNew={() => { setEditingTaller(null); setShowModal(true); }} 
          />
        )}
      </div>

      {showModal && (
        <TallerModal 
          taller={editingTaller} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            refreshTalleres();
          }}
        />
      )}
    </div>
  )
}

function TallerModal({ taller, onClose, onSuccess }: { taller: any, onClose: () => void, onSuccess: () => void }) {
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
  const [horarios, setHorarios] = useState<any[]>(taller?.horarios || []);
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

      // Subir imagen si existe una nueva
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

      // Actualizar horarios
      // Primero borrar los actuales
      await supabase.from('horarios').delete().eq('taller_id', tallerId);
      // Luego insertar los nuevos
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border border-white/10 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] custom-scrollbar">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white">{taller ? 'Editar Taller' : 'Nuevo Taller'}</h2>
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold mt-1">Configuración de catálogo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/30 ml-1">Nombre del Taller</label>
              <input 
                required
                type="text" 
                value={formData.nombre}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Ej. Teatro, Futbol..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/30 ml-1">Categoría</label>
              <select 
                value={formData.categoria}
                onChange={e => setFormData({...formData, categoria: e.target.value})}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="DIFUSIÓN CULTURAL">DIFUSIÓN CULTURAL</option>
                <option value="ACTIVIDADES CÍVICAS">ACTIVIDADES CÍVICAS</option>
                <option value="PROMOCIÓN DEPORTIVA — MATUTINO">PROMOCIÓN DEPORTIVA — MATUTINO</option>
                <option value="PROMOCIÓN DEPORTIVA — VESPERTINO">PROMOCIÓN DEPORTIVA — VESPERTINO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/30 ml-1">Lugar</label>
              <input 
                required
                type="text" 
                value={formData.lugar}
                onChange={e => setFormData({...formData, lugar: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Ej. Gimnasio 1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/30 ml-1">Instructor</label>
              <input 
                required
                type="text" 
                value={formData.instructor}
                onChange={e => setFormData({...formData, instructor: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-white/30 ml-1">Cupo Máximo</label>
              <input 
                required
                type="number" 
                value={formData.cupo}
                 onChange={e => setFormData({...formData, cupo: parseInt(e.target.value) || 0})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-black text-white/30 ml-1">Descripción</label>
              <button 
                type="button"
                onClick={generateAIDescription}
                disabled={generatingAI}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-primary-glow hover:brightness-125 transition-all disabled:opacity-50"
              >
                {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generar con IA
              </button>
            </div>
            <textarea 
              rows={4}
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors resize-none"
              placeholder="Describe los objetivos y actividades del taller..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/30 ml-1">Imagen de Portada</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => document.getElementById('image-upload')?.click()}
                className="relative h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-white/[0.07] transition-all group overflow-hidden"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Upload size={24} className="text-white mb-2" />
                      <span className="text-[10px] font-black uppercase text-white">Cambiar imagen</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon size={32} className="text-white/20 mb-2 group-hover:text-primary-glow transition-colors" />
                    <span className="text-[10px] font-black uppercase text-white/30">Subir imagen</span>
                  </>
                )}
                <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Recomendado: 800x400px o superior. <br />
                  La imagen se mostrará en el catálogo de estudiantes. <br />
                  Si no subes ninguna, se usará una por defecto según el nombre.
                </p>
                <div className="space-y-2 mt-4">
                  <label className="text-[8px] uppercase font-black text-white/20">O URL externa</label>
                  <input 
                    type="url" 
                    value={formData.imagen_url}
                    onChange={e => {
                      setFormData({...formData, imagen_url: e.target.value});
                      setPreviewUrl(e.target.value);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-black text-white/30 ml-1">Horarios</label>
              <button 
                type="button"
                onClick={addHorario}
                className="text-[10px] font-black uppercase text-primary-glow flex items-center gap-1 hover:brightness-125 transition-all"
              >
                <Plus size={12} /> Agregar Horario
              </button>
            </div>
            
            {horarios.length === 0 ? (
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center text-white/20 text-[10px] font-bold uppercase tracking-widest">
                Sin horarios asignados
              </div>
            ) : (
              <div className="space-y-3">
                {horarios.map((h, i) => (
                  <div key={i} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 animate-in slide-in-from-left-2 duration-300">
                    <select 
                      value={h.dia}
                      onChange={e => updateHorario(i, 'dia', e.target.value)}
                      className="bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    >
                      {['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'].map(d => (
                        <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        value={h.hora_inicio}
                        onChange={e => updateHorario(i, 'hora_inicio', e.target.value)}
                        className="bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
                      />
                      <span className="text-white/20 text-xs">a</span>
                      <input 
                        type="time" 
                        value={h.hora_fin}
                        onChange={e => updateHorario(i, 'hora_fin', e.target.value)}
                        className="bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white [color-scheme:dark]"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeHorario(i)}
                      className="ml-auto p-2 text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] px-6 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : (taller ? 'Guardar Cambios' : 'Crear Taller')}
            </button>
          </div>
        </form>
      </div>
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(o => o.id === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white text-left",
          "flex items-center justify-between hover:border-primary/40 transition-all outline-none",
          isOpen && "border-primary/60 ring-2 ring-primary/10"
        )}
      >
        <span className="truncate">{selectedOption?.nombre || placeholder}</span>
        <ChevronDown size={16} className={cn("text-white/30 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[999] bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto custom-scrollbar">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-4 py-3 text-sm text-left flex items-center justify-between transition-colors",
                value === opt.id ? "bg-primary/20 text-primary-glow font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {opt.nombre}
              {value === opt.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsView({ stats }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
      {[
        { label: 'Asistencia Global', value: `${stats.promedioAsistencia}%`, icon: <TrendingUp className="text-emerald-400" /> },
        { label: 'Sesiones Totales', value: stats.totalSesiones, icon: <Calendar className="text-primary-glow" /> },
        { label: 'Registros Hoy', value: stats.sesionesHoy, icon: <Wifi className="text-blue-400" /> },
        { label: 'Talleres Activos', value: stats.talleresActivos, icon: <Users className="text-amber-400" /> },
      ].map((s, i) => (
        <div key={i} className="glass-card p-6 rounded-3xl border border-white/5">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">{s.icon}</div>
          <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">{s.label}</p>
          <p className="text-3xl font-black text-white">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

function TalleresView({ talleres, onEdit, onNew }: any) {
  return (
    <div className="glass-card p-8 rounded-[2.5rem] border border-white/5">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Gestión de Talleres</h2>
          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">{talleres.length} Talleres registrados</p>
        </div>
        <button onClick={onNew} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-[1.05] transition-all shadow-lg shadow-primary/20"><Plus size={18}/> Nuevo Taller</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {talleres.map((t: any) => (
          <div key={t.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-5 flex flex-col group hover:border-primary/40 transition-all relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                {t.imagen_url ? (
                  <img src={t.imagen_url} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-white/20" />
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(t)} className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"><Edit size={16}/></button>
                <button 
                  onClick={async () => {
                    if (confirm(`¿Eliminar taller ${t.nombre}?`)) {
                      const { error } = await supabase.from('talleres').delete().eq('id', t.id);
                      if (error) toast.error('No se pudo eliminar el taller');
                      else {
                        toast.success('Taller eliminado');
                        window.location.reload(); // Simple refresh for now
                      }
                    }
                  }} 
                  className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                ><Trash2 size={16}/></button>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary-glow px-2 py-0.5 bg-primary/10 rounded-full inline-block mb-1">{t.categoria}</span>
              <p className="text-white font-bold text-lg group-hover:text-primary-glow transition-colors">{t.nombre}</p>
              <p className="text-[10px] text-white/40 font-medium">{t.instructor}</p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white/40">
                <Users size={12} />
                <span className="text-[10px] font-black">{t.cupo} <span className="opacity-50">CUPO</span></span>
              </div>
              <div className="flex -space-x-2">
                {t.horarios?.map((h: any, idx: number) => (
                  <div key={idx} className="w-6 h-6 rounded-full bg-white/10 border border-[#121212] flex items-center justify-center text-[8px] font-black text-white uppercase" title={`${h.dia}: ${h.hora_inicio}`}>
                    {h.dia.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
