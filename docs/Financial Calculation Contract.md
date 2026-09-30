# Financial Calculation Contract

## Loan Tracking & Prepayment Analytics Application

### Version 1.0

This document defines the authoritative financial calculation behavior of the application.

The calculation engine MUST implement this contract exactly.

If UI requirements conflict with this document, the calculation contract takes precedence.

---

# 1. Purpose

The calculation engine provides deterministic calculations for:

* Loan principal
* EMI
* Interest
* Principal repayment
* Broken-period interest
* Actual payments
* Planned payments
* Part-payments
* Recurring part-payment rules
* Part-payment overrides
* Reduce-tenure calculations
* Reduce-EMI calculations
* Loan closure
* Remaining principal
* Remaining interest
* Interest savings
* Tenure savings
* Future scenarios

The engine is a **calculation model**, not a lender statement reconciliation engine.

Actual lender calculations may differ because of lender-specific:

* day-count conventions
* rounding
* payment timing
* holidays
* fees
* interest capitalization
* prepayment rules
* rate-reset rules

Such differences must be clearly communicated to users.

---

# 2. Supported Version

Current contract:

```text
FCC_VERSION = 1.0
```

Every calculation result should carry the contract version.

Example:

```ts
{
  calculationContractVersion: "1.0"
}
```

Future calculation changes require a new contract version.

Do not silently change financial behavior in an existing contract version.

---

# 3. Currency

Version 1 initially supports:

```text
INR
```

All monetary calculations MUST use a deterministic precision strategy.

The preferred internal representation is:

```text
integer paise
```

Example:

```text
₹1,234.56
=
123456 paise
```

Do not use JavaScript floating-point numbers as the authoritative representation of monetary values.

Display values may be decimal numbers/strings, but financial calculations should operate using exact integer/decimal arithmetic.

---

# 4. Monetary Rounding

The authoritative monetary precision is:

```text
2 decimal places
```

For INR:

```text
₹0.01 = 1 paise
```

Unless explicitly stated otherwise, monetary values are rounded to 2 decimal places using:

```text
HALF_UP
```

Example:

```text
1.234 -> 1.23
1.235 -> 1.24
```

The engine MUST NOT use binary floating-point rounding such as:

```ts
Math.round(value * 100) / 100
```

as the authoritative financial implementation.

Use integer arithmetic or a decimal library.

---

# 5. Percentage Precision

Interest rates are stored as decimal percentages.

Example:

```text
8.5%
```

is represented as:

```text
8.5
```

not:

```text
0.085
```

The engine converts it to a rate fraction only during calculation.

For monthly nominal interest:

```text
monthlyRate =
    annualInterestRate / 12 / 100
```

Example:

```text
8.5%
→
8.5 / 12 / 100
→
0.007083333333...
```

The internal calculation must retain sufficient precision.

Do not round the monthly rate to two decimal places.

---

# 6. Loan Model

A loan consists of:

```ts
interface Loan {
  id: string;
  currency: "INR";

  originalPrincipal: Money;

  annualInterestRate: Percentage;

  originalTenureMonths: number;

  startDate: LocalDate;

  firstEmiDate: LocalDate;

  repaymentFrequency: "MONTHLY";

  repaymentMode:
    | "REDUCE_TENURE"
    | "REDUCE_EMI";

  interestMethod:
    | "MONTHLY_REDUCING_BALANCE";

  brokenPeriod?: BrokenPeriod;

  status:
    | "ACTIVE"
    | "CLOSED";
}
```

Version 1 supports:

```text
Monthly repayment
Monthly reducing-balance interest
```

The architecture must permit future interest methods.

---

# 7. Loan Principal Invariant

At all times:

```text
Outstanding Principal >= 0
```

The authoritative relationship is:

```text
Opening Principal
-
Principal Applied
=
Closing Principal
```

subject to final monetary rounding.

The engine MUST never expose a negative principal balance.

---

# 8. Standard EMI Calculation

For a standard fixed-rate loan without subsequent restructuring:

