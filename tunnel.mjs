import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Iniciando túneles locales con localtunnel...');

const startTunnel = (port, name, onUrl) => {
  const lt = spawn('npx', ['-y', 'localtunnel', '--port', port.toString()], { shell: true });
  
  lt.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output.includes('your url is: ')) {
      const url = output.replace('your url is: ', '').trim();
      console.log(`✅ [${name}] Túnel creado en: ${url}`);
      if (onUrl) onUrl(url);
    } else {
      console.log(`[${name}] ${output}`);
    }
  });
  
  lt.stderr.on('data', (data) => {
    console.error(`❌ [${name} Error] ${data.toString().trim()}`);
  });

  lt.on('close', (code) => {
    console.log(`[${name}] Túnel cerrado con código ${code}`);
  });

  return lt;
};

// 1. Iniciar el túnel del Backend
startTunnel(3000, 'Backend API', (backendUrl) => {
  // 2. Guardar el URL del backend en el .env del frontend
  const envPath = path.join(__dirname, 'frontend', '.env');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Reemplazar o añadir VITE_API_URL
  if (envContent.includes('VITE_API_URL=')) {
    envContent = envContent.replace(/VITE_API_URL=.*/g, `VITE_API_URL=${backendUrl}/api`);
  } else {
    envContent += `\nVITE_API_URL=${backendUrl}/api\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`🔧 [Config] Actualizado VITE_API_URL en frontend/.env a ${backendUrl}/api`);

  // 3. Iniciar el túnel del Frontend
  console.log('⏳ Esperando 2 segundos para asegurar que Vite recarga el .env...');
  setTimeout(() => {
    startTunnel(5173, 'Frontend App', (frontendUrl) => {
      console.log('\n======================================================');
      console.log('🎉 ¡LISTO PARA COMPARTIR EN TU TELÉFONO!');
      console.log(`📱 URL de la Aplicación: ${frontendUrl}`);
      console.log('======================================================\n');
      console.log('(Presiona Ctrl+C en esta terminal para cerrar los túneles)');
    });
  }, 2000);
});
