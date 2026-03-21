from dotenv import load_dotenv
import os
from vectors_controller import vectors
from retrieval_repare import audio2text, text2vect
from obj_indices import bucket_parser
import time

load_dotenv(".env")

file_name = "meeting.wav"

bucket = os.getenv("BUCKET_NAME")
client = os.getenv("CLIENT")
raw_bucket_folder = os.getenv("RAW_BUCKET_FOLDER")
table = os.getenv("TABLE_NAME")
mock_user_id = "user_456"



if __name__ == "__main__":
    meta = audio2text.voice_transcript(file_name, bucket, client, raw_bucket_folder, table)
    raw_id = meta["raw_id"]
    text_id = meta["text_id"]
    time.sleep(100)
    text2vect.vect_push(raw_id= raw_id, text_id= text_id)
    query = vectors.search_with_filter("Thư ký cần làm gì?", raw_id, text_id)
    print(vectors.pretty_results(query))



#Phần này để mai t gói vào 1 hàm khác nha.

    # raw_controller = audio_controller.raw_audio(file_name, bucket, client, object_name, content_type='audio/wav')

    # mapper = bucket_parser.HashTable(
    #     size=16,
    #     bucket=bucket,
    #     key=f"{table}.json"
    # )
    # mapper.insert(obj_id, transcript_obj)

    # raw_controller.pushing_to_bucket()

    # user_stack = bucket_parser.UserIndex(bucket=bucket, key="user_index.json")
    # user_stack.push(mock_user_id, obj_id)

    # res = raw_controller.GetAll_bucket_fileid(f"{raw_bucket_folder}/")
    # print(res)
    # print("..................")
    # print("Hash Table:", mapper.table)
    # print(f"User Stack ({mock_user_id}):", user_stack.get_stack(mock_user_id))
    # for k in res:
    #     print(mapper.get(k))