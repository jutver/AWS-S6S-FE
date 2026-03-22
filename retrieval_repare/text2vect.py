from vectors_controller import vectors
from vectors_controller import chunking
import boto3, os
from dotenv import load_dotenv
from botocore.exceptions import ClientError

load_dotenv(".env")

s3                 = boto3.client("s3")
text_bucket_folder = os.getenv("TEXT_BUCKET_FOLDER")
bucket             = os.getenv("BUCKET_NAME")


def get_text(text_id: str) -> str:
    key = f"{text_bucket_folder}/{text_id}.json"
    try:
        resp = s3.get_object(Bucket=bucket, Key=key)
        return resp["Body"].read().decode("utf-8")
    except ClientError as e:
        print("S3 error:", e)
        raise


def vect_push(raw_id: str, text_id: str) -> dict:
    text   = get_text(text_id)
    result = vectors.ingest_document(raw_id, text_id, text)
    return result