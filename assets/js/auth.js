"use strict";

/*
 * Cloudy Joe - Cognito Passwordless Authentication
 *
 * Flow:
 *
 * 1. InitiateAuth
 *      USER_AUTH
 *      PREFERRED_CHALLENGE = EMAIL_OTP
 *
 * 2. Cognito sends OTP through Amazon SES
 *
 * 3. RespondToAuthChallenge
 *      EMAIL_OTP
 *
 * 4. Cognito returns authentication tokens
 */


/* --------------------------------------------------
   Cognito Configuration
-------------------------------------------------- */

const cognitoConfig = {
    region: "us-east-1",
    clientId: "5d3a7lot7cbfd4hstpilblkdqf",
};


/* --------------------------------------------------
   Authentication State

   These values only live in browser memory for now.

   We deliberately are NOT storing authentication
   tokens in localStorage during this step.
-------------------------------------------------- */

let authenticationSession = null;
let authenticationUsername = null;


/* --------------------------------------------------
   DOM Elements
-------------------------------------------------- */

const emailPanel = document.querySelector("#email-panel");
const otpPanel = document.querySelector("#otp-panel");
const successPanel = document.querySelector("#success-panel");

const emailForm = document.querySelector("#email-form");
const otpForm = document.querySelector("#otp-form");

const emailInput = document.querySelector("#auth-email");
const otpInput = document.querySelector("#auth-code");

const emailStatus = document.querySelector("#email-status");
const otpStatus = document.querySelector("#otp-status");

const otpDestination = document.querySelector("#otp-destination");


/* --------------------------------------------------
   Cognito API Helper
-------------------------------------------------- */

async function callCognito(target, payload) {
    const endpoint =
        `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`;

    const response = await fetch(endpoint, {
        method: "POST",

        headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target":
                `AWSCognitoIdentityProviderService.${target}`,
        },

        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        const message =
            data.message ||
            data.Message ||
            "Cognito request failed.";

        throw new Error(message);
    }

    return data;
}


/* --------------------------------------------------
   Start Email OTP Authentication
-------------------------------------------------- */

async function startAuthentication(email) {
    const payload = {
        AuthFlow: "USER_AUTH",

        ClientId: cognitoConfig.clientId,

        AuthParameters: {
            USERNAME: email,
            PREFERRED_CHALLENGE: "EMAIL_OTP",
        },
    };

    return callCognito(
        "InitiateAuth",
        payload
    );
}


/* --------------------------------------------------
   Respond to Email OTP Challenge
-------------------------------------------------- */

async function verifyAuthenticationCode(code) {
    const payload = {
        ClientId: cognitoConfig.clientId,

        ChallengeName: "EMAIL_OTP",

        Session: authenticationSession,

        ChallengeResponses: {
            USERNAME: authenticationUsername,
            EMAIL_OTP_CODE: code,
        },
    };

    return callCognito(
        "RespondToAuthChallenge",
        payload
    );
}


/* --------------------------------------------------
   Email Form
-------------------------------------------------- */

if (emailForm) {
    emailForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const email =
                emailInput.value.trim().toLowerCase();

            if (!email) {
                emailStatus.textContent =
                    "Enter your approved email address.";
                return;
            }

            emailStatus.textContent =
                "Sending sign-in code...";

            try {
                const result =
                    await startAuthentication(email);

                /*
                 * Cognito should return:
                 *
                 * ChallengeName: EMAIL_OTP
                 * Session: ...
                 */

                if (result.ChallengeName !== "EMAIL_OTP") {
                    console.error(
                        "Unexpected authentication challenge:",
                        result
                    );

                    throw new Error(
                        `Unexpected Cognito challenge: ${
                            result.ChallengeName || "unknown"
                        }`
                    );
                }

                if (!result.Session) {
                    throw new Error(
                        "Cognito did not return an authentication session."
                    );
                }

                authenticationSession =
                    result.Session;

                authenticationUsername =
                    email;

                emailStatus.textContent = "";

                if (otpDestination) {
                    otpDestination.textContent =
                        result.ChallengeParameters?.CODE_DELIVERY_DESTINATION ||
                        email;
                }

                emailPanel.hidden = true;
                otpPanel.hidden = false;

                otpInput.focus();

                console.log(
                    "Cognito EMAIL_OTP challenge received."
                );
            } catch (error) {
                console.error(
                    "Authentication start failed:",
                    error
                );

                emailStatus.textContent =
                    error.message;
            }
        }
    );
}


/* --------------------------------------------------
   OTP Form
-------------------------------------------------- */

function storeAccessToken(accessToken) {
    /*
     * Cognito access tokens default to a limited
     * lifetime. For this phase, our browser cookie
     * will live for at most one hour.
     *
     * The Lambda@Edge authorizer will ALSO inspect
     * the token's exp claim, so Max-Age alone is
     * never trusted for authorization.
     */

    const maxAge = 60 * 60;

    document.cookie = [
        `cloudyJoeAccessToken=${encodeURIComponent(accessToken)}`,
        "Path=/",
        `Max-Age=${maxAge}`,
        "Secure",
        "SameSite=Lax"
    ].join("; ");
}

if (otpForm) {
    otpForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const code =
                otpInput.value.trim();

            if (!code) {
                otpStatus.textContent =
                    "Enter the code from your email.";
                return;
            }

            if (
                !authenticationSession ||
                !authenticationUsername
            ) {
                otpStatus.textContent =
                    "Authentication session expired. Start again.";
                return;
            }

            otpStatus.textContent =
                "Verifying code...";

            try {
                const result =
                    await verifyAuthenticationCode(code);

                if (!result.AuthenticationResult) {
                    console.error(
                        "Unexpected Cognito response:",
                        result
                    );

                    throw new Error(
                        "Authentication did not complete."
                    );
                }

                /*
                 * DO NOT log the token values.
                 *
                 * JWTs are credentials.
                 */

                console.log(
                    "Authentication successful."
                );

                const accessToken =
                    result.AuthenticationResult.AccessToken;

                if (!accessToken) {
                    throw new Error(
                    "Cognito did not return an access token."
                        );
                                    }

                window.location.replace("/index.html");

storeAccessToken(accessToken);

                console.log(
                    "Access token received:",
                    Boolean(
                        result.AuthenticationResult.AccessToken
                    )
                );

                console.log(
                    "ID token received:",
                    Boolean(
                        result.AuthenticationResult.IdToken
                    )
                );

                console.log(
                    "Refresh token received:",
                    Boolean(
                        result.AuthenticationResult.RefreshToken
                    )
                );

                otpStatus.textContent = "";

                otpPanel.hidden = true;
                successPanel.hidden = false;

                /*
                 * We intentionally do not persist tokens yet.
                 *
                 * Token/session storage and protected-resource
                 * authorization will be handled separately.
                 */
            } catch (error) {
                console.error(
                    "OTP verification failed:",
                    error
                );

                otpStatus.textContent =
                    error.message;
            }
        }
    );

    function clearAccessToken() {
    document.cookie = [
        "cloudyJoeAccessToken=",
        "Path=/",
        "Max-Age=0",
        "Secure",
        "SameSite=Lax"
    ].join("; ");
}
}