# ADR-001: Platform Architecture Strategy

## Status

Accepted

## Date

2026-08-27

## Context

Cloudy Joe is being developed as a private cloud engineering portfolio and
resume platform.

The platform should demonstrate practical knowledge across cloud architecture,
security, infrastructure as code, automation, containers, Kubernetes, and
artificial intelligence while remaining understandable, maintainable, and
cost-conscious.

A major goal of the project is not simply to use a large number of
technologies, but to demonstrate why each technology is appropriate for a
specific architectural problem.

The project will therefore be developed incrementally rather than attempting
to implement the entire target architecture at once.

## Decision

Cloudy Joe will use a phased architecture.

The initial application will use a static frontend and managed AWS services
where appropriate.

Additional capabilities will be introduced only when there is a clear
technical or educational reason for them.

The planned technology areas include:

- Amazon S3 for static content storage
- Amazon CloudFront for content delivery
- Amazon Route 53 for DNS
- AWS Certificate Manager for TLS certificates
- Amazon Cognito for authentication
- AWS IAM for authorization between AWS resources
- Amazon API Gateway for application APIs
- AWS Lambda for serverless compute
- Amazon DynamoDB for application data
- Amazon CloudWatch and CloudTrail for observability and auditing
- Terraform as the primary Infrastructure as Code tool
- AWS CloudFormation for selected AWS-native infrastructure
- Docker for application containerization
- Amazon ECR for container image storage
- Amazon EKS for Kubernetes workloads
- AWS AI services for the portfolio assistant and automated workflows

## Guiding Principle

Every technology added to the platform must answer the question:

> What problem does this technology solve?

Technologies will not be introduced solely to increase the number of tools
listed in the project.

## Consequences

### Positive

- The project can be built and learned incrementally.
- Architecture decisions remain tied to real technical requirements.
- Individual components can be explained clearly during technical interviews.
- The platform can evolve without requiring the entire system to be rebuilt.
- Documentation will capture the reasoning behind major technical decisions.

### Negative

- The final architecture will take longer to build.
- Some infrastructure may be replaced or redesigned as later phases are introduced.
- Maintaining multiple technologies increases documentation requirements.
- Advanced components such as Kubernetes may introduce unnecessary cost if left running continuously.

## Future Considerations

Future ADRs will document major decisions including:

- authentication strategy
- infrastructure as code strategy
- frontend hosting architecture
- container platform selection
- Kubernetes architecture
- AI platform and agent design
- CI/CD strategy
- security controls