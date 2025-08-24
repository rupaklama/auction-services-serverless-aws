import jwt from 'jsonwebtoken'

// By default, API Gateway authorizations are cached (TTL) for 300 seconds.
// This policy will allow to execute any other lambdas on the same APIGateway after token verification, thus being efficient and optimizing costs.
const generatePolicy = (principalId, methodArn) => {
  const apiGatewayWildcard = methodArn.split('/', 2).join('/') + '/*'

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: apiGatewayWildcard,
        },
      ],
    },
  }
}

export async function handler(event, context) {
  if (!event.authorizationToken) {
    throw 'Unauthorized'
  }

  const token = event.authorizationToken.replace('Bearer ', '')

  try {
    const claims = jwt.verify(token, process.env.AUTH0_PUBLIC_KEY)
    const policy = generatePolicy(claims.sub, event.methodArn)

    return {
      ...policy,
      // context is used to pass additional information to the Lambda function
      context: claims,
    }
  } catch (error) {
    console.log(error)
    throw 'Unauthorized'
  }
}
