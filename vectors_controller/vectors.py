import boto3
import json
import re
from dotenv import load_dotenv
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from . import chunking, embedding_convert
from model_controller import model_caller

load_dotenv(".env")

VECTOR_BUCKET    = os.getenv("VECTOR_BUCKET")
INDEX_NAME       = os.getenv("INDEX_NAME")
REGION           = os.getenv("REGION")
SEGMENTS_PREFIX  = os.getenv("SEGMENTS_PREFIX")
BUCKET_NAME =  os.getenv("BUCKET_NAME")

s3vectors  = boto3.client("s3vectors", region_name=REGION)
s3         = boto3.client("s3",        region_name=REGION)

def _label_and_summarize_segment(seg_text: str, seg_idx: int) -> dict:

    messages = [
        {"role": "system", "content":
            "Phân tích đoạn transcript sau. "
            "Trả về JSON hợp lệ với đúng 2 trường: "
            '"topic_label": tên chủ đề ngắn tối đa 5 từ, '
            '"summary": tóm tắt 2-3 câu nội dung chính. '
            "Chỉ trả JSON, không thêm bất kỳ text nào khác."},
        {"role": "user", "content": seg_text[:3000]}
    ]

    try:
        raw = model_caller.get_model_response(messages)
        match = re.search(r'\{.*?\}', raw, re.DOTALL)
        data = json.loads(match.group())
        return {
            "segment_idx":  seg_idx,
            "topic_label":  data.get("topic_label", f"Phần {seg_idx + 1}"),
            "summary":      data.get("summary", ""),
            "text":         seg_text,
        }
    except Exception as e:
        print(f"[WARN] segment {seg_idx} summarize failed: {e}")
        return {
            "segment_idx":  seg_idx,
            "topic_label":  f"Phần {seg_idx + 1}",
            "summary":      seg_text[:300],
            "text":         seg_text,
        }

def _build_global_summary(segment_data: list[dict]) -> str:


    combined = "\n".join(
        f"[{s['topic_label']}]: {s['summary']}"
        for s in segment_data
    )
    messages = [
        {"role": "system", "content":
            "Bạn nhận danh sách tóm tắt từng phần của một cuộc họp. "
            "Hãy tổng hợp thành 1 bản tóm tắt hoàn chỉnh gồm: "
            "1) Bối cảnh và mục đích, 2) Các vấn đề được thảo luận, "
            "3) Quyết định và kết luận. Viết bằng tiếng Việt, súc tích."},
        {"role": "user", "content": combined}
    ]
    try:
        return model_caller.get_model_response(messages)
    except Exception as e:
        print(f"[WARN] global summary failed: {e}")
        return combined  # fallback: ghép các mini-summary lại


def ingest_document(raw_id: str, text_id: str, text: str) -> dict:
    raw_id  = str(raw_id)
    text_id = str(text_id)

    segments = chunking.segment_topics(text)
    print(f"[INFO] {len(segments)} segments detected")

    segment_data = [None] * len(segments)
    with ThreadPoolExecutor(max_workers=5) as pool:
        future_map = {
            pool.submit(_label_and_summarize_segment, seg, i): i
            for i, seg in enumerate(segments)
        }
        for future in as_completed(future_map):
            idx = future_map[future]
            segment_data[idx] = future.result()

    global_summary = _build_global_summary(segment_data)

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=f"{SEGMENTS_PREFIX}/{raw_id}.json",
        Body=json.dumps({
            "raw_id":         raw_id,
            "global_summary": global_summary,
            "segments": [
                {
                    "segment_idx": s["segment_idx"],
                    "topic_label": s["topic_label"],
                    "summary":     s["summary"],
                }
                for s in segment_data
            ]
        }, ensure_ascii=False),
        ContentType="application/json"
    )

    batch = []
    total = 0

    for seg in segment_data:
        chunks     = chunking.split_chunks(seg["text"])
        embeddings = embedding_convert.embed_texts(chunks)

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            batch.append({
                "key": f"{raw_id}-s{seg['segment_idx']}-c{i}",
                "data": {"float32": [float(x) for x in emb]},
                "metadata": {
                    "raw_id":       raw_id,
                    "text_id":      text_id,
                    "topic_label":  seg["topic_label"],
                    "segment_idx":  str(seg["segment_idx"]),
                    "source_text":  chunk,
                }
            })

            if len(batch) == 500:
                s3vectors.put_vectors(
                    vectorBucketName=VECTOR_BUCKET,
                    indexName=INDEX_NAME,
                    vectors=batch
                )
                total += len(batch)
                batch = []

    if batch:
        s3vectors.put_vectors(
            vectorBucketName=VECTOR_BUCKET,
            indexName=INDEX_NAME,
            vectors=batch
        )
        total += len(batch)

    print(f"[INFO] Inserted {total} vectors across {len(segments)} segments")
    return {"segments": len(segments), "inserted_vectors": total}

