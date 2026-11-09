import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { handleExtractPdfText } from './handler.js';

Deno.serve((req) => handleExtractPdfText(req, { createClientFromRequest }));
