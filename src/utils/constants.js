// ============================================
// FacturApp - Constants & Configuration
// ============================================

export const APP_NAME = 'FacturApp';

export const ROUTES = {
  DASHBOARD: 'dashboard',
  INVOICES: 'invoices',
  CREATE_INVOICE: 'create-invoice',
  EDIT_INVOICE: 'edit-invoice',
  VIEW_INVOICE: 'view-invoice',
  SCAN_QR: 'scan-qr',
};

export const INVOICE_STATUS = {
  DRAFT: 'borrador',
  EMITTED: 'emitida',
  CANCELLED: 'anulada',
};

export const IVA_RATES = [
  { label: '21% (General)', value: 21 },
  { label: '10% (Reducido)', value: 10 },
  { label: '4% (Super reducido)', value: 4 },
  { label: '0% (Exento)', value: 0 },
];

export const PDF_TEMPLATES = [
  { id: 'classic', name: 'Clásica', description: 'Formal y corporativa', icon: 'fileDoc' },
  { id: 'modern', name: 'Moderna', description: 'Diseño actual con colores', icon: 'palette' },
  { id: 'minimal', name: 'Minimalista', description: 'Limpia y sencilla', icon: 'sparkles' },
];

export const STORAGE_KEYS = {
  INVOICES: 'facturapp_invoices',
  SETTINGS: 'facturapp_settings',
  THEME: 'facturapp_theme',
  NEXT_NUMBER: 'facturapp_next_number',
};

export const DEFAULT_EMITTER = {
  name: 'Mi Empresa S.L.',
  nif: 'B12345678',
  address: 'Calle Principal 1',
  city: 'Madrid',
  postalCode: '28001',
  country: 'España',
  email: 'contacto@miempresa.es',
  phone: '+34 912 345 678',
};
