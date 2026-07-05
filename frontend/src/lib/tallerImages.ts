const unsplashParams = 'auto=format&fit=crop&q=85&w=800';

const tallerImageMap: Record<string, string> = {
  teatro: `https://images.unsplash.com/photo-1503095396549-807759245b35?${unsplashParams}`,
  danza: `https://images.unsplash.com/photo-1547153760-18fc86324498?${unsplashParams}`,
  ajedrez: `https://images.unsplash.com/photo-1580541832626-2a7131ee809f?${unsplashParams}`,
  oratoria: `https://images.unsplash.com/photo-1475721027785-f74eccf877e2?${unsplashParams}`,
  'oratoria y declamación': `https://images.unsplash.com/photo-1475721027785-f74eccf877e2?${unsplashParams}`,
  rondalla: `https://images.unsplash.com/photo-1510915361894-db8b60106cb1?${unsplashParams}`,
  canción: `https://images.unsplash.com/photo-1516280440614-37939bbacd81?${unsplashParams}`,
  cancion: `https://images.unsplash.com/photo-1516280440614-37939bbacd81?${unsplashParams}`,
  dibujo: `https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?${unsplashParams}`,
  fotografía: `https://images.unsplash.com/photo-1452587925148-ce544e77e70d?${unsplashParams}`,
  fotografia: `https://images.unsplash.com/photo-1452587925148-ce544e77e70d?${unsplashParams}`,
  artesanías: `https://images.unsplash.com/photo-1610701596007-11502861dcfa?${unsplashParams}`,
  artesanias: `https://images.unsplash.com/photo-1610701596007-11502861dcfa?${unsplashParams}`,
  'banda de guerra': `https://images.unsplash.com/photo-1465847899084-d164df4dedc6?${unsplashParams}`,
  escolta: `https://images.unsplash.com/photo-1542385151-efd9000785a0?${unsplashParams}`,
  banderas: `https://images.unsplash.com/photo-1542385151-efd9000785a0?${unsplashParams}`,
  'futbol varonil': `https://images.unsplash.com/photo-1574629810360-7efbbe195018?${unsplashParams}`,
  'futbol femenil': `https://images.unsplash.com/photo-1579952363873-27f3bade9f55?${unsplashParams}`,
  futbol: `https://images.unsplash.com/photo-1574629810360-7efbbe195018?${unsplashParams}`,
  fútbol: `https://images.unsplash.com/photo-1574629810360-7efbbe195018?${unsplashParams}`,
  basquetbol: `https://images.unsplash.com/photo-1546519638-68e109498ffc?${unsplashParams}`,
  'basquetbol vesp.': `https://images.unsplash.com/photo-1546519638-68e109498ffc?${unsplashParams}`,
  básquetbol: `https://images.unsplash.com/photo-1546519638-68e109498ffc?${unsplashParams}`,
  voleibol: `https://images.unsplash.com/photo-1592656094267-764a45160876?${unsplashParams}`,
  handball: `https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?${unsplashParams}`,
  atletismo: `https://images.unsplash.com/photo-1551773188-0801da12ddae?${unsplashParams}`,
  taekwondo: `https://images.unsplash.com/photo-1555597673-b21d5c935865?${unsplashParams}`,
  baile: `https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?${unsplashParams}`,
};

export function imagenDeTaller(nombre: string): string {
  const key = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (tallerImageMap[key]) return tallerImageMap[key];

  for (const [mapKey, url] of Object.entries(tallerImageMap)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return url;
  }

  return `https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?${unsplashParams}`;
}
