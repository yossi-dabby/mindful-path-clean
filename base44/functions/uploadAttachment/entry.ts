import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Uploads a file attachment on behalf of the authenticated user.
 * Accepts multipart/form-data with a "file" field.
 * Returns: { file_url: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_base64, file_name, file_type } = body;

    if (!file_base64 || !file_name || !file_type) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Decode base64 → Uint8Array → Blob
    const binaryStr = atob(file_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const file = new File([bytes], file_name, { type: file_type });

    const result = await base44.integrations.Core.UploadFile({ file });

    return Response.json({ file_url: result.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});