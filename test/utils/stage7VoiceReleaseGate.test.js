import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  serializeAttachmentMetadataMarker,
  extractAttachmentMetadataFromUserContent,
} from '../../src/components/utils/validateAgentOutput.jsx';

const chatSource = readFileSync(resolve(process.cwd(), 'src/pages/Chat.jsx'), 'utf8');
const messageBubbleSource = readFileSync(resolve(process.cwd(), 'src/components/chat/MessageBubble.jsx'), 'utf8');

describe('Stage 7 — voice release gate contracts', () => {
  it('clears local audio draft state on session switch/start/delete paths', () => {
    expect(chatSource).toMatch(/setMessages\(\[\]\);\s*clearLocalAudioDraft\(\);/);
    expect(chatSource).toMatch(/maybeTriggerEndWrite\(leavingId, leavingMeta, messages\);\s*clearLocalAudioDraft\(\);/);
    expect(chatSource).toMatch(/setAttachedFile\(null\);\s*clearLocalAudioDraft\(\);\s*setCurrentConversationId\(null\);/);
  });

  it('surfaces explicit user-facing error states for voice capture/upload/send failures', () => {
    expect(chatSource).toContain("t('chat.errors.no_audio_title')");
    expect(chatSource).toContain("t('chat.errors.file_upload_title')");
    expect(chatSource).toContain("t('chat.errors.audio_upload_title')");
    expect(chatSource).toContain("t(`chat.delivery.${deliveryStatus}`)");
  });

  it('keeps audio attachment round-trip metadata extraction stable', () => {
    const marker = serializeAttachmentMetadataMarker({
      type: 'audio',
      url: 'https://files.example.com/voice.webm',
      name: 'voice.webm',
    });
    const payload = `edited transcript\n[ATTACHMENT_CONTEXT]\ntype: audio\nurl: https://files.example.com/voice.webm\n${marker}`;

    const extracted = extractAttachmentMetadataFromUserContent(payload);
    expect(extracted.content).toContain('edited transcript');
    expect(extracted.attachment).toMatchObject({
      type: 'audio',
      url: 'https://files.example.com/voice.webm',
      name: 'voice.webm',
    });
  });

  it('renders user audio attachments via native audio control surface', () => {
    expect(messageBubbleSource).toMatch(/isAudioAttachment/);
    expect(messageBubbleSource).toContain('<audio controls');
    expect(messageBubbleSource).toContain('preload="none"');
    expect(messageBubbleSource).toContain('src={attachmentUrl}');
  });
});
