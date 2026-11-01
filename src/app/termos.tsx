import { LegalPage } from '@/components/LegalPage';
import { TERMS } from '@/lib/legal';
import { colors } from '@/theme/tokens';

// Termos de uso (abre de qualquer lugar: aceite, Ajustes, entrada).
export default function Termos() {
  return (
    <LegalPage
      title="Termos de uso"
      sticker="hand"
      color={colors.pink}
      intro="As regras para usar o Pique durante o teste fechado. Leia com calma: o jogo acontece na rua, e algumas regras são sobre a sua segurança."
      sections={TERMS}
    />
  );
}
