import assert from "node:assert/strict";

import { handler } from
    "../services/edge-authorizer/index.mjs";

const event = {
    Records: [
        {
            cf: {
                request: {
                    clientIp: "203.0.113.10",
                    method: "GET",
                    uri: "/index.html",
                    querystring: "",
                    headers: {
                        host: [
                            {
                                key: "Host",
                                value: "www.cloudy-joe.com"
                            }
                        ]
                    }
                }
            }
        }
    ]
};

const response = await handler(event);

assert.equal(response.status, "302");

assert.equal(
    response.headers.location[0].value,
    "/access.html"
);

assert.equal(
    response.headers["cache-control"][0].value,
    "no-store, no-cache, must-revalidate"
);

console.log(
    "PASS: Actual Lambda handler rejects unauthenticated requests."
);

// Test: Reject a malformed JWT

const invalidTokenEvent = structuredClone(event);

invalidTokenEvent.Records[0].cf.request.headers.cookie = [
    {
        key: "Cookie",
        value: "cloudyJoeAccessToken=invalid.fake.token"
    }
];

const invalidTokenResponse =
    await handler(invalidTokenEvent);

assert.equal(invalidTokenResponse.status, "302");

assert.equal(
    invalidTokenResponse.headers.location[0].value,
    "/access.html"
);

console.log(
    "PASS: Actual Lambda handler rejects malformed JWTs."
);

// Test: Reject a forged JWT claiming approved membership

const forgedHeader = {
    alg: "RS256",
    typ: "JWT",
    kid: "fake-signing-key"
};

const forgedPayload = {
    iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KE62M5e9R",
    token_use: "access",
    client_id: "5d3a7lot7cbfd4hstpilblkdqf",
    exp: Math.floor(Date.now() / 1000) + 3600,
    "cognito:groups": ["CloudyJoeApproved"]
};

function encodeJwtPart(value) {
    return Buffer.from(
        JSON.stringify(value)
    ).toString("base64url");
}

const forgedToken = [
    encodeJwtPart(forgedHeader),
    encodeJwtPart(forgedPayload),
    Buffer.from("fake-signature").toString("base64url")
].join(".");

const forgedTokenEvent = structuredClone(event);

forgedTokenEvent.Records[0].cf.request.headers.cookie = [
    {
        key: "Cookie",
        value: `cloudyJoeAccessToken=${forgedToken}`
    }
];

const forgedTokenResponse = await handler(forgedTokenEvent);

assert.equal(forgedTokenResponse.status, "302");

assert.equal(
    forgedTokenResponse.headers.location[0].value,
    "/access.html"
);

console.log(
    "PASS: Actual Lambda handler rejects forged JWT."
);

// Test: Reject an invalid signature with a real Cognito key ID

const jwksUrl =
    "https://cognito-idp.us-east-1.amazonaws.com/" +
    "us-east-1_KE62M5e9R/.well-known/jwks.json";

const jwksResponse = await fetch(jwksUrl);

assert.equal(
    jwksResponse.ok,
    true,
    "Could not retrieve Cognito public signing keys."
);

const jwks = await jwksResponse.json();

const realSigningKey = jwks.keys.find(
    (key) => key.kty === "RSA" && key.kid
);

assert.ok(
    realSigningKey,
    "No suitable Cognito signing key found."
);

const tamperedHeader = {
    alg: "RS256",
    typ: "JWT",
    kid: realSigningKey.kid
};

const tamperedToken = [
    encodeJwtPart(tamperedHeader),
    encodeJwtPart(forgedPayload),
    Buffer.from("invalid-signature").toString("base64url")
].join(".");

const tamperedEvent = structuredClone(event);

tamperedEvent.Records[0].cf.request.headers.cookie = [
    {
        key: "Cookie",
        value: `cloudyJoeAccessToken=${tamperedToken}`
    }
];

const tamperedResponse = await handler(tamperedEvent);

assert.equal(tamperedResponse.status, "302");

assert.equal(
    tamperedResponse.headers.location[0].value,
    "/access.html"
);

console.log(
    "PASS: Actual Lambda handler rejects invalid JWT signature."
);