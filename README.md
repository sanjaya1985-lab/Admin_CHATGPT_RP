# Test Portal Hardened Frontend

Preserves the existing portal UI and business functions while separating CSS, API/session core, main application logic, and RMV pre-print.

## Required backend contract
- `checkLogin` returns `authToken` on success.
- `validateSession` validates the token.
- `logout` revokes the token.
- Every protected action validates token, permission, company and branch scope server-side.

## Security improvements
- Removed localStorage-based authentication restoration.
- Central API automatically sends `authToken`.
- Session expiry clears the client session.
- RMV pre-print validates the session before loading.
- Password-change UI requires a stronger password.

## Next refactor
The existing business code is retained for compatibility. The next stage should replace inline event handlers and dynamic `innerHTML` with module event listeners and safe DOM creation, without changing business rules or print coordinates.
