import React, { useEffect, useState } from 'react';
import { Download, FileText, Trash2, Loader2 } from 'lucide-react';
import { TaskAttachment } from '../../types';
import { resolveAttachmentUrl } from '../../utils/attachmentUrl';

interface AttachmentRowProps {
  attachment: TaskAttachment;
  onDelete: (id: string, name: string) => void;
}

/**
 * Renders one attachment, resolving its stored Storage path into a short-lived
 * signed URL on mount. Keeps long-lived URLs out of the database.
 */
export const AttachmentRow: React.FC<AttachmentRowProps> = ({ attachment, onDelete }) => {
  const [url, setUrl] = useState<string>('');
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsResolving(true);

    resolveAttachmentUrl(attachment.url)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .finally(() => {
        if (!cancelled) setIsResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attachment.url]);

  const isImage = (attachment.type || '').startsWith('image/');

  return (
    <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        {isImage && url ? (
          <img
            src={url}
            alt={attachment.name}
            className="w-6 h-6 rounded object-cover shrink-0"
          />
        ) : (
          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
        )}
        <span className="truncate text-slate-800 font-medium text-[11px]">
          {attachment.name}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isResolving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
        ) : url ? (
          <a
            href={url}
            download={attachment.name}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        ) : (
          <span
            className="p-1 text-slate-300 cursor-not-allowed"
            title="This file is no longer available in storage"
          >
            <Download className="w-3.5 h-3.5" />
          </span>
        )}
        <button
          type="button"
          onClick={() => onDelete(attachment.id, attachment.name)}
          className="p-1 text-slate-400 hover:text-rose-600 rounded"
          title="Delete attachment"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
