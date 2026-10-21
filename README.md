# Pique

Jogo de pique em ruas reais: caçadores e corredores, zona que encolhe, pings de localização.
Stack: Expo (React Native, expo-router) + Convex. Plano completo em `PROPOSTA.md`.

## Estado atual: fase 1
Login por código de e-mail (sem senha), perfil (nome + usuário) e home. Lobby e jogo vêm nas fases 2 e 3.

## Rodar em desenvolvimento (backend local, sem conta)
1. Backend local, em um terminal que fica aberto:
   ```bash
   CONVEX_AGENT_MODE=anonymous npx convex dev
   ```
   Na primeira vez, configure as chaves do auth (em outro terminal):
   ```bash
   CONVEX_AGENT_MODE=anonymous npm run auth:setup
   ```
2. App:
   ```bash
   npx expo start -c
   ```
3. **Celular Android por USB:** o app fala com `127.0.0.1`, então encaminhe as portas do backend:
   ```bash
   adb reverse tcp:3210 tcp:3210
   adb reverse tcp:3211 tcp:3211
   ```
4. **Código de login em dev:** não é enviado por e-mail. Ele aparece nos logs do Convex
   (`[DEV] Código de login para ...`), no terminal do passo 1.

## Testes
```bash
npm run typecheck
CONVEX_AGENT_MODE=anonymous npm run smoke:auth   # login + perfil de ponta a ponta (backend local rodando)
```

## Produção (quando for a hora)
- Criar o projeto Convex com `npx convex login` e `npx convex dev` (sem `CONVEX_AGENT_MODE`).
- Definir `AUTH_RESEND_KEY` e `AUTH_EMAIL_FROM` no Convex (envio real de e-mail) e **remover** `AUTH_DEV_LOG_CODES`.
- Trocar `com.pique.app` pelo identificador definitivo em `app.json`.

## Estrutura
- `convex/` backend: `schema.ts`, `auth.ts`, `emailOtp.ts`, `users.ts`
- `src/app/` telas (`login`, `profile`, `index`) e guarda de rotas em `_layout.tsx`
- `src/theme/tokens.ts` cores, espaçamento e fontes; `src/components/` componentes base
