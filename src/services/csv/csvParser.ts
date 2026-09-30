import {
  Loan,
  LoanEvent,
  PartPaymentOverride,
  PartPaymentRule,
  Scenario,
} from '../../domain/loan/types';
import { rupeesToPaise } from '../../domain/loan/money';
import { isValidLocalDate } from '../../domain/loan/dates';
import {
  CSV_HEADERS,
  CsvRecord,
  CSV_SCHEMA_VERSION,
  ExportDataPayload,
} from './csvSerializer';

export interface CsvImportResult {
  success: boolean;
  summary: {
    loansCount: number;
    eventsCount: number;
    rulesCount: number;
    overridesCount: number;
    scenariosCount: number;
  };
  warnings: string[];
  errors: string[];
  data?: ExportDataPayload;
}

/**
 * Standard RFC 4180 CSV parser handling quotes, escaped quotes (""), and multiline content.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  // Handle optional UTF-8 BOM
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses and validates CSV content into domain records.
 */
export function parseAndValidateCsv(csvText: string): CsvImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rows = parseCsvRows(csvText);
  if (rows.length < 1) {
    return {
      success: false,
      summary: { loansCount: 0, eventsCount: 0, rulesCount: 0, overridesCount: 0, scenariosCount: 0 },
      warnings: [],
      errors: ['The CSV file is empty.'],
    };
  }

  const headerRow = rows[0]!;
  const headerMap = new Map<string, number>();
  headerRow.forEach((col, idx) => {
    headerMap.set(col.trim(), idx);
  });

  // Check required headers
  for (const requiredHeader of CSV_HEADERS) {
    if (!headerMap.has(requiredHeader)) {
      errors.push(`Missing required column header: ${requiredHeader}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      summary: { loansCount: 0, eventsCount: 0, rulesCount: 0, overridesCount: 0, scenariosCount: 0 },
      warnings,
      errors,
    };
  }

  const loansMap = new Map<string, Loan>();
  const events: LoanEvent[] = [];
  const rules: PartPaymentRule[] = [];
  const overrides: PartPaymentOverride[] = [];
  const scenarios: Scenario[] = [];

  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx]!;
    const getField = (name: keyof CsvRecord): string => {
      const idx = headerMap.get(name);
      return idx !== undefined && idx < row.length ? (row[idx] ?? '').trim() : '';
    };

    const schemaVersionStr = getField('schemaVersion');
    const version = parseInt(schemaVersionStr, 10);
    if (isNaN(version) || version !== CSV_SCHEMA_VERSION) {
      warnings.push(`Row ${rIdx + 1}: Unsupported schemaVersion "${schemaVersionStr}". Expected ${CSV_SCHEMA_VERSION}.`);
      continue;
    }

    const recordType = getField('recordType');
    const loanId = getField('loanId');
    const entityId = getField('entityId');
    const date = getField('date');
    const amountStr = getField('amount');
    const principalStr = getField('principal');
    const interestStr = getField('interest');
    const status = getField('status');
    const treatment = getField('treatment');
    const description = getField('description');
    const metadataStr = getField('metadata');

    let metadata: Record<string, unknown> = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        warnings.push(`Row ${rIdx + 1}: Malformed JSON in metadata.`);
      }
    }

    switch (recordType) {
      case 'LOAN': {
        const principalRupees = parseFloat(principalStr || amountStr);
        const rate = parseFloat(interestStr);
        if (isNaN(principalRupees) || principalRupees <= 0) {
          errors.push(`Row ${rIdx + 1}: Invalid principal for loan ${entityId}`);
          break;
        }
        if (isNaN(rate) || rate < 0) {
          errors.push(`Row ${rIdx + 1}: Invalid interest rate for loan ${entityId}`);
          break;
        }
        if (!isValidLocalDate(date)) {
          errors.push(`Row ${rIdx + 1}: Invalid start date "${date}" for loan ${entityId}`);
          break;
        }

        const tenureMonths = typeof metadata['originalTenureMonths'] === 'number'
          ? metadata['originalTenureMonths']
          : 120;
        const firstEmiDate = typeof metadata['firstEmiDate'] === 'string' && isValidLocalDate(metadata['firstEmiDate'])
          ? metadata['firstEmiDate']
          : date;

        const loan: Loan = {
          id: entityId,
          name: description || 'Imported Loan',
          currency: 'INR',
          originalPrincipal: rupeesToPaise(principalRupees),
          annualInterestRate: rate,
          originalTenureMonths: tenureMonths,
          startDate: date,
          firstEmiDate,
          repaymentFrequency: 'MONTHLY',
          repaymentMode: treatment === 'REDUCE_EMI' ? 'REDUCE_EMI' : 'REDUCE_TENURE',
          interestMethod: 'MONTHLY_REDUCING_BALANCE',
          status: status === 'CLOSED' ? 'CLOSED' : 'ACTIVE',
          createdAt: typeof metadata['createdAt'] === 'string' ? metadata['createdAt'] : new Date().toISOString(),
          updatedAt: typeof metadata['updatedAt'] === 'string' ? metadata['updatedAt'] : new Date().toISOString(),
          notes: typeof metadata['notes'] === 'string' ? metadata['notes'] : undefined,
        };
        loansMap.set(entityId, loan);
        break;
      }

      case 'BROKEN_PERIOD': {
        const targetLoan = loansMap.get(loanId);
        if (!targetLoan) {
          warnings.push(`Row ${rIdx + 1}: Broken period refers to unknown loan "${loanId}". Ignored.`);
          break;
        }
        const endDate = typeof metadata['endDate'] === 'string' ? metadata['endDate'] : date;
        const treatmentVal = treatment as 'INTEREST_ONLY' | 'INTEREST_PLUS_PRINCIPAL' | 'CAPITALIZE_INTEREST' | 'USER_ENTERED';
        targetLoan.brokenPeriod = {
          startDate: date,
          endDate,
          treatment: treatmentVal || 'INTEREST_ONLY',
          dayCount: 'ACTUAL_365',
          customInterest: interestStr ? rupeesToPaise(parseFloat(interestStr)) : undefined,
          customPrincipal: principalStr ? rupeesToPaise(parseFloat(principalStr)) : undefined,
          customTotal: amountStr ? rupeesToPaise(parseFloat(amountStr)) : undefined,
        };
        break;
      }

      case 'PAYMENT':
      case 'PART_PAYMENT': {
        const amt = parseFloat(amountStr);
        if (isNaN(amt) || amt < 0) {
          warnings.push(`Row ${rIdx + 1}: Invalid payment amount "${amountStr}". Skipped.`);
          break;
        }
        if (!isValidLocalDate(date)) {
          warnings.push(`Row ${rIdx + 1}: Invalid date "${date}". Skipped.`);
          break;
        }

        const type = recordType === 'PART_PAYMENT' ? 'PART_PAYMENT' : 'EMI';
        events.push({
          id: entityId || `event-${Date.now()}-${rIdx}`,
          loanId,
          date,
          type,
          status: status === 'ACTUAL' ? 'ACTUAL' : 'PLANNED',
          amount: rupeesToPaise(amt),
          principalComponent: principalStr ? rupeesToPaise(parseFloat(principalStr)) : undefined,
          interestComponent: interestStr ? rupeesToPaise(parseFloat(interestStr)) : undefined,
          source: 'CSV_IMPORT',
          notes: description || undefined,
          createdAt: typeof metadata['createdAt'] === 'string' ? metadata['createdAt'] : new Date().toISOString(),
          updatedAt: typeof metadata['updatedAt'] === 'string' ? metadata['updatedAt'] : new Date().toISOString(),
        });
        break;
      }

      case 'PART_PAYMENT_RULE': {
        const amt = parseFloat(amountStr);
        const amtType = getField('amountType') === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
        const freq = getField('frequency');
        const frequency = freq === 'QUARTERLY' || freq === 'YEARLY' ? freq : 'MONTHLY';

        rules.push({
          id: entityId || `rule-${Date.now()}-${rIdx}`,
          loanId,
          startDate: date,
          endDate: typeof metadata['endDate'] === 'string' ? metadata['endDate'] : undefined,
          frequency,
          amountType: amtType,
          amount: amtType === 'FIXED' ? rupeesToPaise(amt) : amt,
          treatment: treatment === 'REDUCE_EMI' ? 'REDUCE_EMI' : 'REDUCE_TENURE',
          status: status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
          notes: description || undefined,
          createdAt: typeof metadata['createdAt'] === 'string' ? metadata['createdAt'] : new Date().toISOString(),
          updatedAt: typeof metadata['updatedAt'] === 'string' ? metadata['updatedAt'] : new Date().toISOString(),
        });
        break;
      }

      case 'PART_PAYMENT_OVERRIDE': {
        const amt = parseFloat(amountStr);
        const isCancelled = status === 'CANCELLED' || Boolean(metadata['cancelled']);

        overrides.push({
          id: entityId || `ov-${Date.now()}-${rIdx}`,
          loanId,
          date,
          amount: isCancelled ? 0 : rupeesToPaise(isNaN(amt) ? 0 : amt),
          cancelled: isCancelled,
          notes: description || undefined,
          createdAt: typeof metadata['createdAt'] === 'string' ? metadata['createdAt'] : new Date().toISOString(),
          updatedAt: typeof metadata['updatedAt'] === 'string' ? metadata['updatedAt'] : new Date().toISOString(),
        });
        break;
      }

      case 'SCENARIO': {
        const extraPayment = parseFloat(amountStr);
        const oneTimePayments = Array.isArray(metadata['oneTimePayments'])
          ? (metadata['oneTimePayments'] as Array<{ id: string; date: string; amount: number }>)
          : [];

        scenarios.push({
          id: entityId || `scen-${Date.now()}-${rIdx}`,
          loanId,
          name: description || 'Imported Scenario',
          description: typeof metadata['description'] === 'string' ? metadata['description'] : undefined,
          additionalMonthlyPayment: isNaN(extraPayment) ? 0 : rupeesToPaise(extraPayment),
          oneTimePayments,
          repaymentMode: treatment === 'REDUCE_EMI' ? 'REDUCE_EMI' : 'REDUCE_TENURE',
          startDate: date || undefined,
          endDate: typeof metadata['endDate'] === 'string' ? metadata['endDate'] : undefined,
          createdAt: typeof metadata['createdAt'] === 'string' ? metadata['createdAt'] : new Date().toISOString(),
          updatedAt: typeof metadata['updatedAt'] === 'string' ? metadata['updatedAt'] : new Date().toISOString(),
        });
        break;
      }

      default:
        warnings.push(`Row ${rIdx + 1}: Unrecognized recordType "${recordType}". Skipped.`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      summary: {
        loansCount: 0,
        eventsCount: 0,
        rulesCount: 0,
        overridesCount: 0,
        scenariosCount: 0,
      },
      warnings,
      errors,
    };
  }

  const loans = Array.from(loansMap.values());

  return {
    success: true,
    summary: {
      loansCount: loans.length,
      eventsCount: events.length,
      rulesCount: rules.length,
      overridesCount: overrides.length,
      scenariosCount: scenarios.length,
    },
    warnings,
    errors,
    data: {
      loans,
      events,
      rules,
      overrides,
      scenarios,
    },
  };
}

