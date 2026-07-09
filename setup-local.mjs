import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obtener la IP local de la red Wi-Fi o Ethernet
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Filtrar IPv4 y descartar localhost (127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const ip = getLocalIp();

// Actualizar el archivo .env del frontend
const envPath = path.join(__dirname, 'frontend', '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const backendUrl = `http://${ip}:3000`;

if (envContent.includes('VITE_API_URL=')) {
  envContent = envContent.replace(/VITE_API_URL=.*/g, `VITE_API_URL=${backendUrl}/api`);
} else {
  envContent += `\nVITE_API_URL=${backendUrl}/api\n`;
}

fs.writeFileSync(envPath, envContent);

console.log('\n======================================================');
console.log('✅ SE HA CONFIGURADO LA RED LOCAL (WI-FI)');
console.log('======================================================');
console.log(`Tu computadora y tu teléfono deben estar en el mismo Wi-Fi.\n`);
console.log(`1️⃣  Abre esto en tu teléfono para ver la app:`);
console.log(`👉  http://${ip}:5173\n`);
console.log(`(Nota: El backend fue configurado automáticamente en: ${backendUrl})`);
console.log('======================================================\n');
