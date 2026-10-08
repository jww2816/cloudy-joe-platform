import https from "https";
import crypto from "crypto";


/* --------------------------------------------------
   Configuration
-------------------------------------------------- */

const REGION = "us-east-1";

const USER_POOL_ID =
    "us-east-1_KE62M5e9R";

const CLIENT_ID =
    "5d3a7lot7cbfd4hstpilblkdqf";

const ISSUER =
    `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

const JWKS_URL =
    `${ISSUER}/.well-known/jwks.json`;


/*
 * Lambda execution environments can be reused.
 *
 * Keeping keys in memory avoids downloading JWKS
 * on every request while still allowing us to
 * refresh when Cognito presents a new kid.
 */

let cachedJwks = null;


/* --------------------------------------------------
   CloudFront Handler
-------------------------------------------------- */

export async function handler(event) {
    const request =
        event.Records[0].cf.request;

    try {
        const token =
            getCookie(
                request.headers,
                "cloudyJoeAccessToken"
            );

        if (!token) {
            return redirectToAccess();
        }

        const payload =
            await verifyCognitoToken(token);

        /*
         * At this point authentication and
         * authorization have succeeded.
         *
         * Do NOT forward the JWT to S3.
         */

        removeAuthCookieFromOriginRequest(
            request.headers
        );

        return request;

    } catch (error) {
        console.log(
            "Authorization denied:",
            error.message
        );

        return redirectToAccess();
    }
}


/* --------------------------------------------------
   Cookie Parsing
-------------------------------------------------- */

function getCookie(headers, name) {
    const cookieHeaders =
        headers.cookie || [];

    for (const header of cookieHeaders) {
        const cookies =
            header.value.split(";");

        for (const cookie of cookies) {
            const [cookieName, ...valueParts] =
                cookie.trim().split("=");

            if (cookieName === name) {
                return decodeURIComponent(
                    valueParts.join("=")
                );
            }
        }
    }

    return null;
}


function removeAuthCookieFromOriginRequest(headers) {
    if (!headers.cookie) {
        return;
    }

    const cleaned = headers.cookie
        .map((header) => {
            const cookies = header.value
                .split(";")
                .map((cookie) => cookie.trim())
                .filter(
                    (cookie) =>
                        !cookie.startsWith(
                            "cloudyJoeAccessToken="
                        )
                );

            return {
                key: "Cookie",
                value: cookies.join("; ")
            };
        })
        .filter(
            (header) =>
                header.value.length > 0
        );

    if (cleaned.length > 0) {
        headers.cookie = cleaned;
    } else {
        delete headers.cookie;
    }
}


/* --------------------------------------------------
   JWT Verification
-------------------------------------------------- */

async function verifyCognitoToken(token) {
    const parts = token.split(".");

    if (parts.length !== 3) {
        throw new Error(
            "Malformed JWT."
        );
    }

    const header =
        JSON.parse(
            base64UrlDecode(parts[0])
        );

    const payload =
        JSON.parse(
            base64UrlDecode(parts[1])
        );

    if (header.alg !== "RS256") {
        throw new Error(
            "Unexpected signing algorithm."
        );
    }

    if (!header.kid) {
        throw new Error(
            "JWT has no key ID."
        );
    }

    let jwk =
        await getSigningKey(header.kid);

    /*
     * If Cognito rotated its signing key,
     * refresh the JWKS cache once.
     */

    if (!jwk) {
        cachedJwks = null;

        jwk =
            await getSigningKey(
                header.kid
            );
    }

    if (!jwk) {
        throw new Error(
            "No matching Cognito signing key."
        );
    }

    const publicKey =
        crypto.createPublicKey({
            key: jwk,
            format: "jwk"
        });

    const verifier =
        crypto.createVerify(
            "RSA-SHA256"
        );

    verifier.update(
        `${parts[0]}.${parts[1]}`
    );

    verifier.end();

    const signature =
        base64UrlToBuffer(parts[2]);

    const signatureValid =
        verifier.verify(
            publicKey,
            signature
        );

    if (!signatureValid) {
        throw new Error(
            "Invalid JWT signature."
        );
    }

    validateClaims(payload);

    return payload;
}


/* --------------------------------------------------
   Claims Validation
-------------------------------------------------- */

function validateClaims(payload) {
    const now =
        Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
        throw new Error(
            "JWT has expired."
        );
    }

    if (payload.iss !== ISSUER) {
        throw new Error(
            "Invalid token issuer."
        );
    }

    if (payload.token_use !== "access") {
        throw new Error(
            "Expected Cognito access token."
        );
    }

    if (payload.client_id !== CLIENT_ID) {
        throw new Error(
            "Token belongs to another app client."
        );
    }
}


/* --------------------------------------------------
   Cognito JWKS
-------------------------------------------------- */

async function getSigningKey(kid) {
    if (!cachedJwks) {
        cachedJwks =
            await downloadJwks();
    }

    return cachedJwks.keys.find(
        (key) =>
            key.kid === kid
    );
}


function downloadJwks() {
    return new Promise(
        (resolve, reject) => {

            https.get(
                JWKS_URL,
                (response) => {
                    let data = "";

                    response.on(
                        "data",
                        (chunk) => {
                            data += chunk;
                        }
                    );

                    response.on(
                        "end",
                        () => {
                            if (
                                response.statusCode !==
                                200
                            ) {
                                reject(
                                    new Error(
                                        "Could not retrieve Cognito JWKS."
                                    )
                                );

                                return;
                            }

                            try {
                                resolve(
                                    JSON.parse(data)
                                );
                            } catch {
                                reject(
                                    new Error(
                                        "Invalid JWKS response."
                                    )
                                );
                            }
                        }
                    );
                }
            ).on(
                "error",
                reject
            );
        }
    );
}


/* --------------------------------------------------
   Base64URL Helpers
-------------------------------------------------- */

function base64UrlDecode(value) {
    return base64UrlToBuffer(
        value
    ).toString("utf8");
}


function base64UrlToBuffer(value) {
    let base64 = value
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (
        base64.length % 4 !== 0
    ) {
        base64 += "=";
    }

    return Buffer.from(
        base64,
        "base64"
    );
}


/* --------------------------------------------------
   Unauthorized Response
-------------------------------------------------- */

function redirectToAccess() {
    return {
        status: "302",
        statusDescription: "Found",

        headers: {
            location: [
                {
                    key: "Location",
                    value: "/access.html"
                }
            ],

            "cache-control": [
                {
                    key: "Cache-Control",
                    value:
                        "no-store, no-cache, must-revalidate"
                }
            ]
        }
    };
}