import { NextRequest, NextResponse } from 'next/server';

function getEnvVar(name: string): string {
  const cf = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  const v = cf?.env?.[name] ?? (typeof process !== 'undefined' ? process.env?.[name] : undefined);
  return typeof v === 'string' ? v : '';
}

function normalizarTelefonoWhatsApp(telefono: string): string {
  const n = String(telefono || '').replace(/\D/g, '');
  if (!n) return '';
  let t = n;
  if (t.startsWith('0')) t = t.slice(1);
  if (t.startsWith('54') && !t.startsWith('549')) {
    t = '549' + t.slice(2);
  } else if (!t.startsWith('54') && (t.length === 10 || t.length === 11)) {
    t = '549' + t;
  }
  return t;
}

export async function GET(request: NextRequest) {
  // Simple auth: requiere sesión del admin en el browser (misma cookie que usa la UI)
  const sessionCookie = request.cookies.get('yoga_session');
  const isAuthenticated = sessionCookie?.value === 'authenticated';
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const toRaw = request.nextUrl.searchParams.get('to') || '';
  const to = normalizarTelefonoWhatsApp(toRaw);
  if (!to) {
    return NextResponse.json({ error: 'Missing/invalid to' }, { status: 400 });
  }

  const token = getEnvVar('WHATSAPP_TOKEN');
  const phoneNumberId = getEnvVar('PHONE_NUMBER_ID');
  // Por defecto usamos confirmar_reserva (el template real del negocio).
  // Se puede overridear por query para debug: ?template=confirmar_reserva
  const templateName =
    request.nextUrl.searchParams.get('template') ||
    getEnvVar('WHATSAPP_CONFIRMAR_RESERVA_TEMPLATE') ||
    'confirmar_reserva';
  const templateLang = getEnvVar('WHATSAPP_TEMPLATE_LANG') || 'es_AR';

  if (!token || !phoneNumberId) {
    return NextResponse.json(
      { error: 'WhatsApp env vars missing', hasToken: !!token, hasPhoneNumberId: !!phoneNumberId },
      { status: 500 }
    );
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
      },
    }),
  });

  const text = await resp.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }

  return NextResponse.json(
    {
      ok: resp.ok,
      status: resp.status,
      to,
      templateName,
      templateLang,
      response: json ?? text,
    },
    { status: 200 }
  );
}

