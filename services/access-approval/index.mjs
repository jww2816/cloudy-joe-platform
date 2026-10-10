import { randomUUID } from "node:crypto";

import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand
} from "@aws-sdk/client-cognito-identity-provider";


const dynamodb = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});

const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;
const APPROVED_GROUP = "CloudyJoeApproved";



async function claimRequest(requestId, attemptId) {
  try {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          requestId: { S: requestId }
        },
        UpdateExpression:
          "SET #status = :processing, approvalAttemptId = :attemptId, approvalStartedAt = :startedAt",
        ConditionExpression: "#status = :pending",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":pending": { S: "PENDING" },
          ":processing": { S: "PROCESSING" },
          ":attemptId": { S: attemptId },
          ":startedAt": { S: new Date().toISOString() }
        }
      })
    );

    return true;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return false;
    }

    throw error;
  }
}



async function provisionCognitoUser(email) {
  let createdUser;

  try {
    const result = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        MessageAction: "SUPPRESS"
      })
    );

    createdUser = result.User;

  } catch (error) {
    if (error.name !== "UsernameExistsException") {
      throw error;
    }

    const existing = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      })
    );

    return {
      created: false,
      alreadyExists: true,
      username: existing.Username,
      enabled: existing.Enabled,
      userStatus: existing.UserStatus
    };
  }

  // Disable the newly created account until approval completes.
  try {
    await cognito.send(
      new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      })
    );

  } catch (error) {
    console.error("Initial Cognito disable attempt failed", {
      email,
      errorName: error.name
    });

    try {
      // Retry disabling the newly created account.
      await cognito.send(
        new AdminDisableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email
        })
      );

      console.log("Cognito user disabled on retry", {
        email
      });

    } catch (retryError) {
      console.error("CRITICAL: Cognito user may remain enabled", {
        email,
        errorName: retryError.name
      });

      // The outer handler will mark the request REVIEW_REQUIRED.
      retryError.createdCognitoUsername = createdUser?.Username || email;
      throw retryError;

    }
  }


  return {
    created: true,
    username: createdUser?.Username,
    enabled: false
  };
}



async function completeApproval(requestId, attemptId, cognitoUsername) {
  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      UpdateExpression:
        "SET #status = :approved, approvedAt = :approvedAt, cognitoUsername = :username",
      ConditionExpression:
        "#status = :processing AND approvalAttemptId = :attemptId",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":processing": { S: "PROCESSING" },
        ":approved": { S: "APPROVED" },
        ":attemptId": { S: attemptId },
        ":approvedAt": { S: new Date().toISOString() },
        ":username": { S: cognitoUsername }
      }
    })
  );
}


async function beginAccessActivation(requestId, attemptId) {
  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      UpdateExpression:
        "SET #status = :activating, activationStartedAt = :now",
      ConditionExpression:
        "#status = :approved AND approvalAttemptId = :attemptId",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":approved": { S: "APPROVED" },
        ":activating": { S: "ACCESS_ACTIVATING" },
        ":attemptId": { S: attemptId },
        ":now": { S: new Date().toISOString() }
      }
    })
  );
}


async function recordApprovalFailure(requestId, attemptId) {
  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      UpdateExpression:
        "SET #status = :review, approvalFailedAt = :failedAt",
      ConditionExpression:
        "#status = :processing AND approvalAttemptId = :attemptId",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":processing": { S: "PROCESSING" },
        ":review": { S: "REVIEW_REQUIRED" },
        ":attemptId": { S: attemptId },
        ":failedAt": { S: new Date().toISOString() }
      }
    })
  );
}



async function recordActivationFailure(requestId, attemptId) {
  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      UpdateExpression:
        "SET #status = :review, activationFailedAt = :failedAt",
      ConditionExpression:
        "#status = :activationRequired AND approvalAttemptId = :attemptId",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":activationRequired": { S: "ACCESS_ACTIVATING" },
        ":review": { S: "REVIEW_REQUIRED" },
        ":attemptId": { S: attemptId },
        ":failedAt": { S: new Date().toISOString() }
      }
    })
  );
}



