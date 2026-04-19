// lib/services/documentEngine.ts
// TYPE FIX: explicit Document type instead of implicit any

export interface DocumentBase {
  id: string;
  companyId: string;
  type?: string;
  [key: string]: unknown;
}

export function processDocument(document: DocumentBase): void {
  console.log('[DocumentEngine] Processing:', document.id);
}

export function validateDocument(document: DocumentBase): boolean {
  if (!document.id || !document.companyId) return false;
  return true;
}

export function enrichDocument(document: DocumentBase): DocumentBase {
  return { ...document, processed: true };
}

export function transformDocument(document: DocumentBase): DocumentBase {
  return { ...document };
}

export function archiveDocument(document: DocumentBase): void {
  console.log('[DocumentEngine] Archiving:', document.id);
}

export function deleteDocument(document: DocumentBase): void {
  console.log('[DocumentEngine] Deleting:', document.id);
}

export function exportDocument(document: DocumentBase): DocumentBase {
  return { ...document };
}
