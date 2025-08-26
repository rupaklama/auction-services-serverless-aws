import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

// create an SNS client
const snsClient = new SNSClient({
  region: 'us-east-1',
})

export const handler = async (event) => {
  console.log('Received event:', event)

  try {
    const parsedEvent = typeof event === 'string' ? JSON.parse(event) : event;

    if (!parsedEvent.email || !parsedEvent.subject || !parsedEvent.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is missing or invalid' }),
      }
    }

    const { email, subject, message } = parsedEvent;

    if (!email || !subject || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      }
    }

    const params = {
      Message: message,
      Subject: subject,
      TopicArn: process.env.AUCTIONS_SNS_TOPIC_ARN,
      MessageAttributes: {
        email: {
          DataType: 'String',
          StringValue: email,
        },
      },
    }

    await snsClient.send(new PublishCommand(params))

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' }),
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    }
  }
}
