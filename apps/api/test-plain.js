// PURE JAVASCRIPT TEST: No TypeScript, no imports
type Errno = Error & { code?: string };

const fallbackPort = Number(process.env.PORT ?? 3000);

const startServer = (port, allowAuto = true) => {
  try {
    const server = Bun.serve({
      port,
      fetch: (req) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${new URL(req.url).pathname}`);

        const url = new URL(req.url);

        if (url.pathname === '/') {
          return new Response('Hello from plain JS!');
        }

        if (url.pathname === '/health') {
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('Not Found', { status: 404 });
      }
    });

    console.log(`API running on http://localhost:${server.port}`);
    return server;
  } catch (error) {
    if (
      process.env.PORT === undefined &&
      allowAuto &&
      error?.code === 'EADDRINUSE'
    ) {
      console.warn(`Port ${port} in use, falling back to an ephemeral port.`);
      return startServer(0, false);
    }

    throw error;
  }
};

export default startServer(fallbackPort);