```text
P = principal
r = annual interest rate / 12 / 100
n = number of monthly installments

EMI =
P × r × (1 + r)^n
------------------
(1 + r)^n - 1
```

If:

```text
r = 0
```

then:

```text
EMI = P / n
```

The calculated EMI is rounded to the nearest paise.

---

# 9. EMI Authority

The original EMI is calculated from:

```text
originalPrincipal
annualInterestRate
originalTenureMonths
```

The original EMI is then retained as the baseline EMI.

For a fixed-rate loan under:

```text
REDUCE_TENURE
```

the EMI remains unchanged unless:

* the loan is closed
* the user explicitly changes the loan configuration
* a future rate-change feature changes it

---

# 10. Monthly Interest

For each regular monthly period:

```text
Interest =
Opening Principal × Monthly Rate
```

Interest is rounded to 2 decimal places according to the contract.

Then:

```text
Scheduled Principal =
Scheduled EMI - Interest
```

Scheduled principal cannot be negative.

---

# 11. Regular EMI Payment

For a normal period:

```text
Total EMI Payment =
Interest + Principal
```

The principal component is:

```text
EMI - Interest
```

For the final period:

```text
Final Payment =
Outstanding Principal + Applicable Interest + Applicable Fees
```

The final payment MUST NOT exceed the amount required to close the loan.

---

# 12. Final Payment Rule

Suppose:

```text
Outstanding principal = ₹48,750
Calculated EMI = ₹50,000
```

The engine MUST NOT charge ₹50,000 as principal repayment.

Instead:

```text
Principal component = ₹48,750
```

and the loan closes.

Any remaining difference is handled according to the final-period interest calculation.

---

# 13. Payment Ordering

Version 1 defines the following ordering for a regular EMI date:

```text
1. Calculate applicable interest
2. Apply interest
3. Apply scheduled EMI principal
4. Apply part-payment principal
5. Apply applicable fees according to fee rules
6. Calculate closing balance
```

However, because real lenders can apply payments differently, the engine MUST expose the ordering as part of the calculation contract.

The default ordering is:

```text
INTEREST
→ EMI PRINCIPAL
→ PART PAYMENT
```

Part-payment MUST NOT reduce the interest already accrued for the current completed period.

It reduces the balance used for subsequent interest periods.

---

# 14. Part-Payment Definition

A part-payment is an additional principal repayment beyond scheduled EMI principal.

Example:

```text
EMI = ₹50,000

Interest = ₹35,000
Scheduled Principal = ₹15,000

Part Payment = ₹25,000
```

Then:

```text
Total Principal Reduction =
₹15,000 + ₹25,000
=
₹40,000
```

The part-payment itself does not contain an interest component under the default model.

---

# 15. Part-Payment Timing

Version 1 supports payment dates at calendar-date granularity.

For a part-payment occurring exactly on the EMI date, the default interpretation is:

```text
EMI processing
→
Part-payment
```

Therefore the part-payment affects the following interest period.

For part-payment dates between EMI dates, Version 1 does NOT automatically calculate daily interest unless the loan's configured interest method explicitly supports daily accrual.

For the initial implementation, all part-payments are normalized to the nearest supported repayment event according to the configured payment policy.

The UI MUST clearly display this behavior.

---

# 16. Part-Payment Normalization

The engine must not silently alter the user's entered date.

Instead preserve:

```text
requestedDate
```

and calculate:

```text
effectiveDate
```

Example:

```ts
{
  requestedDate: "2027-03-17",
  effectiveDate: "2027-04-05",
  normalizationReason: "NEXT_EMI_EVENT"
}
```

The UI should show the user the effective financial date when normalization occurs.

---

# 17. Reduce-Tenure Mode

In:

```text
REDUCE_TENURE
```

mode:

* EMI remains unchanged.
* Part-payment reduces outstanding principal.
* Remaining number of installments decreases.
* Final maturity date moves earlier.

After each part-payment:

```text
remainingBalance
+
existingEMI
+
currentInterest
```

is used to continue the schedule until the loan reaches zero.

Do NOT artificially calculate a new EMI.

---

# 18. Reduce-EMI Mode

In:

