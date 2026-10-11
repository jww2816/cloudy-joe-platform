import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

const response = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  const action = event?.action;

  if (action === "list") {
    const requests = [];
    let lastKey;

    do {
      const result = await dynamodb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ExclusiveStartKey: lastKey
        })
      );

      for (const item of result.Items ?? []) {
        requests.push({
          requestId: item.requestId?.S,
          name: item.name?.S,
          email: item.email?.S,
          company: item.company?.S,
          reason: item.reason?.S,
          status: item.status?.S,
          createdAt: item.createdAt?.S
        });
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    requests.sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );

    return response(200, { requests });
  }

  if (action === "reject") {
    const requestId = event?.requestId;

    if (
      typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
    ) {
      return response(400, {
        message: "A valid requestId is required"
      });
    }

    try {
      await dynamodb.send(
        new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: {
            requestId: { S: requestId }
          },
          UpdateExpression:
            "SET #status = :rejected, rejectedAt = :now",
          ConditionExpression: "#status = :pending",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":rejected": { S: "REJECTED" },
            ":pending": { S: "PENDING" },
            ":now": { S: new Date().toISOString() }
          }
        })
      );

      return response(200, {
        message: "Access request rejected",
        requestId,
        status: "REJECTED"
      });
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return response(409, {
          message: "Request is missing or no longer pending"
        });
      }

      console.error("Reject failed:", error);
      return response(500, {
        message: "Unable to reject access request"
      });
    }
  }

  return response(400, {
    message: "Unsupported administrator action"
  });
};
