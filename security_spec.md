# Security Specifications - Petroleum Products Distribution Management

This specification details the mathematical access bounds and data integrity constraints for the Firestore database.

## 1. Data Invariants
- **Factory Access**: Anyone can view the list of factories. Creating or editing a factory is restricted to verified administrators (`admins/{uid}` must exist).
- **Production Data**: Readers can view any factory's daily loading logs. Editing allocation fields (`allocated`, `carried`) or daily loads is strictly restricted to authenticated and verified admins.
- **Timestamp Integrity**: All updates to production data must automatically record `updatedAt` matching the server's time precisely.
- **ID Safety**: All path parameters must consist of valid alphanumeric characters and hyphen/underscores, restricted to 128 characters max.

## 2. The "Dirty Dozen" Payloads
These payloads represent malicious client requests designed to violate state, identity, or field integrity and must return `PERMISSION_DENIED`.

1. **Self-Elevated Privilege Hack**: A non-admin user trying to write to the `admins` collection adding their own UID.
2. **Anonymous Factory Register**: Trying to create a factory without any user authentication header.
3. **Ghost Fields Injection**: An admin or non-admin writing random field definitions (e.g., `hack_status: true`) inside a production data document.
4. **Invalid Volume Type**: Attempting to write a string `"one million"` to the `allocated` field instead of a number.
5. **PII Leakage Attempt**: Authenticated user trying to scrape detailed admin account logs or private server metrics.
6. **Time Spoofing Attack**: Client-side setting `updatedAt` to a historical or future date to corrupt auditing.
7. **Negative Allotment Injection**: Setting `allocated: -50000` to induce integer overflow or underflow.
8. **Malicious Factory ID**: Registering a factory documentation with the ID set to a 5KB string containing special shell sequences.
9. **Orphaned Row Injection**: Registering daily logs with references to a completely non-existent factory.
10. **Day Range Overflow**: Writing daily distribution logs for non-existent calendar days (e.g., day `32` or `-1`).
11. **Negative Dispatched Quantity**: Setting the quantity dispatched on day `5` to a negative integer (`-100000`).
12. **Status Short-cutting**: Bypassing official allocations and trying to force-carry an ultra-large value without valid previous month tracking.

## 3. Firestore Rules Structure
The rules will include:
1. Reusable helpers: `isSignedIn()`, `isValidId()`, `isAdmin()`, `incoming()`, `existing()`.
2. Matches for `/factories/{factoryId}` restricting read to anyone and write to admins.
3. Matches for `/productionData/{factoryId}` restricting read to anyone and write to admins.
