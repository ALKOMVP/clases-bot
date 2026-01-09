// OpenNext no requiere runtime = 'edge' explícito
export async function GET() {
  // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
  // Acceder usando el símbolo __cloudflare-context__
  const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  let db = cloudflareContext?.env?.DB;
  
  // Si no está disponible en el contexto, intentar desde process.env (OpenNext lo popula)
  if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
    db = (process.env as any).DB;
  }
  
  // Intentar ejecutar una query de prueba
  let queryTest = null;
  let queryError = null;
  if (db) {
    try {
      const result = await db.prepare('SELECT COUNT(*) as count FROM usuario').first();
      queryTest = result;
    } catch (error: any) {
      queryError = error.message || String(error);
    }
  }
  
  return Response.json({ 
    message: 'API works!', 
    timestamp: Date.now(),
    hasDB: !!db,
    hasContext: !!cloudflareContext,
    hasEnv: !!cloudflareContext?.env,
    envKeys: cloudflareContext?.env ? Object.keys(cloudflareContext.env) : [],
    hasProcessEnvDB: typeof process !== 'undefined' ? !!(process.env as any).DB : false,
    queryTest,
    queryError
  });
}