```text
REDUCE_EMI
```

mode:

After a qualifying part-payment:

```text
remainingPrincipal = current outstanding principal
remainingPeriods = remaining contractual periods
currentRate = applicable annual rate
```

Then:

```text
New EMI =
P × r × (1+r)^n
----------------
(1+r)^n - 1
```

where:

```text
P = remaining principal
r = monthly rate
n = remaining periods
```

The recalculated EMI is rounded to paise.

The new EMI applies from the configured recalculation date.

---

# 19. EMI Recalculation Boundary

The new EMI takes effect on the next applicable EMI cycle after the part-payment unless explicitly configured otherwise.

The calculation result must expose:

```ts
{
  recalculationDate
  previousEmi
  newEmi
}
```

---

# 20. Recurring Part-Payment Rules

A recurring rule contains:

```ts
interface PartPaymentRule {
  id: string;

  startDate: LocalDate;
  endDate?: LocalDate;

  frequency:
    | "MONTHLY"
    | "QUARTERLY"
    | "YEARLY";

  amountType:
    | "FIXED"
    | "PERCENTAGE";

  amount: Money | Percentage;

  status:
    | "ACTIVE"
    | "CANCELLED";

  treatment:
    | "REDUCE_TENURE"
    | "REDUCE_EMI";
}
```

A rule generates payment instances only while:

```text
startDate <= effectiveDate <= endDate
```

If no end date exists, the rule continues until:

```text
loan closure
```

---

# 21. Part-Payment Override Precedence

When multiple rules apply to the same effective date, resolve them deterministically.

Precedence:

```text
1. Explicit cancellation
2. Explicit monthly override
3. One-time payment
4. Recurring rule
5. No part-payment
```

The engine must never depend on array ordering to resolve conflicts.

---

# 22. Multiple Payments on Same Date

Multiple legitimate part-payments may occur on the same date.

Example:

```text
₹25,000
+
₹50,000
=
₹75,000
```

The engine may aggregate them internally for calculation, but must preserve the original payment records for auditability.

---

# 23. Part-Payment Exceeding Balance

If:

```text
partPayment > outstandingPrincipal
```

the engine MUST NOT produce a negative balance.

The maximum principal that can be applied is:

```text
outstandingPrincipal
```

The engine returns:

```ts
{
  requestedAmount
  appliedAmount
  excessAmount
  loanClosed: true
}
```

The UI must clearly warn the user.

---

# 24. Broken Period

A broken period exists between:

```text
loan disbursement date
```

and:

```text
first EMI date
```

Version 1 supports:

```text
INTEREST_ONLY
INTEREST_PLUS_PRINCIPAL
CAPITALIZE_INTEREST
USER_ENTERED
```

---

# 25. Broken Period — Interest Only

For interest-only broken period:

```text
Broken Period Interest =
Applicable Principal × Applicable Rate × Time Fraction
```

The exact time fraction must be determined by the configured day-count method.

Version 1 default:

```text
ACTUAL / 365
```

unless the loan configuration specifies another supported convention.

The resulting amount is rounded to paise.

Principal remains unchanged.

---

# 26. Broken Period — Interest + Principal

If the user explicitly enters a broken-period payment containing principal and interest:

```text
Total Payment =
Principal Component
+
Interest Component
```

The engine uses the user-supplied component values as authoritative actual payment data.

The system must validate:

```text
principalComponent >= 0
interestComponent >= 0
total = principalComponent + interestComponent
```

---

# 27. Broken Period — Capitalized Interest

If configured:

```text
Capitalized Interest
=
Broken Period Interest
```

and:

```text
New Principal =
Original Principal + Capitalized Interest
```

The capitalized amount becomes part of the balance on which future interest is calculated.

This must be clearly shown in the schedule.

---

# 28. User-Entered Broken Period

When:

```text
USER_ENTERED
```

is selected, the user's entered:

* total
* principal
* interest

values become authoritative for actual tracking.

The application must not silently replace them with modeled calculations.

It may show:

```text
Calculated estimate
User-entered actual
Difference
```

---

# 29. Day Count

Version 1 supports:

