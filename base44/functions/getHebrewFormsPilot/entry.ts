import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { handleHebrewFormsPilot } from './handler.js';

export default async function (req) {
  return handleHebrewFormsPilot(req, { createClientFromRequest });
}
