## Summary of Changes

A concise description of what this PR accomplishes, the motivation behind the change, and the technical decisions made.

## Related Issue

Fixes #(issue number) or Closes #(issue number)

## Type of Change

- [ ] :bug: Bug fix (non-breaking change fixing an issue or financial calculation discrepancy)
- [ ] :sparkles: New feature (non-breaking change adding functionality)
- [ ] :fire: Financial Engine Update (changes to domain formulas, rounding, or schedule generation)
- [ ] :lipstick: UI / UX improvement (styling, responsiveness, accessibility)
- [ ] :recycle: Refactor / Performance enhancement
- [ ] :memo: Documentation update
- [ ] :white_check_mark: Test suite expansion

## Verification & Quality Checklist

Please confirm that your changes meet all quality gates:

- [ ] My code follows the established coding and style standards of this project.
- [ ] TypeScript compiles cleanly with zero errors (`npx tsc --noEmit`).
- [ ] ESLint passes with zero warnings or errors (`npm run lint`).
- [ ] All unit and integration tests pass cleanly (`npm test`).
- [ ] Production build succeeds without errors (`npm run build`).
- [ ] **Financial Invariants Verified**:
  - [ ] Integer minor units (paise) used for all currency calculations.
  - [ ] Deterministic `roundHalfUp` rounding applied where required.
  - [ ] Principal balance conserved; no negative balance artifacts.
- [ ] Responsive design verified across desktop and mobile screen widths.
- [ ] Documentation updated if relevant (e.g. `FINANCIAL_CALCULATIONS.md`, `README.md`, `CSV_SCHEMA.md`).

## Visual / UI Changes (If Applicable)

| Before | After |
| :---: | :---: |
| *(Image/GIF)* | *(Image/GIF)* |