```text
ACTUAL_365
```

for broken-period calculations.

Architecture should permit:

```text
ACTUAL_360
ACTUAL_ACTUAL
30_360
```

in future versions.

---

# 30. Historical Actual Payments

Actual payments are authoritative user-entered records.

The calculation engine must not replace an actual lender statement value merely because the theoretical calculation differs.

For actual payment tracking:

```text
actualPrincipal
actualInterest
actualFees
```

can be entered independently.

The dashboard must distinguish:

```text
Modeled Schedule
```

from:

```text
Actual Recorded Payments
```

---

# 31. Planned Payments

Planned payments are assumptions.

They affect:

```text
Projected Schedule
```

but MUST NOT affect:

```text
Actual Paid
```

metrics.

---

# 32. Actual + Planned Projection

The standard projection combines:

```text
historical actual events
+
future planned events
```

to produce:

```text
Projected Schedule
```

If a planned payment is later marked actual:

```text
PLANNED
→
ACTUAL
```

it must not be double-counted.

---

# 33. Original Baseline

Every loan has an immutable baseline schedule.

The baseline is generated using:

```text
original principal
original annual rate
original tenure
original repayment frequency
original EMI rules
original broken-period configuration
```

The baseline is used to calculate:

* original interest
* original repayment
* original maturity

The baseline MUST NOT be modified when the user adds part-payments.

---

# 34. Baseline Immutability

The original baseline is a reference model.

Changing:

* actual payment
* planned payment
* part-payment
* scenario

must never mutate the baseline.

---

# 35. Principal Paid

There are three separate metrics.

## Actual Principal Paid

Sum of principal actually recorded as paid.

```text
Actual EMI Principal
+
Actual Part-Payment Principal
+
Other Actual Principal
```

## Projected Principal Paid

Actual principal paid plus projected future principal.

## Baseline Principal Paid

Principal according to the original amortization schedule.

---

# 36. Interest Paid

## Actual Interest Paid

Sum of actual interest components recorded.

## Projected Interest

Actual interest incurred plus projected future interest.

## Baseline Interest

Total interest under the original schedule.

Do not substitute projected values for actual values.

---

# 37. Remaining Principal

At an as-of date:

```text
Remaining Principal =
Original Principal
-
Actual Principal Applied
```

for actual-tracking mode.

For projection:

```text
Projected Remaining Principal =
Balance after actual + planned events
```

The UI must label the distinction.

---

# 38. Interest Saved

Interest saving MUST always specify a baseline.

## Realized Interest Saving

```text
Baseline Interest Incurred To Date
-
Actual Interest Incurred To Date
```

However, this metric should only be displayed when the comparison dates and methodologies are comparable.

## Projected Interest Saving

```text
Baseline Total Interest
-
Projected Total Interest
```

## Scenario Interest Saving

```text
Baseline Scenario Interest
-
Selected Scenario Interest
```

Never simply display:

```text
Interest Saved
```

without identifying the basis.

---

# 39. Tenure Saved

## Baseline Tenure

Original scheduled maturity minus original start date.

## Projected Tenure

Projected closure date minus original start date.

## Tenure Saved

```text
Baseline Maturity Date
-
Projected Maturity Date
```

Express both:

* months
* calendar date

when useful.

Example:

```text
31 months saved
Projected closure: Feb 2032
```

---

# 40. Interest Savings Due to Part-Payment

To isolate the effect of part-payments:

```text
Interest Saving Due to Part-Payment =
Interest under baseline
-
Interest under actual/projected payment plan
```

The calculation MUST use identical:

* interest rate
* date convention
* rounding policy
* fees treatment

between both models.

Only the payment behavior should differ.

---

# 41. Future Savings

For a future scenario:

```text
Future Scenario Saving =
Current Projection Interest
-
Scenario Projection Interest
```

This is distinct from:

```text
Original Baseline Saving
```

The UI must not confuse them.

---

# 42. Scenario Independence

A scenario must start from the same selected baseline state.

For example:

```text
Current Actual State
       |
       +---- Scenario A
       |
       +---- Scenario B
       |
       +---- Scenario C
```

