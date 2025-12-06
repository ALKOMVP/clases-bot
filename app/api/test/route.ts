// OpenNext no requiere runtime = 'edge' explícito
export async function GET() {
  return Response.json({ 
    message: 'API works!', 
    timestamp: Date.now() 
  });
}