async function recordActiveActivationFailure(requestId, attemptId) {
  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      UpdateExpression:
        "SET #status = :reviewRequired, activationFailedAt = :failedAt",
      ConditionExpression:
        "#status = :active AND approvalAttemptId = :attemptId",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":reviewRequired": { S: "REVIEW_REQUIRED" },
        ":active": { S: "ACTIVE" },
        ":attemptId": { S: attemptId },
        ":failedAt": { S: new Date().toISOString() }
      }
    })
  );
}



async function finalizeApproval(requestId, attemptId) {
  const now = new Date().toISOString();

  await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      UpdateExpression:
        "SET #status = :approved, activatedAt = :now",
      ConditionExpression:
        "#status = :activationRequired AND approvalAttemptId = :attemptId",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":approved": { S: "ACTIVE" },
        ":activationRequired": { S: "ACCESS_ACTIVATING" },
        ":attemptId": { S: attemptId },
        ":now": { S: now }
      }
    })
  );
}



async function activateCognitoUser(username) {
  await cognito.send(
    new AdminEnableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    })
  );

  const result = await cognito.send(
    new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    })
  );

  if (result.Enabled !== true) {
    throw new Error("Cognito user activation could not be verified");
  }

  return {
    username: result.Username,
    enabled: true,
    userStatus: result.UserStatus
  };
}



async function addUserToApprovedGroup(username) {
  // Add the user to the approved access group.
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: APPROVED_GROUP
    })
  );



async function removeUserFromApprovedGroup(username) {
  if (!username) {
    throw new Error("Username is required for group removal");
  }

  // Remove authorization from the Cognito user.
  await cognito.send(
    new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: APPROVED_GROUP
    })
  );

  // Verify that the user is no longer a group member.
  const result = await cognito.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    })
  );

  const stillApproved = (result.Groups || []).some(
    (group) => group.GroupName === APPROVED_GROUP
  );

  if (stillApproved) {
    throw new Error(
      "Cognito approved-group membership still exists"
    );
  }

  console.log("Approved-group membership removed", {
    username
  });

  return true;
}



  // Retrieve the user's groups to verify membership.
  const result = await cognito.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    })
  );

  const isApproved = (result.Groups || []).some(
    (group) => group.GroupName === APPROVED_GROUP
  );

  if (!isApproved) {
    throw new Error(
      "Cognito approved-group membership could not be verified"
    );
  }

  return {
    username,
    group: APPROVED_GROUP,
    verified: true
  };
}



async function disableCognitoUserAfterFailure(username) {
  if (!username) {
    return false;
  }

  try {
    await cognito.send(
      new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
      })
    );

    const result = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
      })
    );

    if (result.Enabled !== false) {
      throw new Error("Cognito user is still enabled");
    }

    console.log("Cognito account disabled after approval failure", {
      username
    });

    return true;

  } catch (error) {
    console.error("CRITICAL: Could not verify Cognito account is disabled", {
      username,
      errorName: error.name
    });

    return false;
  }
}




function isApprovalStale(item, maxAgeMinutes = 15) {
  const status = item?.status?.S;

  const timestamps = {
    PROCESSING: item?.approvalStartedAt?.S,
    APPROVED: item?.approvedAt?.S,
    ACCESS_ACTIVATING: item?.activationStartedAt?.S
  };

  if (!Object.prototype.hasOwnProperty.call(timestamps, status)) {
    return false;
  }

  const timestamp = timestamps[status];

  // Missing or invalid timestamps require investigation.
  if (!timestamp) {
    return true;
  }

  const startedAt = Date.parse(timestamp);

  if (!Number.isFinite(startedAt)) {
    return true;
  }

  const ageMilliseconds = Date.now() - startedAt;
  const maxAgeMilliseconds = maxAgeMinutes * 60 * 1000;

  return ageMilliseconds > maxAgeMilliseconds;
}




