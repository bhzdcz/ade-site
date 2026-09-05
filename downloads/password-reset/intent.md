---
title: "Let users recover access"
status: draft
source: public-example
---

# Intent

## Problem

A user who forgets their password needs support to regain access.

## Proposed outcome

Let users request a reset email and choose a new password without revealing whether an address has an account.

## Constraints

Keep the current authentication provider. Do not migrate accounts or change social sign-in. Never log reset tokens.

## Success criteria

Expired and reused reset links cannot change a password.
