# Lesson 003: Browser Caching and Authorization

## Overview

While testing the Cloudy Joe portfolio, I discovered that a previously visited Resume page could load in Chrome without requiring authentication, despite the website being protected by Amazon Cognito and Lambda@Edge.

This revealed an important distinction between server-side authorization and client-side browser caching.

## The Problem

On my desktop, navigating to the Resume page displayed an older version of the website without the Sign Out button. However, clicking other navigation links redirected me to the authentication page as expected.

The issue did not occur on my phone.

This initially suggested that authorization might be inconsistently enforced across devices or URL paths.

## Investigation

I used Chrome Developer Tools to inspect network requests and compared the behavior against an Incognito session.

The results were:

- In Incognito, the root domain, `/resume`, and `/resume.html` all redirected to authentication.
- In the regular Chrome session, `resume.html` appeared with HTTP status `200` and a transfer size of `(disk cache)`.
- The cached page lacked recently deployed interface changes.
- Other pages continued to enforce authentication correctly.

These observations strongly indicated that Chrome was displaying previously downloaded HTML without sending a new request to CloudFront.

## Root Cause

Cloudy Joe uses Lambda@Edge on CloudFront viewer requests to validate Cognito access tokens before allowing access to protected content.

However, when Chrome loads a previously cached HTML document locally, the request never reaches CloudFront.

Therefore, Lambda@Edge has no opportunity to perform an authorization check.

The issue was not evidence of a failed JWT validation. It was caused by the browser reusing previously stored content.

## Resolution

I updated the S3 object metadata for all six HTML pages to include:

`Cache-Control: no-store`

This instructs compliant browsers and caches not to store the HTML responses.

I then invalidated the CloudFront cache and verified the new response headers using Chrome Developer Tools.

To prevent future deployments from removing the metadata, I created a PowerShell deployment script that automatically applies the appropriate cache-control headers when uploading HTML files to S3.

Public CSS and JavaScript files retain separate caching behavior to improve performance.

## Verification

After deploying the changes, I confirmed that:

- HTML responses included `Cache-Control: no-store`.
- Protected pages remained accessible after successful authentication.
- Signing out redirected the browser to the access page.
- Fresh unauthenticated navigation to protected pages required authentication.
- The updated deployment process preserved the caching configuration.

## Key Takeaways

1. Server-side authorization cannot protect against the reuse of content already stored locally by a browser.
2. Browser caching and CloudFront caching are separate mechanisms that must be considered independently.
3. Browser Developer Tools and Incognito sessions are useful for isolating client-side behavior.
4. Security-related configuration should be incorporated into automated deployment processes rather than relying on manual changes.

## Remaining Considerations

The `no-store` directive does not erase previously cached or downloaded content, and browser back-forward caching may require separate testing.

CloudFront's internal caching configuration should also be reviewed independently of the browser-facing response headers.