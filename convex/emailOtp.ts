import { Email } from '@convex-dev/auth/providers/Email';

// Código numérico de 6 dígitos, gerado com a Web Crypto do runtime do Convex.
function generateCode(): string {
  const bytes = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(bytes);
    n = bytes[0];
    // Rejeita a faixa final para não enviesar o módulo.
  } while (n >= 4_000_000_000);
  return String(n % 1_000_000).padStart(6, '0');
}

export const EmailOtp = Email({
  id: 'email-otp',
  maxAge: 60 * 15,

  async generateVerificationToken() {
    return generateCode();
  },

  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;

    if (!apiKey) {
      // Só em desenvolvimento: o código aparece nos logs do Convex (npx convex logs).
      if (process.env.AUTH_DEV_LOG_CODES === 'true') {
        console.log(`[DEV] Código de login para ${email}: ${token}`);
        return;
      }
      throw new Error(
        'Envio de e-mail não configurado. Defina AUTH_RESEND_KEY (produção) ou AUTH_DEV_LOG_CODES=true (dev).',
      );
    }

    const from = process.env.AUTH_EMAIL_FROM ?? 'Pique <login@example.com>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Seu código do Pique: ${token}`,
        text: `Seu código de acesso é ${token}. Ele vale por 15 minutos. Se não foi você, ignore este e-mail.`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao enviar e-mail (${response.status}).`);
    }
  },
});
