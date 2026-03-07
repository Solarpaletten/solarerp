// components/select/index.ts
// ═══════════════════════════════════════════════════
// Task 57_1: Entity Selection Dialogs — barrel export
// ═══════════════════════════════════════════════════
// 7 SelectDialogs: Product, Client, Account, Warehouse,
//                  OperationType, VATRate, Employee

export { EntitySelectDialog } from './EntitySelectDialog';
export type { EntityColumn, EntitySelectDialogProps } from './EntitySelectDialog';

export { ProductSelectDialog } from './ProductSelectDialog';
export type { ProductEntity } from './ProductSelectDialog';

export { ClientSelectDialog } from './ClientSelectDialog';
export type { ClientEntity } from './ClientSelectDialog';

export { AccountSelectDialog } from './AccountSelectDialog';
export type { AccountEntity } from './AccountSelectDialog';

export { WarehouseSelectDialog } from './WarehouseSelectDialog';
export type { WarehouseEntity } from './WarehouseSelectDialog';

export { OperationTypeSelectDialog } from './OperationTypeSelectDialog';
export type { OperationTypeEntity } from './OperationTypeSelectDialog';

export { VATRateSelectDialog } from './VATRateSelectDialog';
export type { VATRateEntity } from './VATRateSelectDialog';

export { EmployeeSelectDialog } from './EmployeeSelectDialog';
export type { EmployeeEntity } from './EmployeeSelectDialog';
