import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { handlePrivateAttachment } from './handler.js';

export default async function(req: Request): Promise<Response> {
  return handlePrivateAttachment(req, { createClientFromRequest });
}