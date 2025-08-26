import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'

// create an SQS client
const sqsClient = new SQSClient({
  region: 'us-east-1',
})

// create an SNS client
const snsClient = new SNSClient({
  region: 'us-east-1',
})

// serverless invoke local --function sendEmail --data '{"email": "rupaklamadeveloper@gmail.com", "subject": "test", "message": "test sns email"}'

export const handler = async () => {
  const queueUrl = process.env.AUCTIONS_SQS_QUEUE_URL;

  try {
    // Receive messages from the SQS queue
    const receiveParams = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
    }

    const sqsResponse = await sqsClient.send(new ReceiveMessageCommand(receiveParams))

    if (!sqsResponse.Messages || sqsResponse.Messages.length === 0) {
      console.log('No messages to process')
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No messages to process' }),
      }
    }

    const message = sqsResponse.Messages[0]
    const parsedEvent = JSON.parse(message.Body)

    if (!parsedEvent.email || !parsedEvent.subject || !parsedEvent.message) {
      console.error('Invalid message format:', parsedEvent)
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid message format' }),
      }
    }

    const { email, subject, message: emailMessage } = parsedEvent

    const snsParams = {
      Message: emailMessage,
      Subject: subject,
      TopicArn: process.env.AUCTIONS_SNS_TOPIC_ARN,
      MessageAttributes: {
        email: {
          DataType: 'String',
          StringValue: email,
        },
      },
    }

    await snsClient.send(new PublishCommand(snsParams))

    // Delete the message from the SQS queue after processing
    const deleteParams = {
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle,
    }
    await sqsClient.send(new DeleteMessageCommand(deleteParams))

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' }),
    }
  } catch (error) {
    console.error('Error processing message:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }
}
