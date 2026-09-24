// Libera el puerto del backend antes de arrancar NestJS.
// Se ejecuta automáticamente via los hooks `prestart*` de package.json
// para evitar errores EADDRINUSE por procesos node huérfanos.
import { execSync } from 'node:child_process';

const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);
const isWindows = process.platform === 'win32';

function pidsListeningOnPortWindows(port) {
  const out = execSync('netstat -ano', { encoding: 'utf8' });
  const pids = new Set();
  for (const line of out.split('\n')) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const localPort = Number(parts[1].split(':').pop());
    if (localPort === port) pids.add(parts[parts.length - 1]);
  }
  return [...pids];
}

function pidsListeningOnPortUnix(port) {
  try {
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

let pids;
try {
  pids = isWindows
    ? pidsListeningOnPortWindows(port)
    : pidsListeningOnPortUnix(port);
} catch {
  pids = [];
}

for (const pid of pids) {
  const n = Number(pid);
  // Nunca matar: este proceso, su padre, ni PIDs de sistema (0-4).
  if (!n || n === process.pid || n === process.ppid || n <= 4) continue;
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      process.kill(n, 'SIGKILL');
    }
    console.log(
      `[kill-port] Puerto ${port} ocupado por PID ${pid} — proceso terminado.`,
    );
  } catch {
    // El proceso ya no existe o no se pudo terminar; continuar igualmente.
  }
}
