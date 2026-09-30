# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions of LoanTracker:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Privacy & Security Architecture

LoanTracker is designed from the ground up as a **local-first, zero-knowledge** application:
- **No Cloud Database**: All loan data, amortizations, interest numbers, and transactions remain strictly on your local device.
- **No Analytics / Telemetry**: No third-party tracking scripts, advertising pixels, or telemetry beacons are embedded in this application.
- **Local Storage & File System API**: Data is stored inside your browser's private `localStorage` or saved locally to files of your choice via the File System Access API.

---

## Reporting a Vulnerability

We take the security and integrity of LoanTracker seriously. If you believe you have discovered a security vulnerability, please follow responsible disclosure guidelines:

1. **Do NOT open a public issue**: Public issues disclose vulnerabilities before a fix is available, potentially putting users at risk.
2. **Submit via GitHub Private Vulnerability Reporting**:
   - Navigate to the **Security** tab of this repository.
   - Click on **Advisories** and select **Report a vulnerability**.
3. **Alternative Contact**:
   - If Private Vulnerability Reporting is unavailable, please contact the maintainers directly via repository owner email or security contact.

### Information to Include
When reporting a vulnerability, please provide:
- A clear description of the potential vulnerability.
- Steps to reproduce the issue (including sample CSV files or mock loan configurations if applicable).
- Expected vs. actual behavior.
- Any potential impact on client-side state, local storage, or data integrity.

---

## Response Timeline

- **Initial Acknowledgement**: Within 48 hours.
- **Assessment & Status Update**: Within 5 business days.
- **Resolution & Release**: Critical security patches will be published with highest priority.

