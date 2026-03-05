// components/purchases/PurchaseActions.tsx
// ═══════════════════════════════════════════════════
// Task 49: Purchase Document Actions
// ═══════════════════════════════════════════════════

'use client';

type Props = {
  status: string;
  saving: boolean;
  posting: boolean;
  dirty: boolean;
  onSave: () => void;
  onPost: () => void;
  onCopy: () => void;
  onCancel: () => void;
  onClose: () => void;
  saveMsg?: string | null;
};

export function PurchaseActions({
  status, saving, posting, dirty,
  onSave, onPost, onCopy, onCancel, onClose,
  saveMsg,
}: Props) {
  const isDraft = status === 'DRAFT';
  const isPosted = status === 'POSTED';
  const disabled = saving || posting;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {saveMsg && <span className="text-xs text-emerald-600 font-medium">{saveMsg}</span>}
      </div>
      <div className="flex items-center gap-2">
        {/* Always: Close */}
        <button onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
          Close
        </button>

        {/* Always: Copy */}
        <button onClick={onCopy} disabled={disabled}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-40 transition-colors">
          Copy
        </button>

        {/* Posted: Cancel */}
        {isPosted && (
          <button onClick={onCancel} disabled={disabled}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-40 transition-colors">
            Cancel (Storno)
          </button>
        )}

        {/* Draft: Save */}
        {isDraft && (
          <button onClick={onSave} disabled={disabled || !dirty}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}

        {/* Draft: Post */}
        {isDraft && (
          <button onClick={onPost} disabled={disabled}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors">
            {posting ? 'Posting...' : 'Post'}
          </button>
        )}
      </div>
    </div>
  );
}
