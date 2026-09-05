---
title: "Implement password recovery"
status: draft
source: public-example
---

# Plan

## Changes

Use the existing authentication provider. Add request and confirmation views and connect the transactional email template. Keep credentials server-side.

## Validation

Test response parity, token expiry, one-time use, rate limits and session invalidation. Exercise successful and invalid-link browser paths. Check logs for token disclosure.

## Human review

Confirm provider capabilities and the session model. Review test evidence in a pull request before deploying through the application's protected environment.
