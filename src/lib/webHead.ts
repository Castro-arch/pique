import { Platform } from 'react-native';

// Só na web: deixa o Pique "instalável" no iPhone pelo Safari
// (Compartilhar → Adicionar à Tela de Início). Abre em tela cheia,
// com o ícone e as cores do app, sem a barra do navegador.
// Os arquivos ficam em /public (manifest.json, apple-touch-icon.png).
export function setupWebHead() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const add = (tag: 'meta' | 'link', attrs: Record<string, string>) => {
    const key = attrs.name ?? attrs.rel;
    if (document.head.querySelector(`${tag}[${attrs.name ? 'name' : 'rel'}="${key}"]`)) return;
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  };
  add('link', { rel: 'manifest', href: '/manifest.json' });
  add('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'Pique' });
  add('meta', { name: 'theme-color', content: '#101418' });
  document.documentElement.lang = 'pt-BR';
  document.title = 'Pique';
}
