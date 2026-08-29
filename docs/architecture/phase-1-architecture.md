# Phase 1 Architecture

## Overview

Phase 1 establishes the local application and engineering workflow for the
Cloudy Joe platform.

No AWS infrastructure is required during this phase.

The purpose of Phase 1 is to create a stable frontend, documentation model,
and development workflow before introducing cloud infrastructure.

## Current Architecture

```text
User
  |
  v
Web Browser
  |
  v
Local HTTP Server
  |
  v
HTML / CSS / JavaScript