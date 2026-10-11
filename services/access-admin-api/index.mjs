
import {
  LambdaClient,
  InvokeCommand
} from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({});

const ADMIN_FUNCTION = "cloudy-joe-access-admin";
const APPROVAL_FUNCTION = "cloudy-joe-access-approval";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "https://www.cloudy-joe.com",
  "Vary": "Origin"
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

async function invokeFunction(functionName, payload) {
  const result = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload))
    })
  );

  if (result.FunctionError) {
    throw new Error("Backend Lambda invocation failed");
  }

  const text = Buffer.from(result.Payload ?? []).toString("utf8");
  const response = JSON.parse(text);

  return {
    statusCode: response.statusCode ?? 500,
    body: response.body ?? JSON.stringify({
      message: "Unexpected backend response"
    })
  };
}

export const handler = async (event) => {
  const claims = event.requestContext?.authorizer?.jwt?.claims;

  // Require a Cognito access token validated by API Gateway.
  if (!claims || claims.token_use !== "access") {
    return respond(403, {
      message: "Administrator authentication required"
    });
  }

  // API Gateway may represent Cognito groups as:
  // "[CloudyJoeAdmin CloudyJoeApproved]"
  // Handle arrays, spaces, and commas.
  const groups = claims["cognito:groups"];

  const groupList = Array.isArray(groups)
    ? groups
    : typeof groups === "string"
      ? groups
          .replace(/^\[|\]$/g, "")
          .split(/[\s,]+/)
          .filter(Boolean)
      : [];

  if (!groupList.includes("CloudyJoeAdmin")) {
    return respond(403, {
      message: "Administrator privileges required"
    });
  }

  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  let functionName;
  let payload;

  if (method === "GET" && path === "/admin/requests") {
    functionName = ADMIN_FUNCTION;
    payload = {
      action: "list"
    };

  } else if (
    method === "POST" &&
    path === "/admin/requests/approve"
  ) {
    functionName = APPROVAL_FUNCTION;

    try {
      const body = JSON.parse(event.body || "{}");

      if (typeof body.requestId !== "string" ||
          !body.requestId.trim()) {
        return respond(400, {
          message: "A valid requestId is required"
        });
      }

      payload = {
        action: "approve",
        requestId: body.requestId
      };

    } catch {
      return respond(400, {
        message: "Invalid JSON body"
      });
    }

  } else if (
    method === "POST" &&
    path === "/admin/requests/reject"
  ) {
    functionName = ADMIN_FUNCTION;

    try {
      const body = JSON.parse(event.body || "{}");

      if (typeof body.requestId !== "string" ||
          !body.requestId.trim()) {
        return respond(400, {
          message: "A valid requestId is required"
        });
      }

      payload = {
        action: "reject",
        requestId: body.requestId
      };

    } catch {
      return respond(400, {
        message: "Invalid JSON body"
      });
    }

  } else {
    return respond(404, {
      message: "Unknown admin route"
    });
  }

  try {
    const result = await invokeFunction(functionName, payload);

    return {
      statusCode: result.statusCode,
      headers,
      body: result.body
    };

  } catch (error) {
    console.error("Admin API backend error", {
      errorName: error.name
    });

    return respond(502, {
      message: "Administrator operation failed"
    });
  }
};
