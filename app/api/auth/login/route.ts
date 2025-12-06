import { NextRequest, NextResponse } from 'next/server';
import { login, setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    const isValid = await login(username, password);
    
    if (isValid) {
      await setSession();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