def get_segments(raw_id: str) -> dict | None:
    try:
        resp = s3.get_object(
            Bucket=BUCKET_NAME,
            Key=f"{SEGMENTS_PREFIX}/{raw_id}.json"
        )
        return json.loads(resp["Body"].read().decode("utf-8"))
    except Exception:
        return None

def search_with_filter(
    question: str,
    raw_id:   str,
    text_id:  str | None = None,
    top_k:    int = 10,
    segment_idx: str | None = None,
) -> dict:
    raw_id  = str(raw_id)
    filters = [{"raw_id": {"$eq": raw_id}}]

    if text_id is not None:
        filters.append({"text_id": {"$eq": str(text_id)}})

    # Filter theo segment nếu có — giảm search space đáng kể
    if segment_idx is not None:
        filters.append({"segment_idx": {"$eq": str(segment_idx)}})

    query_vec = embedding_convert.embed_texts([question])[0]
    return s3vectors.query_vectors(
        vectorBucketName=VECTOR_BUCKET,
        indexName=INDEX_NAME,
        queryVector={"float32": query_vec},
        topK=top_k,
        returnDistance=True,
        returnMetadata=True,
        filter={"$and": filters},
    )

def search_comprehensive(
    question: str,
    raw_id:   str,
    text_id:  str | None = None,
    top_k:    int = 80,
    final_k:  int = 30,
    distance_threshold: float = 0.7,
) -> dict:
    
    raw_id  = str(raw_id)
    filters = [{"raw_id": {"$eq": raw_id}}]
    if text_id is not None:
        filters.append({"text_id": {"$eq": str(text_id)}})

    hyde_prompt = f"Hãy viết một đoạn văn ngắn trả lời câu hỏi sau:\n{question}"
    vecs        = embedding_convert.embed_texts([question, hyde_prompt])
    query_vec, hyde_vec = vecs[0], vecs[1]

    def _query(vec):
        return s3vectors.query_vectors(
            vectorBucketName=VECTOR_BUCKET,
            indexName=INDEX_NAME,
            queryVector={"float32": vec},
            topK=top_k,
            returnDistance=True,
            returnMetadata=True,
            filter={"$and": filters},
        )

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=2) as pool:
        f1, f2 = pool.submit(_query, query_vec), pool.submit(_query, hyde_vec)
        raw1, raw2 = f1.result(), f2.result()

    K      = 60
    scores: dict[str, float] = {}
    items:  dict[str, dict]  = {}

    for rank, item in enumerate(raw1.get("vectors", [])):
        cid = item.get("key") or item.get("id")
        scores[cid] = scores.get(cid, 0) + 1 / (K + rank)
        items[cid]  = item

    for rank, item in enumerate(raw2.get("vectors", [])):
        cid = item.get("key") or item.get("id")
        scores[cid] = scores.get(cid, 0) + 1 / (K + rank)
        items.setdefault(cid, item)

    ranked = [
        items[cid]
        for cid, _ in sorted(scores.items(), key=lambda x: -x[1])
        if items[cid].get("distance", 1.0) <= distance_threshold
    ][:final_k]

    return {**raw1, "vectors": ranked}

def search_no_filter(question: str, top_k: int = 3):
    query_vec = embedding_convert.embed_texts([question])[0]
    return s3vectors.query_vectors(
        vectorBucketName=VECTOR_BUCKET,
        indexName=INDEX_NAME,
        queryVector={"float32": query_vec},
        topK=top_k,
        returnDistance=True,
        returnMetadata=True,
    )

def pretty_results(resp):
    if not resp.get("vectors"):
        return "Không tìm thấy kết quả phù hợp."
    lines = []
    for i, v in enumerate(resp["vectors"], 1):
        meta = v.get("metadata", {})
        lines.append(
            f"{i}. [{meta.get('topic_label', '?')}] "
            f"key={v.get('key')} | dist={v.get('distance')}\n"
            f"   {meta.get('source_text', '')}\n"
        )
    return "\n".join(lines)