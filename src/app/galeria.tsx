import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Nav';
import { Text } from '@/components/Text';
import { setDemoMode } from '@/lib/demoMode';
import { colors, fonts, radius } from '@/theme/tokens';

// Galeria de telas (só em desenvolvimento).
// Liga o modo demonstração e abre qualquer tela direto, na ordem do canvas do design.
type Item = { n: string; title: string; href: Href; needsLogout?: boolean };

export const sections: { title: string; items: Item[] }[] = [
  {
    title: '1 · Primeiro acesso',
    items: [
      { n: '1.1', title: 'Boas-vindas', href: '/bem-vindo', needsLogout: true },
      { n: '1.2', title: 'Entrar com e-mail', href: '/email', needsLogout: true },
      { n: '1.3', title: 'Código do e-mail', href: '/codigo?email=voce@exemplo.com', needsLogout: true },
      { n: '1.5', title: 'Permissão de localização', href: '/permissao-local' },
      { n: '1.6', title: 'Permissão de avisos', href: '/permissao-avisos' },
      { n: '1.7', title: 'Localização desligada', href: '/local-desligada' },
    ],
  },
  {
    title: '2 · Aprender a jogar',
    items: [
      { n: '2.1', title: 'Como jogar · 1 de 4', href: '/como-jogar/1' },
      { n: '2.2', title: 'Como jogar · 2 de 4', href: '/como-jogar/2' },
      { n: '2.3', title: 'Como jogar · 3 de 4', href: '/como-jogar/3' },
      { n: '2.4', title: 'Como jogar · 4 de 4', href: '/como-jogar/4' },
      { n: '2.5', title: 'Treino com bots', href: '/treino' },
    ],
  },
  {
    title: '3 · Início e conta',
    items: [
      { n: '3.1', title: 'Home', href: '/' },
      { n: '3.2', title: 'Estatísticas', href: '/estatisticas' },
      { n: '3.3', title: 'Estatísticas vazias', href: '/estatisticas?vazio=1' },
      { n: '3.4', title: 'Histórico de partidas', href: '/historico' },
      { n: '3.5', title: 'Editar perfil', href: '/editar-perfil' },
      { n: '3.6', title: 'Configurações', href: '/ajustes' },
      { n: '3.7', title: 'Desbloquear hospedagem', href: '/hospedar' },
      { n: '3.8', title: 'Compra concluída', href: '/compra' },
      { n: '3.9', title: 'Erro no pagamento', href: '/compra?erro=1' },
    ],
  },
  {
    title: '4 · Entrar numa partida',
    items: [
      { n: '4.1', title: 'Convite pelo link', href: '/convite/TACO42' },
      { n: '4.2', title: 'Entrar com código', href: '/entrar' },
      { n: '4.3', title: 'Código errado', href: '/entrar?codigo=QWERTY' },
      { n: '4.4', title: 'Escanear QR', href: '/entrar/qr' },
      { n: '4.5', title: 'Partida indisponível', href: '/indisponivel' },
      { n: '4.6', title: 'Escolher lado', href: '/lado' },
      { n: '4.7', title: 'Aguardando a partida', href: '/aguardando' },
    ],
  },
  {
    title: '5 · Lobby e preparação',
    items: [
      { n: '5.1', title: 'Lobby do anfitrião', href: '/lobby' },
      { n: '5.2', title: 'Quem joga', href: '/lobby/jogadores' },
      { n: '5.3', title: 'Regras da casa', href: '/lobby/regras' },
      { n: '5.4', title: 'QR da partida', href: '/lobby/qr' },
      { n: '5.5', title: 'Perfil de jogador', href: '/jogador/leo' },
      { n: '5.6', title: 'Anfitrião saiu', href: '/anfitriao' },
      { n: '5.7', title: 'Zona de jogo', href: '/zona' },
      { n: '5.8', title: 'Sorteio', href: '/sorteio' },
      { n: '5.9', title: 'Papel: caçador', href: '/papel?papel=hunter' },
      { n: '5.10', title: 'Papel: corredor', href: '/papel?papel=runner' },
    ],
  },
  {
    title: '6 · No mapa',
    items: [
      { n: '6.1', title: 'Caçador esperando', href: '/jogo?estado=cacador-espera' },
      { n: '6.2', title: 'Caçador na caça', href: '/jogo?estado=cacador-caca' },
      { n: '6.3', title: 'Corredor na vantagem', href: '/jogo?estado=corredor-vantagem' },
      { n: '6.4', title: 'Corredor na caça', href: '/jogo?estado=corredor-caca' },
      { n: '6.5', title: 'Ping', href: '/jogo?estado=ping' },
      { n: '6.6', title: 'Fora da zona', href: '/jogo?estado=fora-zona' },
      { n: '6.7', title: 'Zona encolhe', href: '/jogo?estado=zona-encolhe' },
      { n: '6.8', title: 'Sem sinal', href: '/jogo?estado=sem-sinal' },
      { n: '6.9', title: 'Esperando confirmar a pega', href: '/confirmando' },
      { n: '6.10', title: 'Pega contestada', href: '/contestado' },
    ],
  },
  {
    title: '7 · Durante o jogo',
    items: [
      { n: '7.1', title: 'Tela bloqueada', href: '/bloqueada' },
      { n: '7.2', title: 'Radio', href: '/radio' },
      { n: '7.3', title: 'Menu da partida (treino)', href: '/menu?treino=1' },
      { n: '7.4', title: 'Sair da partida?', href: '/sair' },
      { n: '7.5', title: 'Você saiu', href: '/saiu' },
      { n: '7.6', title: 'Denunciar', href: '/denunciar' },
    ],
  },
  {
    title: '8 · Fim de rodada',
    items: [
      { n: '8.1', title: 'Um caçador te achou?', href: '/pego' },
      { n: '8.2', title: 'Achado (ilustração)', href: '/achado' },
      { n: '8.2b', title: 'Achado (mapa)', href: '/achado?estilo=mapa' },
      { n: '8.3', title: 'Espectador', href: '/espectador' },
      { n: '8.4', title: 'Sobreviveu', href: '/fim?lado=corredor' },
      { n: '8.5', title: 'Caçador venceu', href: '/fim?lado=cacador' },
      { n: '8.6', title: 'Fim de jogo (simples)', href: '/fim?lado=cacador&estilo=simples' },
      { n: '8.7', title: 'Placar geral', href: '/placar' },
      { n: '8.8', title: 'Post · mapa', href: '/post' },
      { n: '8.9', title: 'Post · selfie da crew', href: '/post?visual=selfie' },
      { n: '8.10', title: 'Post · adesivo', href: '/post?visual=adesivo' },
    ],
  },
  {
    title: '9 · Sistema',
    items: [
      { n: '9.1', title: 'Abertura', href: '/abertura' },
      { n: '9.2', title: 'Carregando o mapa', href: '/carregando' },
    ],
  },
];

