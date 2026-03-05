// components/clients/ClientActions.tsx
'use client';

type Props = {
  isNew: boolean;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ClientActions({ isNew, saving, dirty, onSave, onClose, onArchive, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
      <div>
        {!isNew && (
          <div className="flex items-center gap-2">
            <button onClick={onArchive}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors">
              Archive
            </button>
            <button onClick={onDelete}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors">
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onClose}
          className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
          Close
        </button>
        <button onClick={onSave} disabled={saving || (!dirty && !isNew)}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
