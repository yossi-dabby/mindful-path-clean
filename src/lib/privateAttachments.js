export const isPrivateAttachmentRef = (value) => typeof value === 'string' && /^mp-private:[a-f0-9]{24}$/i.test(value);

function resultData(result) {
  const data = result?.data ?? result;
  if (!isPrivateAttachmentRef(data?.file_ref) || !/^https:\/\//.test(data?.file_url || '')) {
    throw new Error('Private file service is unavailable');
  }
  return data;
}

export async function uploadPrivateAttachment(base44, file) {
  return resultData(await base44.functions.invoke('uploadAttachment', { file }));
}

export async function resolvePrivateAttachment(base44, reference) {
  if (!isPrivateAttachmentRef(reference)) throw new Error('An owned file reference is required');
  const data = resultData(await base44.functions.invoke('uploadAttachment', { action: 'resolve', file_ref: reference }));
  if (data.file_ref !== reference) throw new Error('Private file reference mismatch');
  return data;
}
