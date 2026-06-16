// Type definitions for the Gold and Precious Metals Accounting System

export interface Section {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select
  _rawOptions?: string; // transient raw string for UI
  defaultValue?: string | number | boolean;
  hidden?: boolean;
  readonly?: boolean;
}

export interface Operation {
  id: string;
  userId: string;
  sectionId: string;
  name: string;
  formConfig: string; // JSON string of FormField[]
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  operationId: string;
  // Core Accounting Fields
  transactionDate?: string;
  invoiceNumber?: string;
  operationType?: string;
  debitAccount?: string;
  creditAccount?: string;
  cashAmount?: number;
  weight?: number;
  caliber?: number;
  weightArabic?: number;
  quantity?: number;
  customerName?: string;
  phoneNumber?: string;
  marketPrice?: number;
  factor?: number;
  notes?: string;
  transactionId?: string;
  // Dynamic fields
  data?: string; // JSON string of dynamic form data
  createdAt: number;
  updatedAt: number;
  [key: string]: any; // Allow for other dynamic fields
}

export const STANDARD_COLUMNS: FormField[] = [
  { name: 'transaction_date', label: 'التاريخ', type: 'date', required: false },
  { name: 'invoice_number', label: 'رقم الفاتورة', type: 'text', required: false },
  { name: 'debit_account', label: 'حساب المدين (من حساب)', type: 'select', options: ['الخزنة', 'تيفيت الكسر', 'مخزون الذهب عيار 18', 'مخزون الذهب عيار 21', 'مخزون الذهب عيار 24', 'كسر افرنجي', 'الصافي'], required: false },
  { name: 'credit_account', label: 'حساب الدائن (إلى حساب)', type: 'select', options: ['الخزنة', 'تيفيت الكسر', 'مخزون الذهب عيار 18', 'مخزون الذهب عيار 21', 'مخزون الذهب عيار 24', 'كسر افرنجي', 'الصافي'], required: false },
  { name: 'cash_amount', label: 'المبلغ نقداً', type: 'number', required: false },
  { name: 'weight', label: 'الوزن القائم', type: 'number', required: false },
  { name: 'caliber', label: 'العيار', type: 'number', required: false },
  { name: 'factor', label: 'المعامل', type: 'number', required: false },
  { name: 'market_price', label: 'سعر السوق', type: 'number', required: false },
  { name: 'weight_arabic', label: 'الوزن العربي', type: 'number', required: false, readonly: true },
  { name: 'quantity', label: 'العدد', type: 'number', required: false },
  { name: 'customer_name', label: 'اسم العميل', type: 'text', required: false },
  { name: 'phone_number', label: 'رقم التليفون', type: 'text', required: false },
  { name: 'notes', label: 'ملاحظات', type: 'text', required: false }
];
