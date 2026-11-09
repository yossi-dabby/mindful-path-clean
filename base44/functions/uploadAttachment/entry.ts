import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { handlePrivateAttachment } from './handler.js';

Deno.serve((req) => handlePrivateAttachment(req, { createClientFromRequest }));
