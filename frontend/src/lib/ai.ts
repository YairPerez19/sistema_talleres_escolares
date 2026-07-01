
/**
 * Generador de descripciones inteligentes para talleres.
 * Puede funcionar con una API Key de Gemini o con un motor de plantillas avanzado.
 */

const TOPICS: Record<string, string[]> = {
  deportes: ['futbol', 'basquetbol', 'voleibol', 'natacion', 'atletismo', 'karate', 'taekwondo', 'ajedrez', 'gym', 'entrenamiento'],
  arte: ['teatro', 'danza', 'dibujo', 'pintura', 'musica', 'canto', 'guitarra', 'piano', 'fotografia', 'artesanias', 'manualidades'],
  academico: ['ingles', 'matematicas', 'ciencia', 'robotica', 'programacion', 'lectura', 'oratoria', 'debate']
};

const TEMPLATES: Record<string, string> = {
  deportes: "¡Súmate al taller de {nombre}! Un espacio donde la disciplina, el esfuerzo físico y el compañerismo son los protagonistas. En este taller de {categoria}, los estudiantes desarrollarán técnicas avanzadas de {nombre}, mejorando su condición física y aprendiendo el valor del trabajo en equipo bajo la supervisión de expertos.",
  arte: "Explora tu lado creativo en nuestro taller de {nombre}. Diseñado para fomentar la expresión artística en el área de {categoria}, este curso permitirá a los alumnos descubrir sus talentos en {nombre}. Ideal para quienes buscan desarrollar sensibilidad estética y habilidades prácticas en un ambiente inspirador.",
  academico: "Potencia tus conocimientos en el taller de {nombre}. Enfocado en el desarrollo intelectual y técnico dentro de {categoria}, este espacio ofrece herramientas prácticas para dominar {nombre}. Perfecto para estudiantes que buscan destacar y adquirir competencias clave para su futuro académico.",
  default: "El taller de {nombre} es una excelente oportunidad para que los estudiantes del CBTis No. 61 exploren nuevas áreas de conocimiento. Enmarcado en la categoría de {categoria}, este taller busca el desarrollo integral a través de sesiones dinámicas dedicadas a {nombre}."
};

export async function generateWorkshopDescription(nombre: string, categoria: string): Promise<string> {
  // Intentar usar API de Gemini si existe la key
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Genera una descripción profesional y motivadora de máximo 60 palabras para un taller escolar llamado "${nombre}" de la categoría "${categoria}" para alumnos de bachillerato (CBTis). Habla específicamente de los beneficios de practicar ${nombre}.` }]
          }]
        })
      });
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Fallback al motor local
    }
  }

  // Motor local inteligente
  const lowerNombre = nombre.toLowerCase();
  let selectedCategory = 'default';

  for (const [cat, keywords] of Object.entries(TOPICS)) {
    if (keywords.some(k => lowerNombre.includes(k))) {
      selectedCategory = cat;
      break;
    }
  }

  // Si no encuentra por nombre, probar por la categoría seleccionada en el form
  if (selectedCategory === 'default') {
    if (categoria.includes('DEPORTIVA')) selectedCategory = 'deportes';
    else if (categoria.includes('CULTURAL')) selectedCategory = 'arte';
  }

  const template = TEMPLATES[selectedCategory];
  return template
    .replace(/{nombre}/g, nombre)
    .replace(/{categoria}/g, categoria.toLowerCase());
}