Scenario A must not modify Scenario B.

---

# 43. Scenario Starting Point

The default scenario start point is:

```text
current as-of date
```

or explicitly selected scenario start date.

All scenario calculations must document the starting balance.

Example:

```text
Scenario starting balance:
₹38,42,500

Scenario start:
29 Sep 2026
```

---

# 44. Scenario Output Contract

Every scenario must return:

```ts
interface ScenarioResult {
  scenarioId: string;

  startingBalance: Money;

  totalFuturePayments: Money;

  projectedInterest: Money;

  projectedPrincipal: Money;

  projectedClosureDate: LocalDate;

  remainingTenureMonths: number;

  interestSavedVsBaseline: Money;

  tenureSavedMonths: number;

  schedule: AmortizationRow[];
}
```

---

# 45. Amortization Row Contract

Each row must contain:

```ts
interface AmortizationRow {
  periodNumber: number;

  date: LocalDate;

  openingBalance: Money;

  scheduledEmi: Money;

  interest: Money;

  scheduledPrincipal: Money;

  partPayment: Money;

  fees: Money;

  totalPayment: Money;

  closingBalance: Money;

  cumulativePrincipal: Money;

  cumulativeInterest: Money;

  cumulativePayment: Money;

  status:
    | "ACTUAL"
    | "PLANNED"
    | "PROJECTED"
    | "CLOSED";

  eventIds: string[];
}
```

---

# 46. Row Invariants

For each row:

```text
interest >= 0

scheduledPrincipal >= 0

partPayment >= 0

fees >= 0

openingBalance >= 0

closingBalance >= 0
```

And:

```text
closingBalance =
openingBalance
-
scheduledPrincipal
-
partPayment
+
capitalizedInterest
+
capitalizedFees
```

where applicable.

---

# 47. Payment Invariant

For normal EMI rows:

```text
scheduledEmi =
interest
+
scheduledPrincipal
```

subject to final-payment adjustment.

Total cash payment:

```text
totalPayment =
scheduledEmi
+
partPayment
+
fees
```

where fees are payable in that period.

---

# 48. Principal Conservation

Across a fully closed loan:

```text
Total Principal Applied
=
Original Principal
```

subject to explicitly modeled:

* capitalized interest
* capitalized fees
* adjustments

The calculation engine must expose any difference rather than hiding it.

---

# 49. Interest Conservation

For a fully closed fixed-rate baseline loan:

```text
Total Payment
-
Original Principal
=
Total Interest
+
Applicable Non-Interest Fees
```

The engine must distinguish fees from interest.

---

# 50. Zero-Interest Loans

If:

```text
annualInterestRate = 0
```

then:

```text
interest = 0
```

and:

```text
EMI =
principal / tenure
```

The final payment absorbs any rounding remainder.

---

# 51. Early Closure

If a payment causes:

```text
closingBalance = 0
```

the loan becomes:

```text
CLOSED
```

No subsequent scheduled EMI should be generated.

Any future planned payments after closure are marked:

```text
NOT_APPLICABLE
```

or excluded from the effective schedule.

Do not apply them automatically.

---

# 52. Rounding Residual

Because monthly rounding can produce a small residual:

The final payment must absorb the remaining amount.

Example:

```text
Outstanding:
₹0.03
```

Final principal payment:

```text
₹0.03
```

After closure:

```text
balance = ₹0.00
```

---

# 53. Date Generation

Monthly payment dates must use calendar-month semantics.

If the configured EMI date is:

```text
31
```

then months without a 31st should use the last valid calendar day of that month.

Example:

```text
31 Jan
28 Feb
31 Mar
30 Apr
31 May
```

Do not allow JavaScript date overflow to produce incorrect dates.

---

# 54. Leap Years

Leap years must be handled correctly.

Example:

```text
29 Feb 2028
```

must remain valid.

Broken-period day counting must correctly account for leap days under the selected convention.

---

# 55. As-Of Date

Every analytical calculation should support:

```ts
asOfDate
```

The engine must classify events:

```text
event.date <= asOfDate
```

