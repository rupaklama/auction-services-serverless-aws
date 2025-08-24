import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: process.env.HOST_REGION })

export const handler = async (event, context) => {
  try {
    const { id } = event.pathParameters
    const { amount } = JSON.parse(event.body)

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid bid amount' }),
      }
    }

    const params = {
      TableName: process.env.AUCTIONS_TABLE,
      Key: marshall({ id }),
      // sets the `highestBid.amount` attribute to a new value (`:amount`)
      UpdateExpression: 'SET highestBid.amount = :amount',
      
      // This ensures that the update only occurs if certain conditions are met. Here, the update will proceed if the `highestBid` attribute does not exist (`attribute_not_exists(highestBid)`) or if the current `highestBid.amount` is less than the new bid amount (`:amount`)
      ConditionExpression: 'attribute_not_exists(highestBid) OR highestBid.amount < :amount',

      // The `ExpressionAttributeValues` maps the placeholder `:amount` to the actual bid amount
      ExpressionAttributeValues: marshall({
        ':amount': amount,
      }),

      // This returns the updated item after the update operation
      // `ALL_NEW` means that the entire updated item will be returned
      ReturnValues: 'ALL_NEW',
    }

    const { Attributes } = await client.send(new UpdateItemCommand(params))

    return {
      statusCode: 200,
      body: JSON.stringify({ auction: unmarshall(Attributes) }),
    }
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.error('Bid rejected:', error)
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Bid amount must be higher than the current highest bid' }),
      }
    }

    console.error('Error placing bid:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }
}