export default function Galeria() {
  const insets = useSafeAreaInsets();
  const open = (item: Item) => {
    setDemoMode(!item.needsLogout);
    router.push(item.href);
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.ink }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}>
      <Logo />
      <Text variant="h2" style={{ marginTop: 18 }}>Galeria de telas</Text>
      <Text variant="small" style={{ marginTop: 6 }}>
        Só em desenvolvimento. Abre cada tela com dados de demonstração, sem precisar logar.
      </Text>
      {sections.map((s) => (
        <View key={s.title} style={{ marginTop: 22 }}>
          <Text variant="label" style={{ marginLeft: 6, marginBottom: 6 }}>{s.title}</Text>
          <View style={{ backgroundColor: colors.inkRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.inkBorder }}>
            {s.items.map((it, i) => (
              <Pressable
                key={it.n}
                accessibilityRole="button"
                onPress={() => open(it)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 48,
                  paddingHorizontal: 16,
                  borderBottomWidth: i === s.items.length - 1 ? 0 : 1,
                  borderBottomColor: colors.inkBorder,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <Text style={{ width: 34, color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 13 }}>{it.n}</Text>
                <Text style={{ flex: 1, fontSize: 15 }}>{it.title}</Text>
                <ChevronRight size={18} color={colors.inkMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
