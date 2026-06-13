import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, real, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  firebaseId: text('firebase_id'), // Mapping to original
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const operations = pgTable('operations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sectionId: integer('section_id').references(() => sections.id).notNull(),
  firebaseId: text('firebase_id'), // Mapping to original
  name: text('name').notNull(),
  formConfig: text('form_config').notNull(), // JSON string
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  operationId: integer('operation_id').references(() => operations.id).notNull(),
  firebaseId: text('firebase_id'), // Mapping to original
  
  transactionDate: text('transaction_date'),
  invoiceNumber: text('invoice_number'),
  operationType: text('operation_type'),
  debitAccount: text('debit_account'),
  creditAccount: text('credit_account'),
  cashAmount: real('cash_amount'),
  weight: real('weight'),
  caliber: real('caliber'),
  weightArabic: real('weight_arabic'),
  quantity: real('quantity'),
  
  customerName: text('customer_name'),
  phoneNumber: text('phone_number'),
  marketPrice: real('market_price'),
  factor: real('factor'),
  notes: text('notes'),
  transactionIdString: text('transaction_id_string'),
  
  data: jsonb('data'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
