
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

const MAX_BODY_BYTES = 4096;

const EMAIL_INDEX = "email-createdAt-index";
const DUPLICATE_WINDOW_HOURS = 24;

async function hasRecentRequest(email) {
  const cutoff = new Date(
    Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const result = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: EMAIL_INDEX,
    KeyConditionExpression: "#email = :email AND #createdAt >= :cutoff",
    ExpressionAttributeNames: {
      "#email": "email",
      "#createdAt": "createdAt"
    },
    ExpressionAttributeValues: {
      ":email": { S: email },
      ":cutoff": { S: cutoff }
    },
    Limit: 1
  }));

  return (result.Count ?? 0) > 0;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method !== "POST") {
      return response(405, { message: "Method not allowed" });
    }

    if (event.isBase64Encoded) {
      return response(400, { message: "Invalid request body" });
    }

    const rawBody = event.body || "";

    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return response(413, { message: "Request too large" });
    }

    let data;

    try {
      data = JSON.parse(rawBody);
    } catch {
      return response(400, { message: "Invalid JSON" });
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return response(400, { message: "Invalid request" });
    }

    const allowedFields = new Set([
      "name",
      "email",
      "company",
      "reason"
    ]);

    const hasUnexpectedFields = Object.keys(data).some(
      (field) => !allowedFields.has(field)
    );

    if (hasUnexpectedFields) {
      return response(400, {
        message: "Unexpected request fields"
      });
    }

    const { name, email, company, reason } = data;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof company !== "string" ||
      typeof reason !== "string"
    ) {
      return response(400, { message: "All fields are required" });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = company.trim();
    const cleanReason = reason.trim();

    if (
      cleanName.length < 2 || cleanName.length > 100 ||
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanCompany.length < 2 || cleanCompany.length > 150 ||
      cleanReason.length < 10 || cleanReason.length > 1000
    ) {
      return response(400, { message: "Invalid form information" });
    }

    const duplicateRequest = await hasRecentRequest(cleanEmail);

    if (duplicateRequest) {
      return response(429, {
        message: "An access request was recently submitted for this email."
    });
  }

    const requestId = randomUUID();
    const createdAt = new Date().toISOString();

    await dynamodb.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        requestId: { S: requestId },
        name: { S: cleanName },
        email: { S: cleanEmail },
        company: { S: cleanCompany },
        reason: { S: cleanReason },
        status: { S: "PENDING" },
        createdAt: { S: createdAt }
      },
      ConditionExpression: "attribute_not_exists(requestId)"
    }));

    return response(201, {
      message: "Access request submitted successfully"
    });

  } catch (error) {
    console.error("Access request processing failed:", error.name);

    return response(500, {
      message: "Unable to process request"
    });
  }
};
