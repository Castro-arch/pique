import { useAuthActions } from '@convex-dev/auth/react';
import { router } from 'expo-router';
import { MapPin } from '@/components/icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow, SectionLabel } from '@/components/Card';
import { Toggle } from '@/components/Controls';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { setDemoMode, useDemoMode } from '@/lib/demoMode';
import { useMe } from '@/lib/useMe';
import { colors, fonts, radius } from '@/theme/tokens';

// 3.6 Configurações
export default function Ajustes() {
  const me = useMe();
  const demo = useDemoMode();
  const { signOut } = useAuthActions();
  const [vibrate, setVibrate] = useState(true);
  const [lockAlerts, setLockAlerts] = useState(true);
  const [news, setNews] = useState(false);

  async function leave() {
    if (demo) setDemoMode(false);
    else await signOut();
  }

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="h2" accessibilityRole="header">Configurações</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 15 }}>Concluir</Text>
        </Pressable>
      </View>

      <SectionLabel>Conta</SectionLabel>
      <ListGroup>
        <ListRow title="Nome" value={me.name} chevron onPress={() => router.push('/editar-perfil')} />
        <ListRow title="Usuário" value={`@${me.username}`} chevron onPress={() => router.push('/editar-perfil')} />
        <ListRow title="Meu visual" value="Moldura e cosméticos" chevron onPress={() => router.push('/visual')} />
        <ListRow title="E-mail" value={me.email} last />
      </ListGroup>

      <SectionLabel>Privacidade</SectionLabel>
      <View style={styles.privacy}>
        <View style={styles.pin}>
          <MapPin size={18} color={colors.lime} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 15, lineHeight: 20 }}>
            Sua localização só sai do celular durante a rodada
          </Text>
          <Text variant="small" style={{ marginTop: 3 }}>
            Fora dela, ninguém vê onde você está.{' '}
            <Text style={{ color: colors.lime, fontFamily: fonts.bodyStrong, fontSize: 13 }} onPress={() => router.push('/como-jogar/4')}>
              Quem vê você em cada papel ›
            </Text>
          </Text>
        </View>
      </View>

      <SectionLabel>
        Durante o jogo · <Text style={{ color: colors.lime, fontSize: 12 }}>recomendado deixar ligado</Text>
      </SectionLabel>
      <ListGroup>
        <ListRow title="Vibrar a cada ping" trailing={<Toggle label="Vibrar a cada ping" value={vibrate} onChange={setVibrate} />} />
        <ListRow
          title="Alertas com a tela bloqueada"
          trailing={<Toggle label="Alertas com a tela bloqueada" value={lockAlerts} onChange={setLockAlerts} />}
          last
        />
      </ListGroup>

      <SectionLabel>Hospedagem · amigos entram de graça</SectionLabel>
      <ListGroup>
        <ListRow title="Desbloquear hospedagem" chevron onPress={() => router.push('/hospedar')} />
        <Pressable accessibilityRole="button" style={styles.restore}>
          <Text style={{ color: colors.lime, fontFamily: fonts.bodyMedium, fontSize: 15 }}>Restaurar compra</Text>
        </Pressable>
      </ListGroup>

      <SectionLabel>E-mails e segurança</SectionLabel>
      <ListGroup>
        <ListRow title="Novidades e grandes atualizações" trailing={<Toggle label="Novidades por e-mail" value={news} onChange={setNews} />} />
        <ListRow title="Jogadores bloqueados" subtitle="Para denunciar, segure a mensagem no Radio" chevron />
        <ListRow title="Sair da conta" danger onPress={leave} last />
      </ListGroup>

      <View style={styles.footer}>
        {['Fale conosco', 'Termos de uso', 'Política de privacidade'].map((t) => (
          <Text key={t} variant="small" accessibilityRole="link">{t}</Text>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  privacy: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkBorder,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.limeTint, alignItems: 'center', justifyContent: 'center' },
  restore: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginHorizontal: 6 },
});
