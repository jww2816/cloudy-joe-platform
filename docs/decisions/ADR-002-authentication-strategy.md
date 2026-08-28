# ADR-002: Authentication Strategy

## Status

Proposed

## Date

2026-08-28

## Context

Cloudy Joe is intended to be a private engineering portfolio rather than
a fully public website.

Employers and recruiters may receive access through QR codes, invitation
codes, or approved access requests.

Authentication should demonstrate practical cloud identity concepts without
requiring the project to implement or securely store passwords itself.

## Decision

The frontend will first implement a mocked authentication and access-request
workflow.

The production implementation will use a managed identity provider rather
than custom password storage.

Amazon Cognito is the leading candidate for user authentication.

Application-specific access requests may be processed through API Gateway,
Lambda, and DynamoDB before approved users are provisioned or invited.

## Rationale

Using a managed identity provider reduces the security risk associated with
implementing custom authentication.

The application should be responsible for business logic and authorization
decisions rather than password handling.

## Consequences

### Positive

- Authentication logic is separated from frontend code.
- Password storage does not need to be implemented by the application.
- AWS identity and access-management concepts can be demonstrated.
- Access requests can become an independent workflow.

### Negative

- Authentication introduces additional AWS services and configuration.
- Invitation and approval workflows require additional application logic.
- Authorization rules must still be designed carefully.

## Future Considerations

The production design should evaluate:

- Amazon Cognito user pools
- passwordless or one-time-password authentication
- invitation codes
- request approval workflows
- session expiration
- authorization rules
- logging and auditing