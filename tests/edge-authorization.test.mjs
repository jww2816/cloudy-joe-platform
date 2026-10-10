import assert from "node:assert/strict";

const APPROVED_GROUP = "CloudyJoeApproved";

function hasApprovedAccess(payload) {
    const groups = payload["cognito:groups"];

    return (
        Array.isArray(groups) &&
        groups.includes(APPROVED_GROUP)
    );
}

const testCases = [
    {
        name: "Approved user",
        groups: ["CloudyJoeApproved"],
        expected: true
    },
    {
        name: "Unapproved user",
        groups: ["SomeOtherGroup"],
        expected: false
    },
    {
        name: "No groups",
        groups: undefined,
        expected: false
    },
    {
        name: "Empty groups",
        groups: [],
        expected: false
    },
    {
        name: "Multiple groups including approved",
        groups: ["OtherGroup", "CloudyJoeApproved"],
        expected: true
    },
    {
        name: "Forged-looking string instead of array",
        groups: "CloudyJoeApproved",
        expected: false
    }
];

for (const test of testCases) {
    const payload = {
        "cognito:groups": test.groups
    };

    const actual = hasApprovedAccess(payload);

    assert.equal(
        actual,
        test.expected,
        test.name
    );

    console.log(`PASS: ${test.name}`);
}

console.log("\nAll authorization decision tests passed.");