as historical/as-of events.

Future events remain projected/planned.

---

# 56. Future Planned Payments

Planned future payments must not affect:

```text
Actual Principal Paid
Actual Interest Paid
Actual Total Paid
```

They may affect:

```text
Projected Balance
Projected Interest
Projected Closure
Projected Savings
```

---

# 57. Actual Payment Reconciliation

The application should support differences between:

```text
Modeled EMI
```

and:

```text
Actual lender payment
```

Example:

```text
Modeled EMI: ₹48,750
Actual lender EMI: ₹48,751
```

The actual record remains authoritative for actual tracking.

The variance should be visible.

---

# 58. Calculation Result Metadata

Every major calculation result should include:

```ts
{
  contractVersion: "1.0",
  calculatedAt: string,
  calculationMethod: string,
  roundingMode: "HALF_UP",
  currency: "INR"
}
```

This improves auditability.

---

# 59. Determinism

For identical input state:

```text
Input A
=
Input B
```

must always produce:

```text
Output A
=
Output B
```

The calculation engine must not depend on:

* current system time
* locale
* timezone
* random values
* object iteration order
* browser-specific rounding

unless explicitly provided as an input.

---

# 60. Calculation Engine API

Expose a stable API similar to:

```ts
calculateOriginalSchedule(
  loan: Loan
): CalculationResult;

calculateCurrentProjection(
  loan: Loan,
  events: LoanEvent[],
  asOfDate: LocalDate
): CalculationResult;

calculateScenario(
  loan: Loan,
  baseState: CalculationState,
  scenario: Scenario
): ScenarioResult;

calculateSavings(
  baseline: CalculationResult,
  comparison: CalculationResult
): SavingsResult;
```

Exact signatures may differ, but responsibilities must remain separated.

---

# 61. Calculation Pipeline

The authoritative pipeline is:

```text
INPUT
  ↓
Validate
  ↓
Normalize
  ↓
Generate baseline
  ↓
Resolve events
  ↓
Apply interest
  ↓
Apply EMI
  ↓
Apply part-payments
  ↓
Apply fees/adjustments
  ↓
Round
  ↓
Check invariants
  ↓
Generate schedule
  ↓
Generate analytics
```

---

# 62. Validation vs Calculation

Invalid input must never silently produce a financial result.

For example:

```text
negative principal
```

must produce a validation error.

Do not "fix" invalid user input automatically.

---

# 63. Calculation Errors

Create typed errors.

Example:

```ts
CalculationError
ValidationError
ScheduleError
PaymentOverflowError
UnsupportedCalculationMethodError
```

The UI can map these to user-friendly messages.

---

# 64. Audit Trail

Calculation results should be reproducible from:

```text
Loan configuration
+
Actual events
+
Planned events
+
Scenario definition
+
Calculation contract version
```

Do not persist only final calculated numbers as the authoritative source.

---

# 65. No Cached Financial Truth

Redux/browser cache may cache:

```text
source data
```

but calculated financial results should be safely regenerable.

If cached derived results become stale, recalculate them.

---

# 66. CSV Contract

CSV stores source financial records.

It should NOT be treated as an authoritative storage location for derived analytics.

Derived values can be regenerated from source data.

---

# 67. Import Rule

On import:

```text
CSV
↓
Validate
↓
Normalize
↓
Construct domain state
↓
Recalculate
↓
Verify invariants
↓
Commit Redux state
```

Never trust stored calculated totals blindly.

---

# 68. Export Rule

On export:

```text
Redux source state
↓
Normalize
↓
Validate
↓
Serialize CSV
```

Derived analytics do not need to be persisted.

---

# 69. Scenario Comparison Contract

Given scenarios A and B:

```text
Interest Difference =
Interest(A) - Interest(B)

Tenure Difference =
ClosureDate(A) - ClosureDate(B)
```

The UI may display these differences, but must not label one scenario "best" or "worst".

---

# 70. Financial Calculation Disclaimer

All projected calculations must use language such as:

```text
Projected
Estimated
Modeled
Based on current assumptions
```

