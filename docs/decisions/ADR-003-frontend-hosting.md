# ADR-003: Frontend Hosting Strategy

## Status

Accepted

## Date

2026-08-29

## Context

The Cloudy Joe platform requires secure and globally accessible hosting for
its static frontend application.

The frontend currently consists of HTML, CSS, and JavaScript files served
locally during development.

The production architecture should support:

- HTTPS
- custom domain names
- caching and global content delivery
- private origin storage
- future security controls
- integration with automated deployment workflows

## Decision

The frontend will be hosted using Amazon S3 as a private object store with
Amazon CloudFront providing public content delivery.

The S3 bucket will not use the public S3 static website endpoint.

CloudFront Origin Access Control will be used to allow CloudFront to retrieve
objects from S3 while preventing direct public access to the bucket.

Amazon Route 53 will provide DNS for the cloudy-joe.com domain.

AWS Certificate Manager will provide the TLS certificate used by CloudFront.

## Planned Request Path

```text
Browser
   |
   v
Route 53
   |
   v
CloudFront
   |
   | Origin Access Control
   v
Private Amazon S3 Bucket
   |
   v
HTML / CSS / JavaScript