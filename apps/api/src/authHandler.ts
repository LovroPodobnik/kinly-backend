import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from '@auth/index';

const app = new Hono();

app.use(
  '/*',
  cors({
    origin: 'http://localhost:3001',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

app.on(['GET', 'POST'], '/*', (c) => auth.handler(c.req.raw));

export const authHandler = app;