async function inspectCognitoUser(email) {
  try {
    const user = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      })
    );

    const groupsResult = await cognito.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      })
    );

    const groups = (groupsResult.Groups || [])
      .map((group) => group.GroupName);

    return {
      exists: true,
      username: user.Username,
      enabled: user.Enabled,
      userStatus: user.UserStatus,
      groups,
      inApprovedGroup: groups.includes(APPROVED_GROUP)
    };

  } catch (error) {
    if (error.name === "UserNotFoundException") {
      return {
        exists: false,
        enabled: false,
        groups: [],
        inApprovedGroup: false
      };
    }

    // Do not mistake an AWS permission or service error
    // for a nonexistent Cognito account.
    throw error;
  }
}



function assessApprovalConsistency(status, cognitoState, potentiallyStale) {
  if (!cognitoState) {
    return {
      consistent: false,
      requiresReview: true,
      reason: "Cognito state could not be determined"
    };
  }

  const hasAccess =
    cognitoState.exists &&
    cognitoState.enabled === true &&
    cognitoState.inApprovedGroup === true;


  // Group membership is unexpected before final approval.
  // Even a disabled account deserves review because it
  // could regain access if re-enabled later.
  if (
    status !== "ACTIVE" &&
    cognitoState.inApprovedGroup === true
  ) {
    return {
      consistent: false,
      requiresReview: true,
      reason: "Cognito approved-group membership exists before DynamoDB is ACTIVE"
    };
  }


  // Access should only be active after approval is finalized.
  if (status !== "ACTIVE" && hasAccess) {
    return {
      consistent: false,
      requiresReview: true,
      reason: "Cognito access is enabled before DynamoDB is ACTIVE"
    };
  }

  if (status === "ACTIVE") {
    const consistent = hasAccess;

    return {
      consistent,
      requiresReview: !consistent,
      reason: consistent
        ? "DynamoDB and Cognito access states agree"
        : "DynamoDB is ACTIVE but Cognito access is incomplete"
    };
  }

  if (potentiallyStale) {
    return {
      consistent: false,
      requiresReview: true,
      reason: "Approval has remained in an intermediate state too long"
    };
  }

  if (status === "REVIEW_REQUIRED") {
    return {
      consistent: false,
      requiresReview: true,
      reason: "Request was previously flagged for manual review"
    };
  }

  return {
    consistent: true,
    requiresReview: false,
    reason: "No immediate access-state inconsistency detected"
  };
}



async function inspectAccessRequest(requestId) {
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      ConsistentRead: true
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Access request not found",
        requestId
      })
    };
  }

  const item = result.Item;
  const status = item.status?.S;

  
  // Inspect Cognito without changing the account.
  const email = item.email?.S;
  const cognitoUsername = item.cognitoUsername?.S;

  const cognitoState = email
    ? await inspectCognitoUser(cognitoUsername || email)
    : null;
    
  // Compare DynamoDB status against actual Cognito access.
  const potentiallyStale = isApprovalStale(item);
  

  const consistency = assessApprovalConsistency(
    status,
    cognitoState,
    potentiallyStale
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      requestId,
      email: item.email?.S || null,
      status,
      approvalAttemptId: item.approvalAttemptId?.S || null,
      approvalStartedAt: item.approvalStartedAt?.S || null,
      activationStartedAt: item.activationStartedAt?.S || null,
      approvedAt: item.approvedAt?.S || null,
      activatedAt: item.activatedAt?.S || null,
      cognitoUsername: item.cognitoUsername?.S || null,
      potentiallyStale,
      cognito: cognitoState,
      consistency
    })
  };
}



