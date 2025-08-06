import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export const handler = async (event, context) => {
  try {
    const { title, startingBid, endTime } = JSON.parse(event.body)

    if (!title || !startingBid || !endTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      }
    }

    const auctionId = `auction-${Date.now()}`

    const params = {
      TableName: 'Auctions',
      Item: marshall({
        auctionId,
        title,
        startingBid,
        endTime,
        createdAt: new Date().toISOString(),
      }),
    }

    await client.send(new PutItemCommand(params))

    return {
      statusCode: 201,
      body: JSON.stringify({ auctionId, message: 'Auction created successfully' }),
    }
  } catch (error) {
    console.error('Error creating auction:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }

  // return {
  //   statusCode: 200,
  //   body: JSON.stringify({ event, context }),
  // }
}