Actual lender values should be labeled:

```text
Actual
User recorded
Lender statement
```

when applicable.

---

# 71. Mandatory Test Invariants

The implementation MUST test:

```text
1. No negative balance.

2. Closed loan has zero balance.

3. Original principal is conserved.

4. EMI = interest + scheduled principal
   except where final payment is adjusted.

5. Total payment = EMI + part-payment + applicable fees.

6. Baseline does not change when scenarios change.

7. Actual metrics exclude planned payments.

8. Planned payments affect projection but not actual metrics.

9. Scenario A cannot mutate Scenario B.

10. Import/export round-trip preserves source state.

11. Identical input produces identical output.

12. Final payment closes the loan without overpayment.

13. Zero-interest loan produces zero interest.

14. Part-payment cannot create a negative balance.

15. Payment dates remain valid calendar dates.
```

---

# 72. Reference Example

Use the following as a canonical test fixture.

```text
Principal:
₹1,000,000

Annual interest:
12%

Tenure:
12 months

Frequency:
Monthly

Repayment mode:
Reduce Tenure
```

Monthly rate:

```text
12% / 12
=
1%
```

The theoretical EMI is approximately:

```text
₹88,848.79
```

The implementation must calculate using the authoritative precision rules and then round the payable EMI to paise.

For every month:

```text
interest =
opening balance × 1%

principal =
EMI - interest
```

The final period must absorb any rounding residual.

---

# 73. Canonical Part-Payment Example

Starting loan:

```text
Principal: ₹1,000,000
Rate: 12%
Tenure: 12 months
EMI: calculated
```

After several months:

```text
Outstanding = ₹600,000
```

User makes:

```text
Part-payment = ₹100,000
```

New balance:

```text
₹500,000
```

In REDUCE_TENURE mode:

```text
EMI remains unchanged
```

In REDUCE_EMI mode:

```text
remaining tenure remains the configured remaining tenure
new EMI is recalculated
```

The engine must generate both results independently for testing.

---

# 74. Canonical Scenario Example

Current projection:

```text
Remaining principal: ₹3,000,000
Remaining interest: ₹1,200,000
Remaining tenure: 72 months
```

Scenario:

```text
Additional payment:
₹25,000 monthly

Start:
Next EMI

Treatment:
Reduce Tenure
```

The scenario engine must produce:

```text
Scenario interest
Scenario closure date
Scenario tenure
Interest saved vs current projection
Tenure saved vs current projection
```

Do not hard-code expected values from this example unless they are calculated from the engine.

---

# 75. Contract Change Policy

Any change to:

* interest methodology
* payment ordering
* rounding
* date handling
* part-payment treatment
* broken-period methodology
* reduce-EMI behavior
* reduce-tenure behavior

must trigger:

```text
FCC_VERSION increment
```

and new/updated test fixtures.

Never silently alter financial results.

---

# 76. Final Authority

The calculation engine is the single source of truth for financial calculations.

The:

* dashboard
* charts
* tables
* CSV export
* scenario comparison
* summary cards

must all consume the calculation engine's results.

No UI component may independently recalculate financial figures.

---

# 77. Implementation Requirement

Before implementing UI analytics, the coding agent MUST:

1. Implement this contract.
2. Write unit tests.
3. Create canonical fixtures.
4. Verify invariants.
5. Verify baseline schedule.
6. Verify part-payment behavior.
7. Verify reduce-tenure.
8. Verify reduce-EMI.
9. Verify broken period.
10. Verify scenario calculations.
11. Verify CSV round-trip.

Only after these pass should the dashboard be considered ready.

---

# 78. Contract Status

```text
Financial Calculation Contract: v1.0
Currency: INR
Primary repayment frequency: Monthly
Primary interest method: Monthly reducing balance
Default broken-period convention: Actual/365
Default rounding: HALF_UP to 2 decimal places
Default part-payment ordering:
  Interest
  → EMI principal
  → Part-payment
Default scenario behavior:
  Immutable
```

This document is normative.

The implementation must not invent financial behavior that is not defined here without explicitly documenting the new assumption and updating the contract.
