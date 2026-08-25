import { spawn } from 'node:child_process';

spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.js'], { stdio: 'inherit' }),
const children = [
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

for (const child of children) {
  child.on('error', error => { console.error(error); stop(1); });
  child.on('exit', code => { if (!stopping && code) stop(code); });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
