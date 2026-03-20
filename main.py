from audio_process import audio_controller
from obj_indices import bucket_parser, hash_generator
from dotenv import load_dotenv
import os

load_dotenv(".env")

file_name = "audio/haha.wav"
bucket = os.getenv("BUCKET_NAME")
client = os.getenv("CLIENT")
raw_bucket_folder = os.getenv("RAW_BUCKET_FOLDER")
table = os.getenv("TABLE_NAME")
mock_user_id = "user_456"

obj_id = hash_generator.hash_key()
object_name = f"{raw_bucket_folder}/{obj_id}"
transcript_obj = hash_generator.hash_key()

raw_controller = audio_controller.raw_audio(file_name, bucket, client, object_name, content_type='audio/wav')

mapper = bucket_parser.HashTable(
    size=16,
    bucket=bucket,
    key=f"{table}.json"
)
mapper.insert(obj_id, transcript_obj)

raw_controller.pushing_to_bucket()

user_stack = bucket_parser.UserIndex(bucket=bucket, key="user_index.json")
user_stack.push(mock_user_id, obj_id)

res = raw_controller.GetAll_bucket_fileid(f"{raw_bucket_folder}/")
print(res)
print("..................")
print("Hash Table:", mapper.table)
print(f"User Stack ({mock_user_id}):", user_stack.get_stack(mock_user_id))
for k in res:
    print(mapper.get(k))
