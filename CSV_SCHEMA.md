# Standardized CSV Schema Specification (Version 1)

## Overview

The Loan Tracking application implements a versioned, portable CSV storage schema to ensure users can export, inspect in spreadsheet software (Microsoft Excel, Google Sheets, LibreOffice), and restore their loan records offline without data loss.

---

## 1. File Format Standards

- **Encoding**: UTF-8 with optional Byte Order Mark (`\uFEFF`) for seamless character display in Excel.
- **Line Terminology**: Windows standard CRLF (`\r\n`) or Unix LF (`\n`).
- **Escaping**: Adheres to RFC 4180:
  - Fields containing commas, quotation marks, or line breaks are enclosed in double quotes (`"`).
  - Internal double quotes are escaped by doubling them (`""`).
- **Column Order**: Strictly ordered as defined in the header row.

---

## 2. Header Columns

```csv
schemaVersion,recordType,loanId,entityId,date,amount,principal,interest,status,frequency,amountType,treatment,description,metadata
```

| Column | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `schemaVersion` | Integer | Yes | Format version number. Current version is `1`. |
| `recordType` | String | Yes | Record entity discriminator (see section 3). |
| `loanId` | String | Yes | Unique ID of the loan to which this record belongs. |
| `entityId` | String | Yes | Unique identifier of this specific entity instance. |
| `date` | LocalDate | Yes | Calendar date formatted strictly as `YYYY-MM-DD`. |
| `amount` | Decimal | No | Monetary value in Indian Rupees (₹), up to 2 decimal places. |
| `principal` | Decimal | No | Principal component in Rupees (if applicable). |
| `interest` | Decimal | No | Interest component in Rupees, or interest rate percentage. |
| `status` | String | No | Status tag: `ACTIVE`, `CLOSED`, `ACTUAL`, `PLANNED`, `CANCELLED`. |
| `frequency` | String | No | Recurrence frequency: `MONTHLY`, `QUARTERLY`, `YEARLY`. |
| `amountType` | String | No | `FIXED` or `PERCENTAGE`. |
| `treatment` | String | No | Repayment treatment: `REDUCE_TENURE` or `REDUCE_EMI`. |
| `description` | String | No | Human-readable title or notes. |
| `metadata` | JSON | No | JSON-encoded dictionary storing extensible parameters. |

---

## 3. Record Types

### A. `LOAN`
Represents the primary loan configuration:
- `amount`: Original principal in Rupees (e.g. `5000000.00`).
- `interest`: Annual interest rate (e.g. `8.50`).
- `date`: Disbursement/start date.
- `treatment`: `REDUCE_TENURE` or `REDUCE_EMI`.
- `metadata`: `{"firstEmiDate":"2026-11-05","originalTenureMonths":240,"interestMethod":"MONTHLY_REDUCING_BALANCE","currency":"INR"}`

### B. `BROKEN_PERIOD`
Represents initial broken-period parameters:
- `date`: Broken period start date.
- `treatment`: `INTEREST_ONLY`, `INTEREST_PLUS_PRINCIPAL`, `CAPITALIZE_INTEREST`, or `USER_ENTERED`.
- `amount`: Custom total payment (if user entered).
- `metadata`: `{"endDate":"2026-11-05","dayCount":"ACTUAL_365"}`

### C. `PAYMENT` and `PART_PAYMENT`
Represents specific transaction events:
- `amount`: Total payment amount in Rupees.
- `status`: `ACTUAL` (historical bank-cleared payment) or `PLANNED` (future assumption).

### D. `PART_PAYMENT_RULE`
Represents recurring prepayment strategies:
- `frequency`: `MONTHLY`, `QUARTERLY`, or `YEARLY`.
- `amountType`: `FIXED` or `PERCENTAGE`.
- `amount`: Prepayment amount (Rupees if fixed, or percentage number if percentage-based).
- `treatment`: `REDUCE_TENURE` or `REDUCE_EMI`.

### E. `PART_PAYMENT_OVERRIDE`
Represents a specific monthly override:
- `date`: Month to override.
- `amount`: Prepayment amount in that month.
- `status`: `CANCELLED` if payment in this month is skipped (₹0).

### F. `SCENARIO`
Represents a saved what-if scenario comparison:
- `amount`: Additional monthly prepayment amount.
- `treatment`: `REDUCE_TENURE` or `REDUCE_EMI`.
- `metadata`: `{"description":"Aggressive prepayment","oneTimePayments":[]}`

