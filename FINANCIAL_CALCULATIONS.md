# Financial Calculation Specification

## Version 1.0 (FCC_VERSION = 1.0)

This document formalizes the authoritative mathematical calculations and rounding standards implemented in the application.

---

## 1. Precision & Monetary Unit Strategy

To eliminate floating-point rounding anomalies (such as `0.1 + 0.2 = 0.30000000000000004`):

- **Internal Unit**: Integer Paise (Minor Units).
- **Ratio**: $1\text{ Rupee} = 100\text{ Paise}$.
- **Rounding Mode**: `HALF_UP` to the nearest integer paise.
- **Floating-point Rule**: JavaScript binary floating-point numbers are prohibited as authoritative monetary state. Conversions between Rupees and Paise round halfway values away from zero ($1.235 \rightarrow 1.24$).

---

## 2. Standard EMI Calculation

Given:
- Principal $P$ (in paise)
- Annual Interest Rate $R$ (as a percentage, e.g. $8.5\%$)
- Number of Monthly Installments $n$

The monthly nominal interest rate fraction $r$ is:
$$r = \frac{R}{12 \times 100}$$

If $r = 0$:
$$\text{EMI} = \text{roundHalfUp}\left(\frac{P}{n}\right)$$

If $r > 0$:
$$\text{factor} = (1 + r)^n$$
$$\text{EMI} = \text{roundHalfUp}\left(P \times \frac{r \times \text{factor}}{\text{factor} - 1}\right)$$

### Canonical Verification (FCC Section 72)
- Principal: ₹10,00,000 ($100,000,000$ paise)
- Rate: $12\%$ ($r = 0.01$)
- Tenure: $12$ months
- $\text{factor} = (1.01)^{12} \approx 1.12682503$
- Theoretical EMI: $1000000 \times 0.01 \times \frac{1.12682503}{0.12682503} \approx 88,848.788674\dots$
- In Paise: $8884878.8674\dots \rightarrow \mathbf{8884879\text{ paise}}$ (₹88,848.79).

---

## 3. Monthly Interest Accrual

For each regular monthly period:
$$\text{Interest} = \text{roundHalfUp}(\text{Opening Balance} \times r)$$

Principal component:
$$\text{Scheduled Principal} = \min(\text{Scheduled EMI} - \text{Interest}, \text{Opening Balance})$$

---

## 4. Broken-Period Treatment

The broken period is the duration between the disbursement date ($D_{\text{start}}$) and the first regular EMI cycle ($D_{\text{firstEMI}}$).

- **Day Count**: Actual / 365
$$\text{Days} = \text{daysBetween}(D_{\text{start}}, D_{\text{firstEMI}})$$
$$\text{Modeled Interest} = \text{roundHalfUp}\left(P \times \frac{R}{100} \times \frac{\text{Days}}{365}\right)$$

### Supported Treatments:
1. **INTEREST_ONLY**: Borrower pays broken-period interest upfront; opening principal for Period 1 is unchanged.
2. **INTEREST_PLUS_PRINCIPAL**: Borrower pays interest plus an agreed principal deduction; opening principal for Period 1 decreases by the principal paid.
3. **CAPITALIZE_INTEREST**: Interest is added to the principal balance:
   $$\text{Starting Schedule Principal} = \text{Original Principal} + \text{Broken Period Interest}$$
4. **USER_ENTERED**: Borrower enters the exact amounts shown on the lender's sanction/disbursement letter.

---

## 5. Part-Payment Precedence & Invariants

When resolving prepayments for any date $D$:

1. **Cancellation Override**: If an override exists with `cancelled: true`, prepayment is ₹0.
2. **Monthly Override**: If an override exists with an explicit amount, that amount applies.
3. **One-Time Event**: If ad-hoc payment records exist for that date, their sum applies.
4. **Recurring Rule**: If an active rule matches the frequency (Monthly, Quarterly, Yearly), the fixed amount or percentage of current opening balance applies.
5. **Default**: ₹0 extra payment.

### Non-Negative Invariant:
$$\text{Part-Payment Applied} = \min(\text{Resolved Part-Payment}, \text{Opening Balance} - \text{Scheduled Principal})$$
Closing balance is strictly guaranteed to never fall below zero:
$$\text{Closing Balance} \ge 0$$

---

## 6. Repayment Modes

- **REDUCE_TENURE**:
  - The monthly EMI remains constant.
  - Extra payments directly reduce the outstanding principal.
  - The schedule terminates early when closing balance hits ₹0.

- **REDUCE_EMI**:
  - After a part-payment in period $k$:
    $$\text{Remaining Periods} = \text{Original Tenure} - k$$
  - If $\text{Remaining Periods} > 0$ and $\text{Closing Balance} > 0$:
    $$\text{New EMI} = \text{calculateStandardEmi}(\text{Closing Balance}, R, \text{Remaining Periods})$$
  - Subsequent periods utilize the recalculated lower EMI.

---

## 7. Savings Metrics Definitions

1. **Realized Interest Saved**:
   $$\text{Baseline Interest Incurred to Date} - \text{Actual Interest Paid to Date}$$

2. **Projected Interest Saved**:
   $$\text{Original Baseline Total Interest} - \text{Projected Total Interest}$$

3. **Projected Tenure Saved**:
   $$\text{Original Scheduled Periods} - \text{Projected Total Periods}$$