export const handler = async (event) => {
  // Only allow explicitly supported administrator actions.
  if (
    event?.action !== "approve" &&
    event?.action !== "inspect"
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Unsupported approval action"
      })
    };
  }

  const requestId = event?.requestId;

  // Validate the request ID.
  if (
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "A valid requestId is required"
      })
    };
  }

    // Inspection is read-only and exits before approval processing.
  if (event.action === "inspect") {
    return await inspectAccessRequest(requestId);
  }

  // Retrieve the existing request.
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        requestId: { S: requestId }
      },
      ConsistentRead: true
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Access request not found"
      })
    };
  }

  const status = result.Item.status?.S;
  const email = result.Item.email?.S;

  if (status !== "PENDING") {
    return {
      statusCode: 409,
      body: JSON.stringify({
        message: "Request is not pending",
        currentStatus: status
      })
    };
  }

  if (!email) {
    return {
      statusCode: 422,
      body: JSON.stringify({
        message: "Request has no email address"
      })
    };
  }



  // Preview an approval without modifying AWS resources.
  if (event?.dryRun === true) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Dry run successful; no changes made",
        requestId,
        email,
        currentStatus: status,
        proposedAction: "approve",
        wouldCreateCognitoUser: true
      })
    };
  }


  const attemptId = randomUUID();
  let createdCognitoUsername = null;

  // Atomically claim the request.
  const claimed = await claimRequest(requestId, attemptId);

  if (!claimed) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        message: "Request was already claimed"
      })
    };
  }

  try {
    // Create the approved Cognito user.
    const provisioned = await provisionCognitoUser(email);
    
if (provisioned.created) {
  createdCognitoUsername = provisioned.username || email;
}


    if (provisioned.alreadyExists) {
      throw new Error(
        "Cognito user already exists; manual review required"
      );
    }

    if (!provisioned.username) {
      throw new Error(
        "Cognito did not return a username"
      );
    }

    // Mark the request approved only after provisioning.

    // Record the administrator's approval decision.
    await completeApproval(
      requestId,
      attemptId,
      provisioned.username
    );

    // Begin configuring the approved user's access.
    await beginAccessActivation(requestId, attemptId);

    // Assign approved-group membership while the account
    // is still disabled.
    await addUserToApprovedGroup(provisioned.username);

    // Finalize the DynamoDB approval record.
    await finalizeApproval(requestId, attemptId);

    // Enable the Cognito account only after the
    // approval record has been finalized.
    await activateCognitoUser(provisioned.username);


    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Access request approved",
        requestId,
        status: "ACTIVE"
      })
    };

  } catch (error) {
    console.error("Approval processing failed", {
      requestId,
      attemptId,
      errorName: error.name
    });


    
    // Recover the username if provisioning failed after account creation.
    if (!createdCognitoUsername && error.createdCognitoUsername) {
      createdCognitoUsername = error.createdCognitoUsername;
    }


    

    if (createdCognitoUsername) {
      // Remove access authorization before disabling the account.
      try {
        await removeUserFromApprovedGroup(createdCognitoUsername);
      } catch (groupError) {
        console.error("CRITICAL: Could not remove approved-group membership", {
          requestId,
          attemptId,
          username: createdCognitoUsername,
          errorName: groupError.name
        });
      }

      // Disable the account even if group removal failed.
      const disabled = await disableCognitoUserAfterFailure(
        createdCognitoUsername
      );

      if (!disabled) {
        console.error("CRITICAL: Manual Cognito cleanup required", {
          requestId,
          attemptId,
          username: createdCognitoUsername
        });
      }
    }



    
    try {
      // Read the latest request state before recording failure.
      const current = await dynamodb.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: {
            requestId: { S: requestId }
          },
          ConsistentRead: true
        })
      );

      const currentStatus = current.Item?.status?.S;
      const currentAttemptId =
        current.Item?.approvalAttemptId?.S;

if (currentAttemptId !== attemptId) {
  console.error("Approval attempt mismatch; manual review needed", {
    requestId,
    currentStatus
  });
} else if (currentStatus === "PROCESSING") {
  await recordApprovalFailure(requestId, attemptId);
} else if (currentStatus === "ACCESS_ACTIVATING") {
  await recordActivationFailure(requestId, attemptId);

} else if (currentStatus === "APPROVED") {
  console.error("Approved request requires activation review", {
    requestId,
    attemptId
  });
} else if (currentStatus === "ACTIVE") {
  await recordActiveActivationFailure(requestId, attemptId);
} else {

  console.error("Unexpected approval state; manual review needed", {
    requestId,
    currentStatus
  });
}
    } catch (recordError) {
      console.error("Could not record approval failure", {
        requestId,
        attemptId,
        errorName: recordError.name
      });
    }


    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Approval requires administrator review",
        requestId
      })
    };
  }
};

