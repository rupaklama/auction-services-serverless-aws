import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: process.env.HOST_REGION })

export const handler = async (event, context) => {
  try {
    const { id } = event.pathParameters

    const params = {
      TableName: process.env.AUCTIONS_TABLE,
      Key: marshall({ id }),
    }

    const { Item } = await client.send(new GetItemCommand(params))

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Auction not found' }),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ auction: unmarshall(Item) }),
    }
  } catch (error) {
    console.error('Error fetching auction:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }
}
