import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink, Download, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { normalizeGeneratedFile } from './utils/normalizeGeneratedFile';
import { downloadPdfFile } from './utils/downloadPdfFile';
import { getFormDownloadUrl, PDF_VIEWER_ROUTE_PATH } from './utils/formFileUrls';
import { resolveWorksheetFileUrl } from './utils/worksheetFileResolver';

export { normalizeGeneratedFile };

export default function GeneratedFileCard({ generatedFile }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  const normalized = normalizeGeneratedFile(generatedFile);
  if (!normalized) return null;

  const displayTitle = normalized.title || normalized.name;
  const description = normalized.description;
  const isBusy = isDownloading;

  const resolveUrl = async () => {
    const { url } = await resolveWorksheetFileUrl(normalized.url, {
      sourceRecord: generatedFile,
      coreIntegration: base44?.integrations?.Core,
      entities: base44?.entities,
    });
    return url;
  };

  const handleOpen = () => {
    if (isBusy) return;
    const fileRef = normalized.url?.trim();
    if (!fileRef) return;
    // Navigate same-tab to the in-app PDF viewer route.
    // PdfViewer handles resolution for both static /forms/ paths and private file refs.
    navigate(`${PDF_VIEWER_ROUTE_PATH}?file=${encodeURIComponent(fileRef)}`);
  };

  const handleDownload = async () => {
    if (isBusy) return;
    setIsDownloading(true);
    try {
      const resolvedUrl = await resolveUrl();
      const downloadUrl = getFormDownloadUrl(resolvedUrl);
      if (!downloadUrl) throw new Error('Could not build download URL');
      await downloadPdfFile(downloadUrl, normalized.name);
    } catch (error) {
      console.error('[GeneratedFileCard] Download failed:', {
        fileValue: normalized.url,
        reason: error?.message || error,
      });
      toast({
        title: t('chat.generated_file.download_error_title'),
        description: t('chat.generated_file.download_error_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      data-testid="generated-file-card"
      data-language={normalized.language || ''}
      data-form-id={normalized.form_id || ''}
      data-is-combined-pdf={normalized.isCombinedPdf ? 'true' : 'false'}
      className="mt-3 rounded-xl border border-border bg-secondary/50 text-foreground overflow-hidden"
    >
      {/* Card header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex-shrink-0 rounded-lg bg-secondary p-2">
          <FileText className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug break-words">
            {displayTitle}
          </p>
          {description && (
            <p className="mt-0.5 text-xs text-foreground/80 leading-snug line-clamp-2">
              {description}
            </p>
          )}
          <p className="mt-1 text-xs text-foreground/80 uppercase tracking-wide font-medium">
            {t('chat.generated_file.type_label', 'PDF')}
          </p>
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex border-t border-border">
        <button
          type="button"
          data-testid="generated-file-open"
          onClick={handleOpen}
          disabled={isBusy}
          className="min-h-11 min-w-0 flex-1 flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground border-e border-border disabled:opacity-60"
        >
          <>
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="break-words">{t('chat.generated_file.open_button', 'Open')}</span>
          </>
        </button>
        <button
          type="button"
          data-testid="generated-file-download"
          onClick={handleDownload}
          disabled={isBusy}
          className="min-h-11 min-w-0 flex-1 flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground disabled:opacity-60"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="break-words">{t('chat.generated_file.downloading', 'Downloading...')}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span className="break-words">{
                normalized.category === 'workbook_series'
                  ? t('chat.generated_file.download_workbook_button', 'Download Workbook')
                  : t('chat.generated_file.download_button', 'Download')
              }</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
