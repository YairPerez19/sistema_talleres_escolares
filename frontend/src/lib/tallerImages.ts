import teatroImg from '../assets/talleres/teatro.jpg';
import danzaImg from '../assets/talleres/danza.jpg';
import ajedrezImg from '../assets/talleres/ajedrez.jpg';
import oratoriaImg from '../assets/talleres/oratoria_y_declamacion.jpg';
import rondallaImg from '../assets/talleres/rondalla.jpg';
import cancionImg from '../assets/talleres/cancion.jpg';

const localMap: Record<string, string> = {
  teatro: teatroImg,
  danza: danzaImg,
  ajedrez: ajedrezImg,
  'oratoria y declamación': oratoriaImg,
  rondalla: rondallaImg,
  canción: cancionImg,
};

const unsplashMap: Record<string, string> = {
  dibujo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800',
  fotografía: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
  artesanías: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=800',
  'banda de guerra': 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=800',
  escolta: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&q=80&w=800',
  banderas: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&q=80&w=800',
  'futbol varonil': 'https://images.unsplash.com/photo-1518605368461-1ee06774edab?auto=format&fit=crop&q=80&w=800',
  'futbol femenil': 'https://images.unsplash.com/photo-1518605368461-1ee06774edab?auto=format&fit=crop&q=80&w=800',
  futbol: 'https://images.unsplash.com/photo-1518605368461-1ee06774edab?auto=format&fit=crop&q=80&w=800',
  basquetbol: 'https://images.unsplash.com/photo-1519861531473-9200260763bf?auto=format&fit=crop&q=80&w=800',
  'basquetbol vesp.': 'https://images.unsplash.com/photo-1519861531473-9200260763bf?auto=format&fit=crop&q=80&w=800',
  voleibol: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=800',
  handball: 'https://images.unsplash.com/photo-1558066524-77e8be3426ae?auto=format&fit=crop&q=80&w=800',
  atletismo: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=800',
  taekwondo: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=800',
  baile: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800',
};

export function imagenDeTaller(nombre: string): string {
  const key = nombre.toLowerCase().trim();
  
  // 1. Intentar imagen local de IA si existe
  if (localMap[key]) return localMap[key];
  
  // 2. Usar Unsplash con URL específica
  if (unsplashMap[key]) return unsplashMap[key];
  
  // Fallback
  return 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80&w=800';
}
