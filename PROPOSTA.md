# Proposta: nossa versão do jogo de pique em ruas reais

Base: o mapa de comportamento em `../analysis/SCRAM-mapa.md`. **Copiamos a mecânica e o fluxo, não a marca**: nome,
logo, paleta, tipografia, textos, ícones e código são originais.

## 1. Nome (decisão sua)
Público brasileiro, então nome em português, curto, fácil de falar.

| Opção | Ideia | Observação |
|---|---|---|
| **PIQUE** (recomendado) | Vem de pique-esconde / pique-pega, todo brasileiro entende na hora | Genérico demais pra registrar marca sozinho. Dá pra usar "Pique" + elemento visual forte |
| **SUMIU** | "Sumiu!" é o grito de quem some | Tom de humor, ótimo pra story e compartilhamento |
| **TOCA** | "Tocou, pegou" + "toca" (esconderijo) | Curto, boa leitura em ícone |

Antes de fechar: pesquisar o nome na Play Store e no INPI. Não vou afirmar que está livre sem essa checagem.

## 2. Identidade visual (diferente do original, que é vermelho vivo + tipografia condensada)
- **Paleta:** tinta `#101418` (fundo escuro), verde-limão elétrico `#C8F23C` (ação principal), off-white `#F3F0E8`,
  coral `#FF6B4A` só para alerta/perigo (caçador por perto, fora da zona).
- **Tipografia:** títulos grandes em *Bricolage Grotesque* ou *Space Grotesk* (Google Fonts, licença aberta), corpo em *Inter*.
- **Forma:** cantos arredondados grandes, botões largos, mapa escuro como protagonista (o jogo é à noite/rua).
- **Ícone:** um ponto pulsando dentro de um círculo (a zona), sem figura humana, para não lembrar o logo original.
- **Voz:** português coloquial, curto ("Corre.", "Você foi pego.", "Zona fechando em 1 min").

## 3. Regras do jogo (v1, mesmas do original, configuráveis)
- Papéis: **Caçador** e **Corredor**, sorteio ou escolha. Padrão: rodada 30 min, head start 3 min, ping a cada 2 min,
  zona 420 m encolhendo a cada 5 min até 150 m.
- **Tag presencial** com confirmação do corredor (sistema de honra) e botão "Fui pego".
- Visibilidade: corredores veem colegas ao vivo. Caçadores só veem **pings** (e corredores fora da zona ao vivo).
- Modos: com zona+pings, só pings, ou sem localização (pique clássico).
- Radio (chat por time), denunciar/bloquear, rodada de treino com bots.
- Fim: todos pegos / todos caçadores saíram / tempo acabou / host encerrou (sem vitória nem derrota).

## 4. Arquitetura recomendada
**App:** Expo (SDK atual) + React Native + expo-router + TypeScript. `expo-location` (serviço em primeiro plano),
`react-native-maps`, `expo-notifications`, `expo-secure-store`.

**Backend: Convex** (recomendado) porque o jogo é uma máquina de estados em tempo real:
- queries reativas (mapa, lista de jogadores, Radio) sem montar WebSocket na mão;
- **scheduler nativo** para os eventos do jogo (fim do head start, cada ping, cada encolhimento, fim da rodada);
- funções de servidor em TypeScript, tipos compartilhados com o app.
Alternativa: **Supabase** (Postgres + Realtime + pg_cron). Boa se você prefere SQL, mas o agendamento dos eventos fica mais manual.

**Auth:** e-mail com código de 6 dígitos + Google. Sem senha.

**Regra de ouro de privacidade (no servidor, nunca no app):** a posição bruta de cada jogador fica numa tabela que o
cliente **não lê**. O servidor calcula o que cada papel pode ver (ping dos corredores para caçadores, colegas ao vivo para
corredores) e só entrega isso. Se o filtro ficasse no app, qualquer caçador poderia ler o tráfego e ver todo mundo.
Ao ser eliminado, a localização para de ser enviada.

### Modelo de dados (resumo)
`users` · `games` (código, host, config, status: lobby / headstart / hunting / ended) · `players` (game, user, papel, status)
· `locations` (última posição por jogador, privada) · `pings` (snapshot entregue aos caçadores) · `tags` (caçador, alvo, confirmada)
· `messages` (Radio, canal por time) · `reports` / `blocks` · `rounds` (histórico e stats).

### Funções de servidor
`createGame`, `joinByCode`, `updateConfig`, `startGame` (sorteia papéis, agenda eventos), `reportLocation`,
`tagPlayer` / `confirmTag` / `iGotTagged`, `sendMessage`, `endRound`, `tick` (ping), `shrinkZone`, `finishGame`.

## 5. Pontos de atenção (não deixar pra depois)
- **Localização em segundo plano na Play Store:** exige formulário de declaração e política de privacidade. Planeje isso desde o início.
- **Menores de idade e jogo em rua:** incluir aviso de segurança (atenção ao trânsito, jogar em locais seguros) e idade mínima.
- **Anti-trapaça:** posição simulada (mock location) é detectável no Android; checar e invalidar.
- **Bateria:** ping a cada 2 min permite amostragem esparsa em vez de GPS contínuo.
- **Monetização:** o original cobra R$ 20,99 única para hospedar. Decisão nossa; no MVP dá pra deixar tudo grátis e decidir depois.
- **Direito autoral:** não reutilizar texto, assets, nem os arquivos extraídos do APK. As capturas ficam só como referência interna.

## 6. Plano em fases
1. **Fundação (1):** projeto Expo, tema, navegação, auth por e-mail, Convex ligado.
2. **Lobby (2):** criar/entrar por código, configurar regras, escolher papel, lista de jogadores em tempo real.
3. **Jogo (3):** mapa com zona, máquina de estados, pings, tags e confirmações, eliminação, fim de rodada.
4. **Social (4):** Radio, denúncia/bloqueio, notificações push, rodada de treino com bots.
5. **Polimento (5):** stats e histórico, card de compartilhar, ícone, textos, testes em campo com amigos.
6. **Publicação (6):** política de privacidade, declaração de localização, Play Console.

O caminho mais curto até algo jogável é **1 → 2 → 3**, com 2 pessoas testando na rua.
