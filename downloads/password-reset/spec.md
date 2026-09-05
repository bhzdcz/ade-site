---
title: "Password recovery behavior"
status: draft
source: public-example
---

# Spec

## Acceptance criteria

- Known and unknown email addresses receive the same public response.
- Tokens expire after 30 minutes and work only once.
- Successful resets invalidate sessions using the provider's supported mechanism.
- Expired, malformed and reused tokens produce an actionable error.
- Rate limits apply and tokens never appear in logs.

## Out of scope

New authentication or email providers, account migration and social sign-in changes.
