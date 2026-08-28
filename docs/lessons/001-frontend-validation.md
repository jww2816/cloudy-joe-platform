# Frontend Validation Is Not Security

## Context

The Phase 1 access workflow performs HTML and JavaScript validation before
processing access-code and access-request forms.

## Initial Assumption

Client-side validation is useful for ensuring visitors provide complete and
properly formatted information.

## Limitation

The browser is controlled by the client.

A visitor can modify JavaScript, disable it, alter requests, or communicate
directly with backend APIs without using the intended interface.

## Lesson

Client-side validation should improve the user experience but must never be
treated as a trusted security boundary.

All future backend APIs must independently validate input before processing
requests or making authorization decisions.

## Future Application

When API Gateway and Lambda are introduced, Lambda will validate incoming
request data regardless of validation already performed by the browser.