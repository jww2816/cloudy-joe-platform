# Phase 3 Authentication Architecture

## Current Implementation

Phase 3 introduces managed application identity using Amazon Cognito.

Amazon Cognito User Pools manages portfolio user identities while Amazon SES
provides email delivery for passwordless one-time-password authentication.

Current authentication components:

- Amazon Cognito User Pool
- Essentials feature plan
- Email sign-in identifier
- Controlled user enrollment
- Public SPA application client without a client secret
- Amazon SES verified domain
- DKIM signing
- Passwordless email OTP authentication

## Email Authentication Flow

Amazon Cognito
    ↓
Amazon SES
    ↓
Verified cloudy-joe.com sender
    ↓
One-time password email
    ↓
Approved portfolio user

## Security Decisions

- Public self-registration is disabled.
- Passwordless email OTP is used instead of permanent recruiter passwords.
- Amazon SES provides Cognito authentication email delivery.
- No AWS credentials are embedded in frontend code.
- The SPA app client does not contain a client secret.
- S3 remains private behind CloudFront.
- Authentication does not yet protect CloudFront content directly.

## Current Limitation

Although Cognito can now authenticate users, CloudFront does not yet enforce
authentication before serving protected portfolio objects.

Authentication and protected-content authorization remain separate concerns.