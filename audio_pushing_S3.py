import boto3
import logging
from botocore.exceptions import ClientError

def upload_audio_to_s3(file_name, bucket, object_name=None, content_type='audio/mpeg'):
    """
    Upload an audio file to an S3 bucket
    
    :param file_name: File to upload (local path)
    :param bucket: Bucket to upload to
    :param object_name: S3 object name. If not specified then file_name is used
    :param content_type: The MIME type of the audio file (e.g., 'audio/mpeg', 'audio/wav')
    :return: True if file was uploaded, else False
    """
    # If S3 object_name was not specified, use file_name
    if object_name is None:
        object_name = file_name

    # Initialize the S3 client
    s3_client = boto3.client('s3')

    try:
        # ExtraArgs allows you to set metadata like ContentType
        # This is useful so browsers play the audio instead of downloading it
        s3_client.upload_file(
            file_name, 
            bucket, 
            object_name,
            ExtraArgs={'ContentType': content_type}
        )
        print(f"Successfully uploaded {file_name} to {bucket}/{object_name}")
    except ClientError as e:
        logging.error(e)
        return False
        
    return True

# --- Example Usage ---
if __name__ == '__main__':
    # Define your variables
    LOCAL_FILE_PATH = 'audio/meeting.wav'
    DESTINATION_BUCKET = 'motminhtao-s3'
    S3_FILE_NAME = 'audio/meeting.wav' # You can use prefixes (folders) like 'audio/'
    
    # Run the function
    upload_audio_to_s3(
        file_name=LOCAL_FILE_PATH, 
        bucket=DESTINATION_BUCKET, 
        object_name=S3_FILE_NAME,
        content_type='audio/mpeg' # Change to 'audio/wav' if uploading a WAV file
    )