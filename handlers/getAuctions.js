import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: process.env.HOST_REGION })

export const handler = async (event, context) => {
  const { status } = event.queryStringParameters

  try {
    const params = {
      TableName: process.env.AUCTIONS_TABLE,
      IndexName: 'StatusEndingAtIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': { S: status },
      },
    }

    // Query the DynamoDB table using QueryCommand not ScanCommand
    const { Items } = await client.send(new QueryCommand(params))

    return {
      statusCode: 200,
      body: JSON.stringify({
        auctions: Items.map((item) => unmarshall(item)),
      }),
    }
  } catch (error) {
    console.error('Error fetching auctions:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }
}
