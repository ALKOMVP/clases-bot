export default function MinimalPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Hello World - Minimal Test</h1>
      <p>Si ves esto, el problema no es de configuración de Cloudflare.</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}


