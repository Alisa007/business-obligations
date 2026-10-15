# Security policy

## Supported versions

The latest minor release receives fixes.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability reporting
(**Security → Report a vulnerability**) on this repository. You can expect an acknowledgement within 7 days.

## Scope

This library is a pure, offline function with no network or file access at runtime, so the realistic risks are
supply-chain (dependencies, release process) and denial of service from pathological input. Incorrect rule _data_ is
not a security vulnerability; please file a data-correction issue instead.
