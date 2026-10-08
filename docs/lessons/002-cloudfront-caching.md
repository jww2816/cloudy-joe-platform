# CloudFront Caching and Deployments

## Context

The Cloudy Joe frontend is stored in a private Amazon S3 bucket and delivered
through Amazon CloudFront.

## Observation

Uploading a new version of an object to Amazon S3 does not guarantee that
visitors immediately receive that version.

CloudFront edge locations can continue serving previously cached copies until
the cached objects expire.

## Resolution

CloudFront invalidations can remove cached objects before expiration.

After an invalidation completes, the next request causes CloudFront to
retrieve the current object from the origin.

## Lesson

Updating an origin and updating what users receive are separate concerns when
a CDN is involved.

A deployment process must account for both:

1. publishing new application files
2. refreshing or versioning cached content

## Future Application

The Cloudy Joe CI/CD pipeline will eventually automate frontend deployment and
CloudFront cache handling.

Long term, versioned asset filenames may be used to allow static resources to
be cached more aggressively while HTML uses a shorter cache lifetime.