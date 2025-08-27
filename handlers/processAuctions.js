import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

// create an SQS client
const sqsClient = new SQSClient({
  region: 'us-east-1',
})

const client = new DynamoDBClient({ region: process.env.HOST_REGION })

export const handler = async () => {
  const queueUrl = process.env.AUCTIONS_SQS_QUEUE_URL
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

      // Update the auction status to CLOSE
      await client.send(new UpdateItemCommand(updateParams));

      // Send message to SQS
      const messageBody = JSON.stringify({
      email: "rupaklamadeveloper@gmail.com",
      subject: "auction closed",
      message: "The auction is closed now!"
      });

      await sqsClient.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
      }));
    });

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
