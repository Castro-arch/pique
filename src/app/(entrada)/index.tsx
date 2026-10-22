import { Redirect } from 'expo-router';

// Quem abre o app sem login cai aqui (raiz do grupo) e vai para as boas-vindas.
export default function EntradaIndex() {
  return <Redirect href="/bem-vindo" />;
}
