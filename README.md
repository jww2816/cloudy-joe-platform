# Cloudy Joe Platform

Cloudy Joe is a private cloud engineering portfolio and resume platform
designed to demonstrate practical skills across AWS, infrastructure as code,
security, containers, Kubernetes, automation, and AI.

The platform is developed incrementally so that each technology is introduced
to solve a specific technical requirement rather than solely for demonstration.

## Project Goals

- Build a private authenticated engineering portfolio
- Demonstrate practical AWS architecture and security
- Manage infrastructure using Infrastructure as Code
- Implement automated CI/CD workflows
- Deploy containerized application services
- Demonstrate Kubernetes using Amazon EKS
- Integrate an AI-powered portfolio assistant
- Document architecture decisions and lessons learned

## Architecture Principle

Every technology added to Cloudy Joe should answer:

> What problem does this technology solve?

## Current Status

### Phase 1 — Application Foundation

Status: **Completed**

Phase 1 established:

- Git and GitHub workflow
- Feature branch and pull request process
- Local frontend application
- Responsive design system
- Access workflow prototype
- Resume page
- Architecture page
- Project roadmap
- Interactive Lessons Learned page
- Architecture Decision Records
- Engineering documentation
- Local HTTP development workflow

## Project Structure

```text
cloudy-joe-platform/
│
├── frontend/
│   ├── access.html
│   ├── architecture.html
│   ├── index.html
│   ├── lessons.html
│   ├── projects.html
│   └── resume.html
│
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
│
├── infrastructure/
│   ├── terraform/
│   └── cloudformation/
│
├── services/
├── kubernetes/
├── tests/
│
└── docs/
    ├── architecture/
    ├── decisions/
    └── lessons/