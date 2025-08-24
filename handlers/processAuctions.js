import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: process.env.HOST_REGION })

export const handler = async () => {
  const now = new Date()

  try {
    if (!process.env.AUCTIONS_TABLE) {
      throw new Error('Environment variable AUCTIONS_TABLE is not set');
    }
    
    const params = {
      TableName: process.env.AUCTIONS_TABLE,
      IndexName: 'StatusEndingAtIndex', // Use the GSI
      KeyConditionExpression: '#status = :status AND #endingAt <= :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#endingAt': 'endingAt',
      },
      ExpressionAttributeValues: marshall({
        ':status': 'OPEN',
        ':now': now.toISOString(),
      }),
    }

    const auctions = await client.send(new QueryCommand(params))

    const updatePromises = auctions.Items.map(async auction => {
      const unmarshalledAuction = unmarshall(auction); // Unmarshall the auction object
      const updateParams = {
        TableName: process.env.AUCTIONS_TABLE,
        Key: marshall({ id: unmarshalledAuction.id }), // Use the unmarshalled id
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: marshall({
          ':status': 'CLOSE',
        }),
      }

      return client.send(new UpdateItemCommand(updateParams))
    })

    await Promise.all(updatePromises)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Auctions processed successfully',
      }),
    }
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to process auctions',
        error: error.message,
      }),
    }
  }
}
