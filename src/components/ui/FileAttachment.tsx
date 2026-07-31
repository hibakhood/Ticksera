import { FileText, File, Download, FileSpreadsheet } from 'lucide-react';

interface FileAttachmentProps {
  url: string;
  name: string;
  type: string;
  isMe?: boolean;
  onImageClick?: () => void;
}

function getFileIcon(type: string, name: string) {
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return { Icon: FileText, color: 'text-red-400', label: 'PDF', bg: 'bg-red-50 dark:bg-red-900/20' };
  }
  if (type.includes('word') || name.match(/\.docx?$/i)) {
    return { Icon: FileText, color: 'text-blue-400', label: 'DOC', bg: 'bg-blue-50 dark:bg-blue-900/20' };
  }
  if (type.includes('excel') || type.includes('spreadsheet') || name.match(/\.xlsx?$/i) || name.endsWith('.csv')) {
    return { Icon: FileSpreadsheet, color: 'text-green-400', label: 'XLS', bg: 'bg-green-50 dark:bg-green-900/20' };
  }
  if (type.includes('presentation') || name.match(/\.pptx?$/i)) {
    return { Icon: FileText, color: 'text-orange-400', label: 'PPT', bg: 'bg-orange-50 dark:bg-orange-900/20' };
  }
  if (type.startsWith('text/') || name.endsWith('.txt')) {
    return { Icon: FileText, color: 'text-gray-400', label: 'TXT', bg: 'bg-gray-50 dark:bg-gray-800' };
  }
  return { Icon: File, color: 'text-gray-400', label: 'FILE', bg: 'bg-gray-50 dark:bg-gray-800' };
}

function formatBytes(url: string) {
  const base64Length = url.length - (url.indexOf(',') + 1);
  const bytes = Math.ceil((base64Length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileAttachment({ url, name, type, isMe, onImageClick }: FileAttachmentProps) {
  if (type.startsWith('image/')) {
    return (
      <button
        onClick={onImageClick}
        className="block mb-1.5 rounded-xl overflow-hidden max-w-[200px] hover:opacity-90 transition-opacity"
      >
        <img src={url} alt={name} className="w-full rounded-xl" />
      </button>
    );
  }

  const { Icon, color, label, bg } = getFileIcon(type, name);
  const size = formatBytes(url);

  return (
    <a
      href={url}
      download={name}
      onClick={e => e.stopPropagation()}
      className={`flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5 max-w-[240px] transition-colors group ${
        isMe
          ? 'bg-white/15 hover:bg-white/25'
          : `${bg} hover:brightness-95`
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-white dark:bg-gray-700'}`}>
        <Icon className={`w-4 h-4 ${isMe ? 'text-white' : color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{name}</p>
        <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>{label} · {size}</p>
      </div>
      <Download className={`w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-white' : 'text-gray-400'}`} />
    </a>
  );
}
