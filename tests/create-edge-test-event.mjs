import fs from "node:fs";

const token = process.env.CLOUDY_JOE_TEST_TOKEN;

if (!token) {
    throw new Error("Missing CLOUDY_JOE_TEST_TOKEN");
}

const event = {
    Records: [
        {
            cf: {
                config: {
                    distributionDomainName: "example.cloudfront.net",
                    distributionId: "EXAMPLE",
                    eventType: "viewer-request",
                    requestId: "test-approved-token"
                },
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
                        ],
                        cookie: [
                            {
                                key: "Cookie",
                                value: `cloudyJoeAccessToken=${token}`
                            }
                        ]
                    }
                }
            }
        }
    ]
};

fs.writeFileSync(
    "tests/edge-test-event.json",
    JSON.stringify(event),
    { mode: 0o600 }
);

console.log("Test event created.");