// OpenNext no requiere runtime = 'edge' explícito
export async function POST() {
  // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
  // Acceder usando el símbolo __cloudflare-context__
  const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  const db = cloudflareContext?.env?.DB;
  
  return Response.json({ 
    message: 'POST API works!', 
    timestamp: Date.now(),
    hasDB: !!db,
    hasContext: !!cloudflareContext,
    hasEnv: !!cloudflareContext?.env,
    envKeys: cloudflareContext?.env ? Object.keys(cloudflareContext.env) : []
  });
}


