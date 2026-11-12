import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { handleAIContentReports } from './handler.js';

export default function handler(req: Request) {
  return handleAIContentReports(req, { createClientFromRequest });
}
