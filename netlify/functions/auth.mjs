import { auth } from './lib/auth.mjs';

export default async (req) => auth.handler(req);

export const config = { path: '/api/auth/*' };
