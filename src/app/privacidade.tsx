import { LegalPage } from '@/components/LegalPage';
import { PRIVACY } from '@/lib/legal';

// Política de privacidade (abre de qualquer lugar: aceite, Ajustes, entrada).
export default function Privacidade() {
  return (
    <LegalPage
      title="Privacidade"
      sticker="lock"
      color="#5AC8FA"
      intro="Quais dados o Pique usa, para quê, quem vê, por quanto tempo guardamos e como você apaga tudo. Resumo: sua localização só sai do celular durante a rodada."
      sections={PRIVACY}
    />
  );
}
