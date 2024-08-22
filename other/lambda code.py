import boto3
import json
import uuid


def lambda_handler(event, context):
    # Log the received event to debug incoming data
    print("Received event:", json.dumps(event))

    try:
        # Initialize the Rekognition client in the correct region
        rekognition = boto3.client("rekognition", region_name="us-west-2")

        # Initialize the DynamoDB resource
        dynamodb = boto3.resource("dynamodb", region_name="us-west-2")
        table = dynamodb.Table("ImageTextDetections")

        # Extract bucket name and object key from the event
        bucket = event["Records"][0]["s3"]["bucket"]["name"]
        key = event["Records"][0]["s3"]["object"]["key"]

        # Log the bucket and key to verify they are correct
        print(f"Processing file: {key} in bucket: {bucket}")

        # Call Rekognition to detect text in the image
        response = rekognition.detect_text(
            Image={"S3Object": {"Bucket": bucket, "Name": key}}
        )

        # Log the Rekognition response
        print("Rekognition response:", json.dumps(response))

        # Extract and log the detected text
        text_detections = response["TextDetections"]
        detected_texts = [text["DetectedText"] for text in text_detections]
        print("Detected text:", detected_texts)

        # Save the detected text to DynamoDB
        detection_id = str(uuid.uuid4())
        table.put_item(
            Item={
                "DetectionId": detection_id,  # Primary key
                "S3Bucket": bucket,
                "S3Key": key,
                "DetectedTexts": detected_texts,
            }
        )
        print(
            f"Successfully saved detection result to DynamoDB with DetectionId: {detection_id}"
        )

        # Return the detected text
        return {"DetectionId": detection_id, "DetectedTexts": detected_texts}

    except Exception as e:
        # Log any exceptions that occur
        print("Error processing image:", e)
        raise
