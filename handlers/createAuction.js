import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { randomUUID } from 'crypto';


const client = new DynamoDBClient({ region: process.env.HOST_REGION })

export const handler = async (event, context) => {
  try {
    const { title } = JSON.parse(event.body)

    if (!title) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      }
    }

    const auctionId = randomUUID()

    const createdAt = new Date().toISOString();
    const endingAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now

    const params = {
      TableName: process.env.AUCTIONS_TABLE,
      Item: marshall({
        id: auctionId,
        title,
        status: 'OPEN',
        createdAt,
        endingAt,
        highestBid: {
          amount: 0,
        },
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
