import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { handleFileDeletion } from './handler.js';
export default async function handler(req: Request) {
  return handleFileDeletion(req, { createClientFromRequest });
}
