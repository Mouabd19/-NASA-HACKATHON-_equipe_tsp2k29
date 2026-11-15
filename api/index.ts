// Owner: Ahmed (B). Vercel Node function serving the whole watch API (see server/vercel/handler.ts).
// Every API path reaches it through the vercel.json rewrites, which pass the original path as ?__p=.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createVercelApi } from '../server/vercel/handler.js';

const api = createVercelApi();

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return api(req, res);
}
