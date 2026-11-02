import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { FileText, ExternalLink, ChevronDown, ChevronUp, Sparkles, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageFeedback from './MessageFeedback';
import { extractThinkingContent } from '../utils/messageContentSanitizer';
import { applyFinalOutputGovernor } from '../utils/finalOutputGovernor';
import { normalizeAssistantMarkdown } from '../utils/normalizeAssistantMarkdown';
import GeneratedFileCard from './GeneratedFileCard';
import ExperimentMetricsCard from './ExperimentMetricsCard';
import { normalizeGeneratedFile } from './utils/normalizeGeneratedFile';
import { PDF_VIEWER_ROUTE_PATH } from './utils/formFileUrls';
import {
  stripAgentOnlyRuntimeBlocksFromUserContent,
  stripLeadingInternalAssistantTags,
} from '../utils/validateAgentOutput.jsx';

const ASSISTANT_ATTACHMENT_URL_REGEX = /https?:\/\/\S+/gi;
const FILE_EXTENSIONS = new Set(['doc', 'docx', 'txt', 'csv', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'json', 'md', 'rtf']);

function inferAttachmentTypeFromUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    const pathname = String(parsed.pathname || '').toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(pathname)) return 'image';
    if (pathname.endsWith('.pdf')) return 'pdf';
    const extensionMatch = pathname.match(/\.([a-z0-9]+)$/);
    const extension = extensionMatch?.[1] || '';
    if (FILE_EXTENSIONS.has(extension)) return 'file';
    return null;
  } catch {
    return null;
  }
}

function stripTrailingUrlPunctuation(rawUrl) {
  if (typeof rawUrl !== 'string') return '';
  return rawUrl.replace(/[),.;!?]+$/g, '');
}

function normalizeAttachment(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  const type =
    attachment.type === 'image' ||
    attachment.type === 'pdf' ||
    attachment.type === 'file' ||
    attachment.type === 'audio'
      ? attachment.type
      : null;
  const url = typeof attachment.url === 'string' && attachment.url.trim() ? attachment.url.trim() : null;
  if (!type || !url) return null;
  const name = typeof attachment.name === 'string' && attachment.name.trim() ? attachment.name.trim() : undefined;
  return { type, url, name };
}

