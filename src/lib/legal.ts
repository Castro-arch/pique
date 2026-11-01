// Termos de uso e Política de privacidade do Pique (beta fechado).
// Texto em linguagem simples, escrito a partir do que o app faz de verdade
// (convex/schema.ts, rounds.ts, radio.ts, emailOtp.ts, streets.ts). Não é
// parecer jurídico: antes de abrir para o público geral, vale revisar com um
// advogado. Mudou o texto de um jeito que importa? Suba LEGAL_VERSION: todo
// mundo vê a tela de aceite de novo (convex/users.ts, acceptTerms).

export const LEGAL_VERSION = '2026-11-01.2'; // .2: analytics (PostHog) na Política de privacidade
export const LEGAL_DATE = '1º de novembro de 2026';
export const CONTACT_EMAIL = 'contatar.arthurcastro@gmail.com';
export const CONTROLLER = 'José Arthur de Castro Tavares';

export type LegalSection = { title: string; body: string[] };

export const TERMS: LegalSection[] = [
  {
    title: 'O que é o Pique',
    body: [
      'O Pique é um jogo de pique-esconde e pega-pega jogado em ruas e lugares de verdade, com o celular como juiz: ele sorteia quem caça, mostra o mapa, conta o tempo e avisa quem foi pego.',
      `O Pique é mantido por ${CONTROLLER}, pessoa física, no Brasil. Fale com a gente em ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'Teste fechado',
    body: [
      'O Pique está em teste fechado (beta). Só entra quem tem um código de convite válido. O código pode ser trocado a qualquer momento, e quem entrou com o código anterior precisa do novo para continuar.',
      'Por ser um teste, o app pode ter erros, mudar, ficar fora do ar ou ter dados apagados (por exemplo, quando o teste recomeça do zero). Não garantimos que ele vá funcionar sempre.',
    ],
  },
  {
    title: 'Quem pode jogar',
    body: [
      'Neste teste, o Pique é só para maiores de 18 anos. Ao aceitar estes termos, você declara que tem 18 anos ou mais.',
      'Você é responsável pela sua conta e pelo que fizer com ela. Use um nome de usuário que não se passe por outra pessoa.',
    ],
  },
  {
    title: 'Jogue com segurança',
    body: [
      'O jogo acontece na rua, e quem cuida da sua segurança é você. Ao jogar:',
      '• respeite as leis de trânsito; atravesse na faixa e nunca corra no meio dos carros;',
      '• não entre em casas, prédios, terrenos ou qualquer lugar sem permissão;',
      '• escolha lugares públicos, iluminados e conhecidos pelo grupo, de preferência de dia;',
      '• cuidado com o celular à vista: se puder, jogue com ele no bolso e use a vibração e a voz;',
      '• pare de jogar se você ou alguém estiver em perigo, cansado ou se machucar.',
      'O Pique não controla onde nem como cada grupo joga. Na medida permitida por lei, não respondemos por acidentes, danos, perdas ou conflitos que aconteçam durante as partidas. Isso não tira os direitos que o Código de Defesa do Consumidor garante a você.',
    ],
  },
  {
    title: 'Regras de convivência',
    body: [
      'Não use o Pique para perseguir, assediar, ameaçar ou vigiar ninguém, nem para jogar com quem não quer. Não envie no rádio, no nome ou na foto nada ofensivo, ilegal, violento, sexual ou que exponha outra pessoa.',
      'Dá para denunciar e bloquear jogadores dentro do app. Podemos tirar conteúdo e suspender ou apagar contas que quebrem estas regras.',
    ],
  },
  {
    title: 'Cosméticos e pagamentos',
    body: [
      'Molduras e outros cosméticos são só visuais: não dão vantagem no jogo. Durante o teste, eles são liberados de graça. Se um dia houver cobrança, as condições (preço, reembolso, arrependimento de 7 dias) serão mostradas antes da compra.',
    ],
  },
  {
    title: 'Mudanças e fim do uso',
    body: [
      'Podemos mudar estes termos. Se a mudança for importante, você verá a tela de aceite de novo antes de continuar jogando.',
      'Você pode parar de usar o Pique e excluir sua conta quando quiser, em Ajustes → Excluir minha conta.',
      'Estes termos seguem as leis do Brasil.',
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    title: 'Quem cuida dos seus dados',
    body: [
      `O responsável pelos dados (controlador, na Lei Geral de Proteção de Dados, LGPD) é ${CONTROLLER}, que mantém o Pique. Para qualquer pedido sobre seus dados, escreva para ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'O que coletamos',
    body: [
      '• Conta: e-mail (se você entrar por e-mail, Google ou Apple), nome, nome de usuário (@) e, se quiser, uma foto.',
      '• Localização: a posição do seu celular só durante uma rodada, para o jogo funcionar (pings, zona, coração acelerado, grito, boosts e pega). Fora da rodada, o app não envia sua localização.',
      '• Partida: o lado que você escolheu, quem pegou quem, as mensagens e os áudios do rádio do seu time, e os avisos do jogo.',
      '• Perfil e amigos: suas estatísticas (partidas, vitórias, distância), medalhas, pedidos de amizade, a moldura equipada e os cosméticos que você tem.',
      '• Avisos: se você permitir, o endereço de notificação do seu navegador ou celular, para mandar os avisos da partida.',
      '• Uso do app: quais telas você abre, se viu o tutorial, quando compartilha um convite e os números das partidas (quantas pessoas, duração, seu papel e se ganhou). Tudo ligado só ao número da sua conta: sem localização, sem nome, sem @ e sem o que você escreve ou fala.',
      '• Técnico: dados básicos de acesso que os serviços que usamos registram (como endereço IP e horário), para o app funcionar e ficar seguro.',
      'Não vendemos seus dados, não mostramos anúncios e não usamos seus dados para fazer perfil de publicidade.',
    ],
  },
  {
    title: 'Para que usamos',
    body: [
      'Para criar sua conta e fazer o jogo funcionar (base legal: execução do contrato, os termos que você aceitou), para manter o app seguro e evitar abusos, para entender como o jogo é usado e melhorar ele (legítimo interesse), e para cumprir a lei. A localização e o microfone só são usados com a sua permissão no celular, e você pode retirar essa permissão quando quiser nos ajustes do aparelho.',
    ],
  },
  {
    title: 'Quem vê o quê',
    body: [
      'Só quem está na mesma partida. Os caçadores veem os corredores só nos pings (ou ao vivo, se o corredor ficar fora da zona ou usar um boost). Os corredores nunca veem os caçadores no mapa. O rádio é separado por time.',
      'Seu nome, @, foto, moldura e estatísticas aparecem no seu perfil para os outros jogadores.',
    ],
  },
  {
    title: 'Por quanto tempo guardamos',
    body: [
      '• Áudios do rádio: apagados quando a rodada acaba.',
      '• Partida (posições, mensagens, avisos, quem pegou quem): apagada 7 dias depois de criada. Fica só um resumo sem nomes (quantas pessoas, duração e quem venceu).',
      '• Conta, perfil, estatísticas e amigos: enquanto você tiver a conta. Ao excluir a conta, apagamos esses dados.',
      '• Uso do app (analytics): até 1 ano. Depois que você exclui a conta, o número ao qual esses dados estão ligados não aponta mais para ninguém.',
      '• Registros de acesso: pelo tempo que a lei exige (até 6 meses), quando for o caso.',
    ],
  },
  {
    title: 'Serviços que usamos',
    body: [
      'Para o Pique funcionar, alguns dados passam por empresas que prestam serviço para nós, algumas fora do Brasil (nos Estados Unidos), com proteções contratuais:',
      '• Convex: servidor e banco de dados do jogo;',
      '• Expo: hospedagem do site;',
      '• Resend: envio do código de login por e-mail;',
      '• PostHog: estatísticas de uso do app (o que está em "Uso do app" acima), sem localização e sem gravação de tela;',
      '• Google e Apple: só se você escolher entrar com eles;',
      '• OpenFreeMap e OpenStreetMap: os mapas (seu celular baixa os mapas direto deles; para achar as ruas onde os boosts aparecem, enviamos só o centro e o tamanho da zona, sem nenhum nome);',
      '• serviços de notificação do navegador e do celular (Apple, Google, Mozilla), se você ligar os avisos.',
    ],
  },
  {
    title: 'Seus direitos',
    body: [
      'Pela LGPD, você pode pedir para saber quais dados temos sobre você, corrigir, levar para outro serviço, apagar, saber com quem compartilhamos e revogar o consentimento. Você mesmo pode corrigir seu perfil no app e excluir sua conta em Ajustes → Excluir minha conta. Para o resto, escreva para ' + CONTACT_EMAIL + '. Você também pode reclamar com a Autoridade Nacional de Proteção de Dados (ANPD).',
    ],
  },
  {
    title: 'Menores de idade',
    body: [
      'Neste teste, o Pique é só para maiores de 18 anos e não coleta dados de crianças e adolescentes de propósito. Se você souber que um menor criou uma conta, avise a gente para apagarmos.',
    ],
  },
  {
    title: 'Segurança e mudanças',
    body: [
      'Protegemos seus dados com conexões criptografadas e acesso restrito, mas nenhum sistema é 100% seguro. Se algo grave acontecer com seus dados, avisaremos você e a ANPD como a lei manda.',
      'Se esta política mudar de um jeito importante, você verá a tela de aceite de novo.',
    ],
  },
];
