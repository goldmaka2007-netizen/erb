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
