# ADR-004 — Authentication Architecture

## Status

Accepted

## Date

2026-08-31

## Context

Cloudy Joe currently delivers its frontend through Amazon CloudFront with a
private Amazon S3 origin protected by Origin Access Control.

The infrastructure delivery path is protected, but the application itself
does not yet authenticate users. The existing access page is a frontend
prototype and does not provide a security boundary.

The portfolio is intended primarily for approved prospective employers and
other invited users rather than unrestricted public registration.

## Decision

Amazon Cognito User Pools will provide managed user authentication.

The initial authentication architecture will use:

* Amazon Cognito User Pool
* Email as the primary user identifier
* Passwordless email one-time-password authentication
* A public application client without a client secret
* OAuth 2.0 Authorization Code Grant
* Proof Key for Code Exchange (PKCE)
* Managed Cognito authentication pages initially
* Administrator-controlled user creation or approval
* No unrestricted public self-registration
* No Cognito Identity Pool unless a future requirement requires users to
  receive temporary AWS credentials

The existing access page will evolve into the entry point for authentication
and access requests.

Authentication and authorization will remain separate concerns. Successfully
authenticating with Cognito must not, by itself, rely on client-side
JavaScript to protect static portfolio content.

A later Phase 3 step will introduce an enforcement mechanism so protected
CloudFront content cannot be accessed simply by bypassing the access page.

## Rationale

Amazon Cognito avoids creating and maintaining a custom credential system.

Passwordless email authentication reduces friction for infrequent external
visitors who should not need to create and remember a permanent portfolio
password.

Authorization Code Grant with PKCE is appropriate for a browser-based public
client that cannot securely store a client secret.

Administrator-controlled enrollment supports the project's private,
invitation-oriented access model.

Avoiding an Identity Pool prevents authenticated users from receiving AWS
credentials when no current requirement exists for them to access AWS
services directly.

## Alternatives Considered

### Custom Authentication System

Rejected because password storage, credential validation, account recovery,
token issuance, and related security controls would introduce unnecessary
risk and complexity.

### Username and Password Authentication

Viable, but not preferred because permanent passwords add unnecessary
credential-management friction for infrequent portfolio visitors.

### Public Self-Registration

Rejected because the portfolio is intended to demonstrate controlled private
access rather than allowing any visitor to create an account.

### OAuth Implicit Grant

Rejected in favor of Authorization Code Grant with PKCE.

### Cognito Identity Pool

Not currently required because portfolio visitors do not need temporary AWS
credentials.

## Security Principles

* No AWS credentials will be embedded in frontend code.
* No Cognito client secret will be embedded in frontend code.
* Authentication will be handled by a managed identity service.
* Authorization will not rely solely on browser-side JavaScript.
* S3 will remain private behind CloudFront.
* HTTPS will remain mandatory.
* User enrollment will be controlled.
* Permissions will follow least privilege.

## Consequences

Phase 3 will introduce additional identity and session-management concepts,
including OAuth 2.0, OpenID Connect, PKCE, JWTs, callback URLs, token
validation, and protected-resource authorization.

Passwordless email authentication will also require appropriate Cognito
feature-plan and email-delivery configuration.

## Future Work

Later Phase 3 steps will implement:

* Cognito User Pool
* Cognito application client
* Cognito domain / managed login
* Email delivery configuration
* Authentication callback handling
* Sign-in and sign-out flows
* Session handling
* CloudFront-side authorization
* Real request-access API
* Approval workflow
* Logging and monitoring
