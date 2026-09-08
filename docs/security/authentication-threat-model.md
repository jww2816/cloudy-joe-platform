## Protected Content Enforcement

Protected portfolio content is authorized at the CloudFront
viewer-request boundary.

Amazon Cognito issues a short-lived access token after successful
email OTP authentication. The browser presents the token in a
Secure SameSite cookie.

A Lambda@Edge viewer-request function validates:

- The JWT signature against the Cognito User Pool JWKS.
- Token expiration.
- Cognito issuer.
- Token use.
- Application client ID.

Only valid authenticated requests proceed to the private S3 origin.

Public CloudFront behaviors allow unauthenticated access to the
authentication page and shared frontend assets.

## Current Session Limitation

The authentication cookie is created by client-side JavaScript and
therefore cannot currently use the HttpOnly attribute.

A successful cross-site scripting attack could potentially access
the session token.

Future hardening can introduce a server-issued HttpOnly session
cookie and a stronger Content Security Policy.