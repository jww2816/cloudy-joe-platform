# Cloudy Joe Authentication Threat Model

## Protected Assets

* Private portfolio content
* Resume information
* Project information
* Architecture details
* Future backend APIs
* Future personalized and AI functionality

## Trust Boundaries

The primary trust boundaries are:

1. Visitor browser to CloudFront
2. Browser to Amazon Cognito
3. CloudFront to private Amazon S3
4. Future browser to API Gateway
5. Future application services to persistent data

## Threats and Mitigations

### Direct S3 Origin Access

**Threat:** A visitor attempts to bypass CloudFront and retrieve files
directly from Amazon S3.

**Mitigation:** S3 remains private with Block Public Access enabled. Origin
Access Control authorizes the designated CloudFront distribution.

### Unrestricted Account Creation

**Threat:** An unknown visitor creates an account and gains portfolio access.

**Mitigation:** Unrestricted self-registration will not be used. User
enrollment will be controlled through an approval or administrative process.

### Client-Side Authorization Bypass

**Threat:** A visitor modifies browser JavaScript or navigates directly to a
protected HTML file.

**Mitigation:** Authorization must ultimately be enforced before protected
content is delivered, rather than relying only on client-side presentation
logic.

### Credential Theft

**Threat:** Permanent credentials are compromised.

**Mitigation:** Passwordless email one-time passwords are preferred for the
initial external-user authentication model.

### OAuth Authorization Code Interception

**Threat:** An attacker obtains an authorization code during an OAuth flow.

**Mitigation:** Authorization Code Grant with PKCE will bind token exchange to
the browser session that initiated authentication.

### Exposed Application Secret

**Threat:** A secret embedded in frontend JavaScript becomes publicly visible.

**Mitigation:** The browser application will use a public Cognito app client
without a client secret.

### Embedded AWS Credentials

**Threat:** AWS access credentials are exposed through frontend code.

**Mitigation:** No AWS credentials will be stored in or distributed with the
frontend.

### Excessive AWS Permissions

**Threat:** Portfolio users receive unnecessary AWS service permissions.

**Mitigation:** A Cognito Identity Pool will not be introduced unless a future
requirement specifically requires temporary AWS credentials.

## Current Limitation

At the beginning of Phase 3, Cloudy Joe does not yet enforce authenticated
access to individual static portfolio files.

The existing access page is a prototype and must not be considered a security
boundary.

Addressing protected-content enforcement is a required Phase 3 objective.
