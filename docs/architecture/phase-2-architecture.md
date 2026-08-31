# Phase 2 Architecture — AWS Frontend Hosting

## Overview

Phase 2 moves the Cloudy Joe frontend from a local development server to
AWS while keeping the Amazon S3 origin private.

## Architecture

```text
Internet
   |
   v
cloudy-joe.com
   |
   v
Amazon Route 53
   |
   v
Amazon CloudFront
   |
   | Origin Access Control
   v
Private Amazon S3 Bucket
   |
   v
HTML / CSS / JavaScript