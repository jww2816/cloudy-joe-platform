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
    "302",
    "Expected unapproved user to be denied."
);

assert.equal(
    response.headers.location[0].value,
    "/access.html"
);

console.log(
    "PASS: Valid Cognito token without approved group was rejected."
);