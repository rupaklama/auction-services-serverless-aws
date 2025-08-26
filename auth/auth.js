export async function handler(event, context) {
  // Cognito Authorizer automatically validates the token and populates the requestContext with user claims
  const claims = event.requestContext.authorizer.claims;

  if (!claims) {
    throw 'Unauthorized';
  }

  const principalId = claims.sub;

  // Generate an IAM policy
  const policy = generatePolicy(principalId, 'Allow', event.methodArn);

  return {
    ...policy,
    context: claims, // Pass claims as additional context
  };
}

// Helper function to generate an IAM policy
function generatePolicy(principalId, effect, resource) {
  if (!effect || !resource) {
    throw new Error('Effect and resource are required to generate a policy');
  }

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
