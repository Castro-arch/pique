// Configura as variáveis de ambiente do Convex Auth (chaves JWT + modo dev de e-mail).
// Uso: node scripts/setup-auth.mjs
// Para o backend local anônimo: CONVEX_AGENT_MODE=anonymous node scripts/setup-auth.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

const keys = await generateKeyPair('RS256', { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, ' ');
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...(await exportJWK(keys.publicKey)) }] });

const convexBin = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url));

function setEnv(name, value) {
  // Node direto, sem shell: o valor chega intacto, sem problemas de aspas no Windows.
  const result = spawnSync(process.execPath, [convexBin, 'env', 'set', name, '--', value], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (result.status !== 0) {
    console.error(`Falha ao definir ${name}.`);
    process.exit(1);
  }
  console.log(`ok  ${name}`);
}

setEnv('JWT_PRIVATE_KEY', privateKey);
setEnv('JWKS', jwks);
setEnv('SITE_URL', 'http://localhost:8081');
// Só dev: o código de login aparece nos logs do Convex em vez de ser enviado por e-mail.
setEnv('AUTH_DEV_LOG_CODES', 'true');
