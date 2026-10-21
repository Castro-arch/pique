// Teste de fumaça: login por código de e-mail + perfil, contra o backend local.
// Uso: CONVEX_AGENT_MODE=anonymous node scripts/smoke-auth.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { ConvexHttpClient } from 'convex/browser';

import { api } from '../convex/_generated/api.js';

const url = process.env.EXPO_PUBLIC_CONVEX_URL ?? 'http://127.0.0.1:3210';
const convexBin = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url));
const email = `smoke+${Date.now()}@example.com`;
const username = `smoke_${Date.now().toString(36)}`.slice(0, 20);

const client = new ConvexHttpClient(url);

function check(label, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` (${extra})` : ''}`);
  if (!ok) process.exit(1);
}

function readCodeFromLogs() {
  // `convex logs` segue o stream e não termina sozinho: o timeout encerra e devolve o que já saiu.
  const out = spawnSync(process.execPath, [convexBin, 'logs', '--history', '30'], {
    encoding: 'utf8',
    timeout: 6000,
  });
  const text = `${out.stdout}\n${out.stderr}`;
  const match = [...text.matchAll(new RegExp(`${email.replace(/[+.]/g, '\\$&')}: (\\d{6})`, 'g'))].pop();
  return match?.[1];
}

// 1. pede o código
await client.action(api.auth.signIn, { provider: 'email-otp', params: { email } });
check('código solicitado', true);

// 2. lê o código nos logs do Convex (modo dev)
let code;
for (let i = 0; i < 10 && !code; i++) {
  code = readCodeFromLogs();
  if (!code) await new Promise((r) => setTimeout(r, 500));
}
check('código encontrado nos logs', !!code);

// 3. código errado é recusado
let wrongRejected = false;
try {
  await client.action(api.auth.signIn, {
    provider: 'email-otp',
    params: { email, code: code === '000000' ? '111111' : '000000' },
  });
} catch {
  wrongRejected = true;
}
check('código errado recusado', wrongRejected);

// 4. código certo abre a sessão
const session = await client.action(api.auth.signIn, {
  provider: 'email-otp',
  params: { email, code },
});
check('sessão aberta', !!session?.tokens?.token);
client.setAuth(session.tokens.token);

// 5. perfil
const before = await client.query(api.users.me, {});
check('me existe e ainda sem usuário', before !== null && before.username === null);

let badRejected = false;
try {
  await client.mutation(api.users.setProfile, { name: 'Smoke', username: 'AB' });
} catch {
  badRejected = true;
}
check('usuário inválido recusado', badRejected);

await client.mutation(api.users.setProfile, { name: 'Smoke Test', username });
const after = await client.query(api.users.me, {});
check('perfil salvo', after?.username === username && after?.name === 'Smoke Test', username);

// 6. sem sessão não vê nada
const anon = new ConvexHttpClient(url);
check('sem sessão me = null', (await anon.query(api.users.me, {})) === null);

console.log('\nTudo certo.');
