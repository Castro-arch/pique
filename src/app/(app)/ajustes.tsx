import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { MapPin } from '@/components/icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow, SectionLabel } from '@/components/Card';
import { Toggle } from '@/components/Controls';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { resetAnalytics, track } from '@/lib/analytics';
import { BETA_SEM_LOGIN } from '@/lib/beta';
import { setDemoMode, useDemoMode } from '@/lib/demoMode';
import { CONTACT_EMAIL } from '@/lib/legal';
import { useMe } from '@/lib/useMe';
import { colors, fonts, radius } from '@/theme/tokens';
import { api } from '../../../convex/_generated/api';

// 3.6 Configurações
// Só para quem administra o teste fechado (convex/beta.ts): o código de convite
// atual e o botão de gerar outro, que tira o acesso de quem entrou com o anterior.
function BetaInvite() {
  const view = useQuery(api.beta.adminView, {});
  const rotate = useMutation(api.beta.rotate);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!view) return null;
  const copy = async () => {
    if (!view.code) return;
    await Clipboard.setStringAsync(view.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const make = async () => {
    if (!confirm && view.code) return setConfirm(true);
    setBusy(true);
    try {
      await rotate({});
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };
  return (
    <>
      <SectionLabel>Convite do teste</SectionLabel>
      <View style={styles.invite}>
        <Text variant="small">{view.code ? 'Código que vale agora' : 'Ainda não tem código: o app está aberto para todos.'}</Text>
        {view.code ? (
          <>
            <Text style={styles.inviteCode} selectable>
              {view.code}
            </Text>
            <Text variant="small">{`${view.members} ${view.members === 1 ? 'pessoa entrou' : 'pessoas entraram'} com ele`}</Text>
          </>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {view.code ? (
            <Pressable accessibilityRole="button" onPress={copy} style={[styles.inviteBtn, { backgroundColor: colors.inkBorder }]}>
              <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14 }}>{copied ? 'Copiado!' : 'Copiar'}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={make} style={[styles.inviteBtn, { flex: 1, backgroundColor: confirm ? colors.pink : colors.lime }]}>
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14, color: confirm ? colors.paper : colors.limeInk }}>
              {busy ? 'Gerando…' : confirm ? 'Confirmar: todos perdem o acesso' : view.code ? 'Gerar código novo' : 'Criar código e fechar o teste'}
            </Text>
          </Pressable>
        </View>
        {confirm ? (
          <Text variant="small" style={{ marginTop: 8 }} onPress={() => setConfirm(false)}>
            Quem entrou com {view.code} vai precisar do código novo. Toque aqui para cancelar.
          </Text>
        ) : null}
      </View>
    </>
  );
}

// Proteger a conta: no beta a conta é anônima e presa ao navegador. Aqui a
// pessoa gera um código de recuperação (convex/recovery.ts) e, em outro
// aparelho, volta para a mesma conta em "Já tenho conta". O código só aparece
// uma vez; gerar outro invalida o anterior.
function ProtectAccount() {
  const status = useQuery(api.recovery.status, {});
  const create = useMutation(api.recovery.create);
  const [code, setCode] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!status) return null;
  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const make = async () => {
    if (!confirm && status.has) return setConfirm(true);
    setBusy(true);
    try {
      setCode(await create({}));
      track('recovery_code_created', { replaced: status.has });
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };
  return (
    <>
      <SectionLabel>Proteger minha conta</SectionLabel>
      <View style={styles.invite}>
        {code ? (
          <>
            <Text variant="small">Seu código de recuperação. Anote ou tire um print agora: ele não aparece de novo.</Text>
            <Text style={[styles.inviteCode, { fontSize: 28, letterSpacing: 2 }]} selectable>
              {code}
            </Text>
            <Text variant="small">Em outro celular, toque em "Já tenho conta" e digite este código. Não mande para ninguém: quem tiver ele entra na sua conta.</Text>
          </>
        ) : (
          <Text variant="small">
            {status.has
              ? 'Sua conta já tem um código de recuperação. Perdeu? Gere outro: o antigo para de funcionar.'
              : 'Sua conta fica só neste navegador. Se limpar os dados ou trocar de celular, você perde perfil, amigos e estatísticas. Gere um código para voltar para ela em qualquer aparelho.'}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {code ? (
            <Pressable accessibilityRole="button" onPress={copy} style={[styles.inviteBtn, { backgroundColor: colors.inkBorder }]}>
              <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14 }}>{copied ? 'Copiado!' : 'Copiar'}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={make} style={[styles.inviteBtn, { flex: 1, backgroundColor: confirm ? colors.pink : code ? colors.inkBorder : colors.lime }]}>
            <Text style={{ fontFamily: fonts.bodyStrong, fontSize: 14, color: confirm ? colors.paper : code ? colors.paper : colors.limeInk }}>
              {busy ? 'Gerando…' : confirm ? 'Confirmar: o código antigo para' : status.has ? 'Gerar outro código' : 'Gerar código de recuperação'}
            </Text>
          </Pressable>
        </View>
        {confirm ? (
          <Text variant="small" style={{ marginTop: 8 }} onPress={() => setConfirm(false)}>
            O código que você guardou deixa de valer. Toque aqui para cancelar.
          </Text>
        ) : null}
      </View>
    </>
  );
}

export default function Ajustes() {
  const me = useMe();
  const demo = useDemoMode();
  const { signOut } = useAuthActions();
  const [vibrate, setVibrate] = useState(true);
  const [lockAlerts, setLockAlerts] = useState(true);
  const [news, setNews] = useState(false);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const [deleting, setDeleting] = useState<'ask' | 'busy' | null>(null);

  // Excluir a conta: pede confirmação; depois apaga tudo e sai.
  async function removeAccount() {
    if (demo) return;
    if (deleting !== 'ask') return setDeleting('ask');
    setDeleting('busy');
    try {
      await deleteAccount({});
      await signOut();
    } catch {
      setDeleting(null);
    }
  }

  async function leave() {
    if (demo) setDemoMode(false);
    else {
      resetAnalytics();
      await signOut();
    }
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
        <ListRow title="Meu visual" value="Moldura e cosméticos" chevron onPress={() => router.push('/visual')} last={BETA_SEM_LOGIN} />
        {/* no beta a conta não tem e-mail: volta-se a ela com o código de recuperação */}
        {BETA_SEM_LOGIN ? null : <ListRow title="E-mail" value={me.email} last />}
      </ListGroup>

      {demo ? null : <ProtectAccount />}

      {demo ? null : <BetaInvite />}

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

      <SectionLabel>{BETA_SEM_LOGIN ? 'Segurança' : 'E-mails e segurança'}</SectionLabel>
      <ListGroup>
        {BETA_SEM_LOGIN ? null : (
          <ListRow title="Novidades e grandes atualizações" trailing={<Toggle label="Novidades por e-mail" value={news} onChange={setNews} />} />
        )}
        <ListRow title="Jogadores bloqueados" subtitle="Para denunciar, segure a mensagem no Radio" chevron />
        <ListRow title="Sair da conta" danger onPress={leave} last />
      </ListGroup>

      <SectionLabel>Termos e privacidade</SectionLabel>
      <ListGroup>
        <ListRow title="Termos de uso" chevron onPress={() => router.push('/termos')} />
        <ListRow title="Política de privacidade" chevron onPress={() => router.push('/privacidade')} />
        <ListRow
          title={deleting === 'busy' ? 'Excluindo…' : deleting === 'ask' ? 'Toque de novo para excluir de vez' : 'Excluir minha conta'}
          subtitle={deleting === 'ask' ? 'Apaga perfil, estatísticas, amigos e cosméticos. Não dá para desfazer.' : undefined}
          danger
          onPress={removeAccount}
          last
        />
      </ListGroup>
      {deleting === 'ask' ? (
        <Text variant="small" style={{ textAlign: 'center', marginTop: 8 }} onPress={() => setDeleting(null)}>
          Mudou de ideia? Toque aqui para cancelar.
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text variant="small" accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
          Fale conosco
        </Text>
        <Text variant="small" accessibilityRole="link" onPress={() => router.push('/termos')}>
          Termos de uso
        </Text>
        <Text variant="small" accessibilityRole="link" onPress={() => router.push('/privacidade')}>
          Política de privacidade
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  invite: { backgroundColor: colors.inkRaised, borderWidth: 1, borderColor: colors.inkBorder, borderRadius: radius.lg, padding: 16 },
  inviteCode: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 4, color: colors.lime, marginVertical: 4 },
  inviteBtn: { height: 44, borderRadius: 999, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
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
