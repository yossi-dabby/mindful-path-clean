const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const reply = (body, status = 200) => Response.json(body, { status, headers: HEADERS });

export async function handleExtractPdfText(req, { createClientFromRequest }) {
  if (req.method !== 'POST') return reply({ success: false, error: 'Method not allowed' }, 405);
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return reply({ success: false, error: 'Unauthorized' }, 401);
    const { file_ref } = await req.json();
    if (typeof file_ref !== 'string' || !/^mp-private:[a-f0-9]{24}$/i.test(file_ref)) {
      return reply({ success: false, error: 'An owned PDF reference is required' }, 400);
    }
    // The caller's token is forwarded. Never sign a supplied storage URI or trust
    // a user ID embedded in a URL, and never invoke this as the service role.
    const response = await base44.functions.invoke('uploadAttachment', { action: 'resolve', file_ref });
    const file = response?.data ?? response;
    if (file?.file_ref !== file_ref || file?.mime_type !== 'application/pdf' || !/^https:\/\//.test(file?.file_url || '')) {
      return reply({ success: false, error: 'File not found or not accessible' }, 403);
    }
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file.file_url,
      json_schema: {
        type: 'object',
        properties: {
          full_text: { type: 'string', description: 'The complete extracted text content, preserving structure and paragraphs as much as possible.' },
          page_count: { type: 'number', description: 'Number of pages, if detectable.' },
        },
        required: ['full_text'],
      },
    });
    if (result?.status === 'error' || !result?.output?.full_text) {
      return reply({ success: false, error: 'PDF text extraction returned no content' });
    }
    return reply({ success: true, text: result.output.full_text, page_count: result.output.page_count || null });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    if ([401, 403, 404].includes(status)) {
      return reply({ success: false, error: 'File not found or not accessible' }, status);
    }
    return reply({ success: false, error: 'PDF extraction is unavailable' }, 503);
  }
}
