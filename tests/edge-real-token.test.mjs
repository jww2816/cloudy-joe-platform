import assert from "node:assert/strict";
import { handler } from "../services/edge-authorizer/index.mjs";

const token = process.env.CLOUDY_JOE_TEST_TOKEN;

if (!token) {
    throw new Error("Missing CLOUDY_JOE_TEST_TOKEN");
}

const request = {
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
        ],
        cookie: [
            {
                key: "Cookie",
                value: `cloudyJoeAccessToken=${token}`
            }
        ]
    }
};

const response = await handler({
    Records: [{ cf: { request } }]
});

assert.equal(
    response.status,
    undefined,
    "Expected an authorized request, but received a redirect."
);

assert.equal(response.uri, "/index.html");

assert.equal(
    response.headers.cookie,
    undefined,
    "Authentication cookie should not be forwarded to S3."
);

console.log("PASS: Genuine approved Cognito token accepted.");
console.log("PASS: Authentication cookie removed before forwarding.");