function detectAssistantAttachments(message) {
  const found = [];
  const seen = new Set();
  const addAttachment = (candidate) => {
    if (!candidate || !candidate.type || !candidate.url) return;
    const normalizedUrl = stripTrailingUrlPunctuation(String(candidate.url || '').trim());
    if (!normalizedUrl) return;
    const key = `${candidate.type}:${normalizedUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({
      type: candidate.type,
      url: normalizedUrl,
      name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : undefined,
    });
  };

  const metadataAttachment = normalizeAttachment(message?.metadata?.attachment || message?.attachment);
  if (metadataAttachment) addAttachment(metadataAttachment);

  const content = typeof message?.content === 'string' ? message.content : '';
  for (const match of content.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi)) {
    const url = match[2];
    const type = inferAttachmentTypeFromUrl(url);
    if (type === 'image') {
      addAttachment({ type: 'image', url, name: match[1] || undefined });
    }
  }

  for (const match of content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi)) {
    const url = match[2];
    const type = inferAttachmentTypeFromUrl(url);
    if (type) {
      addAttachment({ type, url, name: match[1] || undefined });
    }
  }

  const matches = content.match(ASSISTANT_ATTACHMENT_URL_REGEX);
  if (!matches || matches.length === 0) return found;
  for (const candidate of matches) {
    const url = stripTrailingUrlPunctuation(candidate);
    const type = inferAttachmentTypeFromUrl(url);
    if (type) {
      addAttachment({ type, url });
    }
  }
  return found;
}

function sanitizeAssistantContentForAttachmentSurfaces(content, attachments) {
  if (typeof content !== 'string' || !content || !Array.isArray(attachments) || attachments.length === 0) {
    return content;
  }
  const attachmentUrls = new Set(
    attachments
      .map((attachment) => stripTrailingUrlPunctuation(String(attachment?.url || '').trim()))
      .filter(Boolean)
  );
  if (attachmentUrls.size === 0) return content;

  const keptLines = content.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;

    const imageMatch = trimmed.match(/^!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/i);
    const linkMatch = trimmed.match(/^\[[^\]]+\]\((https?:\/\/[^)\s]+)\)$/i);
    if (imageMatch && attachmentUrls.has(stripTrailingUrlPunctuation(imageMatch[1]))) return false;
    if (linkMatch && attachmentUrls.has(stripTrailingUrlPunctuation(linkMatch[1]))) return false;
    if (attachmentUrls.has(stripTrailingUrlPunctuation(trimmed))) return false;
    return true;
  });

  return keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function PdfFullTextCard({ text, pageCount }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  return (
    <div className="mt-2 rounded-lg border border-primary-foreground/20 overflow-hidden text-sm">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-primary-foreground/10 hover:bg-primary-foreground/15 transition-colors text-left"
      >
        <FileText className="w-4 h-4 shrink-0 opacity-80" />
        <span className="flex-1 font-medium opacity-90">
          {t('chat.document.view')}{pageCount ? ` (${t(pageCount === 1 ? 'chat.document.page_one' : 'chat.document.page_other', { count: pageCount })})` : ''}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 opacity-70" /> : <ChevronDown className="w-4 h-4 opacity-70" />}
      </button>
      {expanded && (
        <div className="px-3 py-3 max-h-96 overflow-y-auto bg-primary-foreground/5">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed opacity-90 font-sans">{text}</pre>
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message, conversationId, messageIndex, agentName = 'cbt_therapist', context = 'chat', userMessage, sessionLanguage, showFeedback = false }) {
  // Stage 1 runtime-path lock:
  // Shared bubble renderer used by multiple surfaces.
  // Therapist /Chat runtime reaches this component via pages/Chat.jsx -> MessageList.jsx.
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  // CRITICAL GATE 1: Strict null/undefined/empty gating
  if (!message || !message.role) {
    return null;
  }

  const isUser = message.role === 'user';
  const assistantAttachments = isUser ? [] : detectAssistantAttachments(message);
  const attachment = isUser ?
  normalizeAttachment(message.metadata?.attachment || message.attachment) :
  assistantAttachments[0] || null;

  // Resolve PDF full-text: prefer metadata field (set at send time),
  // fall back to scanning content for the [PDF_TEXT] marker (set by sanitizeConversationMessages).
  const pdfFullText = message.metadata?.pdf_extracted_text || null;
  const pdfPageCount = message.metadata?.pdf_page_count || null;
  const attachmentType = attachment?.type;
  const attachmentUrl = typeof attachment?.url === 'string' ? attachment.url : null;
  const attachmentName = typeof attachment?.name === 'string' && attachment.name.trim() ? attachment.name : null;
  const isImageAttachment = attachmentType === 'image' && !!attachmentUrl;
  const isPdfAttachment = attachmentType === 'pdf' && !!attachmentUrl;
  const isGenericFileAttachment = attachmentType === 'file' && !!attachmentUrl;
  const isAudioAttachment = attachmentType === 'audio' && !!attachmentUrl;
  const hasRenderableAttachment = isImageAttachment || isPdfAttachment || isGenericFileAttachment || isAudioAttachment;
  const generatedFiles = (() => {
    if (isUser) return [];
    const combined = [
      ...(normalizeGeneratedFile(message?.metadata?.generated_file) ? [message.metadata.generated_file] : []),
      ...((Array.isArray(message?.metadata?.generated_files) ? message.metadata.generated_files : [])
        .filter((item) => normalizeGeneratedFile(item)))
    ];
    const seen = new Set();
    return combined.filter((item) => {
      const key = String(item?.form_id || item?.url || '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  if (!message.content && !hasRenderableAttachment) {
    return null;
  }

  // CRITICAL GATE 2: TYPE CHECK - Content MUST be a string
  if (typeof message.content !== 'string' && !hasRenderableAttachment) {
    console.error('[MessageBubble] ⛔ FATAL: Content is not a string, type:', typeof message.content);
    return null;
  }

  // CRITICAL GATE 3: Content extraction with ZERO tolerance for raw/structured data
  let content = '';
  let thinkingContent = null;
  try {
    const rawContent = typeof message.content === 'string' ? message.content : '';
    // Strip [ATTACHMENT_CONTEXT] block and any agent-only runtime supplement blocks
    // from user messages — these are AI-facing context blocks that must never appear
    // in the visible chat.  stripAgentOnlyRuntimeBlocksFromUserContent is the same
    // canonical helper used by sanitizeConversationMessages and acts as a final
    // render defense for any message that bypassed the conversation-load sanitization.
    const contentStr = isUser
      ? stripAgentOnlyRuntimeBlocksFromUserContent(rawContent.replace(/\n?\[ATTACHMENT_CONTEXT\][\s\S]*$/, '').trim())
      : rawContent.trim();
    const hasRawToolCallMarkup = !isUser && /<\/?(?:tool_call|tool_calls|function_call|function_calls)\b[^>]*>/i.test(contentStr);

    // IMMEDIATE REJECT: Any sign of structured data
    if (contentStr.includes('"assistant_message"') ||
    contentStr.includes('"tool_calls"') ||
    hasRawToolCallMarkup ||
    contentStr.includes('"homework":{') ||
    contentStr.includes('"metadata"') ||
    contentStr.includes('"s":') ||
    contentStr.includes('\\u00') ||
    contentStr.startsWith('{') && contentStr.includes('"') ||
    contentStr.startsWith('[{') && contentStr.includes('"')) {
      console.error('[MessageBubble] ⛔ HARD BLOCK: Structured data rejected:', contentStr.substring(0, 50));
      return null;
    }

    // Extract AI thinking content before sanitization (assistant only)
    if (!isUser) {
      thinkingContent = extractThinkingContent(contentStr);
    }

    // V8-F + V8-G PRE-GOVERNOR GATE: Strip internal leading tags before the governor
    // runs. INTERNAL_PROCESS tags are removed; system_instruction tags are unwrapped.
    // Unterminated leading tags fail-closed so no internal tag text leaks to UI.
    let contentForGovernor = contentStr;
    if (!isUser) {
      const strippedInternalTags = stripLeadingInternalAssistantTags(contentForGovernor);
      if (strippedInternalTags.hidden) {
        console.log('[MessageBubble] Hiding internal-only assistant turn (pre-governor gate)');
        return null;
      }
      if (strippedInternalTags.removedAny) {
        contentForGovernor = String(strippedInternalTags.content || '').trim();
        console.warn('[MessageBubble] ⚠️ Stripped internal leading tag block before governor');
      }
    }
    if (!isUser && (!contentForGovernor || contentForGovernor.length < 1) && !hasRenderableAttachment) {
      console.log('[MessageBubble] Hiding internal-only assistant turn (pre-governor gate)');
      return null;
    }

    // CRITICAL: Apply Final Output Governor (CP12) — last gate before render
    // For assistant messages: runs full leakage + ask-back + worksheet-drift + routing-leakage passes
    // For user messages: pass through unchanged
    // NOTE: pass sessionLanguage (locked at conversation start) as opts.lang so the
    // governor uses the correct session language rather than auto-detecting from content.
    // Auto-detection alone is unreliable for Latin-script languages that share vocabulary
    // (e.g. Portuguese/Spanish).  If sessionLanguage is not provided, the governor falls
    // back to content-based detection.
    const sanitized = isUser ? contentForGovernor : applyFinalOutputGovernor(contentForGovernor, {
      lang: sessionLanguage || undefined,
      preserveCoachingResponse: context === 'coach',
      userMessage: userMessage || undefined,
    });
    content = !isUser ? sanitizeAssistantContentForAttachmentSurfaces(sanitized, assistantAttachments) : sanitized;
    // Apply lightweight markdown normalization to assistant messages before render.
    // This repairs malformed bold/italic tokens (e.g. "** word **", "**("text")**")
    // that the LLM occasionally emits without altering valid content.
    if (!isUser && content) {
      content = normalizeAssistantMarkdown(content);
    }

    // CRITICAL GATE 4: Final content validation
    if ((!content || content.length < 1) && !hasRenderableAttachment) {
      return null;
    }

    // CRITICAL GATE 5: Double-check no structured data leaked
    if (content.includes('{"') || content.includes('"}') || content.includes('[{') || content.includes('"content"')) {
      console.error('[MessageBubble] ⛔ HARD BLOCK: Final check failed:', content.substring(0, 50));
      return null;
    }

  } catch (e) {
    console.error('[MessageBubble] ⛔ Fatal error:', e);
    return null;
  }

  // Outer bubble direction: respect the session/UI language for layout (RTL for Hebrew).
  // Inner content elements use dir="auto" so that mixed RTL/LTR content (e.g. Hebrew
  // text with embedded English terms, URLs, or numbers) renders with correct Unicode
  // BiDi algorithm rather than forcing everything to a single direction.
  const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
  const handleAssistantPdfDownload = (url) => {
    if (isUser || !url || typeof url !== 'string') return;
    const fileRef = url.trim();
    if (!fileRef) return;
    // Navigate same-tab to the in-app PDF viewer route.
    // PdfViewer handles resolution for both static /forms/ paths and private file refs.
    navigate(`${PDF_VIEWER_ROUTE_PATH}?file=${encodeURIComponent(fileRef)}`);
  };

  return (
    <div className={cn('flex gap-2 sm:gap-3 py-2 px-1 sm:px-2', isUser ? 'justify-end' : 'justify-start')} dir={dir}>
      {!isUser &&
      <div className="bg-secondary/70 text-primary border border-border rounded-xl h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-sm)]" aria-label={t('common.ai_label')}>
          <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
        </div>
      }
      <div className={cn('max-w-[88%] sm:max-w-[82%] lg:max-w-[74%] min-w-0', isUser && 'flex flex-col items-end')}>
        {/* AI Thinking Process - collapsible, shown before the response */}
        {!isUser && thinkingContent &&
        <div className="mb-2 rounded-[var(--radius-control)] border border-border/70 bg-secondary/60 overflow-hidden">
            <button
            onClick={() => setThinkingExpanded((prev) => !prev)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary hover:bg-secondary transition-colors"
            aria-expanded={thinkingExpanded}>

              <span className="text-primary/70">✦</span>
              <span>{t('chat.ai_thinking.label')}</span>
              <span className="ml-auto text-primary/70">{thinkingExpanded ? '▲' : '▼'}</span>
            </button>
            {thinkingExpanded &&
          <div className="px-3 pb-3 pt-1 text-xs text-foreground whitespace-pre-wrap leading-relaxed border-t border-border/70">
                {thinkingContent}
              </div>
          }
          </div>
        }
        <div className={cn(
          'px-4 sm:px-5 py-3 rounded-2xl shadow-[var(--shadow-sm)] min-w-0',
          isUser
            ? 'bg-primary text-primary-foreground rounded-ee-md'
            : 'bg-[hsl(var(--card)/0.97)] text-foreground border border-border rounded-es-md backdrop-blur-sm'
        )}>







            {isUser ?
          <>
                {(isImageAttachment || isPdfAttachment || isAudioAttachment || isGenericFileAttachment) &&
            <div className="mb-3">
                    {isImageAttachment &&
              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                        <img
                  src={attachmentUrl}
                  alt={t('chat.attachments.image_preview_alt')}
                  className="max-w-full max-h-[180px] rounded-lg object-cover border border-primary-foreground/20" />
                      </a>
              }
                    {(isPdfAttachment || isGenericFileAttachment) &&
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-foreground/20 px-3 py-2 text-sm hover:bg-primary-foreground/10 transition-colors">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="min-w-0 truncate">{attachmentName || t(isPdfAttachment ? 'chat.attachments.pdf_chip_label' : 'chat_stage2.file_attachment')}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      </a>
              }
                    {isAudioAttachment &&
              <div className="rounded-lg border border-primary-foreground/20 px-3 py-2">
                        <audio controls preload="none" src={attachmentUrl} className="w-full max-w-[220px]" />
                      </div>
              }
                  </div>
            }
                {content ?
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] !text-primary-foreground" dir="auto">{content}</p> :
            null}
                {/* Collapsible full PDF text — stored in metadata.pdf_extracted_text at send time */}
                {isPdfAttachment && pdfFullText &&
            <PdfFullTextCard text={pdfFullText} pageCount={pdfPageCount} />
            }
              </> :

          <>
                {assistantAttachments.length > 0 &&
             <div className="mb-3">
                    {assistantAttachments.map((assistantAttachment, index) => {
                  const attachmentKey = `assistant-attachment-${assistantAttachment.url}-${index}`;
                  const isAttachmentImage = assistantAttachment.type === 'image';
                  const isAttachmentPdf = assistantAttachment.type === 'pdf';
                  const isAttachmentFile = assistantAttachment.type === 'file';
                  const isAttachmentAudio = assistantAttachment.type === 'audio';

                  if (isAttachmentImage) {
                    return (
                      <a key={attachmentKey} href={assistantAttachment.url} target="_blank" rel="noopener noreferrer" className="inline-block my-1">
                        <img
                  src={assistantAttachment.url}
                  alt={assistantAttachment.name || t('chat.attachments.image_preview_alt')}
                  className="max-w-[220px] max-h-[220px] rounded-lg object-cover border border-primary-foreground/20" />
                      </a>
                    );
                  }

                  if (isAttachmentPdf) {
                    const chipLabel = assistantAttachment.name || t('chat.attachments.pdf_chip_label');
                    return (
                      <button
                key={attachmentKey}
                type="button"
                onClick={() => handleAssistantPdfDownload(assistantAttachment.url)}
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-foreground/20 px-3 py-2 text-sm hover:bg-primary-foreground/10 transition-colors my-1">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="min-w-0 truncate">{chipLabel}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      </button>
                    );
                  }

                  if (isAttachmentFile) {
                    const chipLabel = assistantAttachment.name || assistantAttachment.url;
                    return (
                      <a
                key={attachmentKey}
                href={assistantAttachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-foreground/20 px-3 py-2 text-sm hover:bg-primary-foreground/10 transition-colors my-1">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="min-w-0 truncate">{chipLabel}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
                      </a>
                    );
                  }

                  if (isAttachmentAudio) {
                    return (
                      <div key={attachmentKey} className="rounded-lg border border-primary-foreground/20 px-3 py-2 my-1">
                        <audio controls preload="none" src={assistantAttachment.url} className="w-full max-w-[220px]" />
                      </div>
                    );
                  }

                  return null;
                })}
                   </div>
             }
                {content ?
            <div dir="auto"><ReactMarkdown
            className="prose prose-sm dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              code: ({ inline, className, children }) => {
                const safeClassName = String(className || '');
                const safeChildren = children || '';
                if (inline) {
                  return <code className="px-1 py-0.5 rounded bg-secondary text-foreground text-sm">{safeChildren}</code>;
                }
                return (
                  <pre className="bg-secondary rounded-lg p-3 my-2 overflow-x-auto">
                        <code className={safeClassName}>{safeChildren}</code>
                      </pre>);
              },
              // Render inline images from the AI (e.g. ![alt](url))
              img: ({ src, alt }) => {
                if (!src) return null;
                return (
                  <a href={src} target="_blank" rel="noopener noreferrer" className="inline-block my-2">
                    <img src={src} alt={alt || ''} className="max-w-full max-h-[260px] rounded-lg object-cover border border-primary-foreground/20" />
                  </a>
                );
              },
              // Render links — detect file links and show appropriate UI
              a: ({ href, children }) => {
                if (!href) return <span>{children}</span>;
                const fileType = inferAttachmentTypeFromUrl(href);
                if (fileType === 'image') {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block my-2">
                      <img src={href} alt={String(children || '')} className="max-w-full max-h-[260px] rounded-lg object-cover border border-primary-foreground/20" />
                    </a>
                  );
                }
                if (fileType === 'pdf') {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-foreground/20 px-3 py-2 text-sm hover:bg-primary-foreground/10 transition-colors my-1">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="min-w-0 truncate">{String(children || href)}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
                    </a>
                  );
                }
                if (fileType === 'file') {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-foreground/20 px-3 py-2 text-sm hover:bg-primary-foreground/10 transition-colors my-1">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="min-w-0 truncate">{String(children || href)}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
                    </a>
                  );
                }
                return <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 transition-opacity">{children}</a>;
              },
              p: ({ children }) =>
              <p dir="auto" className="my-2 leading-relaxed text-[15px]">{children || ''}</p>,

              ul: ({ children }) =>
              <ul dir="auto" className="my-2 ms-4 list-disc space-y-1">{children || ''}</ul>,

              ol: ({ children }) =>
              <ol dir="auto" className="my-2 ms-4 list-decimal space-y-1">{children || ''}</ol>,

              li: ({ children }) => <li className="my-1">{children || ''}</li>,
              strong: ({ children }) =>
              <strong className="font-semibold text-foreground">{children || ''}</strong>,

              em: ({ children }) => <em className="italic">{children || ''}</em>,
              blockquote: ({ children }) =>
              <blockquote dir="auto" className="border-s-4 border-primary/35 ps-4 my-3 italic text-muted-foreground">
                      {children || ''}
                    </blockquote>

            }}>

                  {content}
                  </ReactMarkdown></div> :
                  null}
                  </>
                  }
                  
                  {/* Assistant-generated downloadable file card */}
                  {!isUser && generatedFiles.length > 0 &&
          <div className="space-y-2">
                      {generatedFiles.map((generatedFile, index) => (
                        <GeneratedFileCard
                          key={`${generatedFile?.form_id || generatedFile?.url || 'generated'}-${index}`}
                          generatedFile={generatedFile} />
                      ))}
                    </div>
          }

                  {/* Feedback for assistant messages */}
                  {!isUser &&
          conversationId &&
          messageIndex !== undefined &&
          message?.metadata?.feedback_finality_verified === true &&
          Array.isArray(message?.metadata?.structured_data?.homework) &&
          message.metadata.structured_data.homework.length > 0 &&
          <ExperimentMetricsCard
            structuredData={message.metadata.structured_data}
            conversationId={conversationId}
            messageIndex={messageIndex} />
          }

                  {/* Feedback for assistant messages */}
                  {!isUser &&
          showFeedback &&
          conversationId &&
          messageIndex !== undefined &&
          message?.metadata?.feedback_finality_verified === true &&
          <MessageFeedback
            conversationId={conversationId}
            messageIndex={messageIndex}
            agentName={agentName}
            context={context} />

          }
                  </div>
                  </div>
      {isUser &&
      <div className="bg-primary text-primary-foreground rounded-xl h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-sm)]" aria-label={t('common.you_label')}>
          <UserRound className="w-4 h-4 shrink-0" aria-hidden="true" />
        </div>
      }
    </div>);

}
