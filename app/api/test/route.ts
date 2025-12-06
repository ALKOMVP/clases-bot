export const runtime = 'edge';

export async function GET() {
  return new Response(JSON.stringify({ 
    message: 'API works!', 
    timestamp: Date.now() 
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

