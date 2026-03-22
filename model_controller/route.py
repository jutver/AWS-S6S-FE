from enum import Enum
from dataclasses import dataclass
import json, re
from vectors_controller import vectors
from model_controller import model_caller
from vectors_controller import embedding_convert


class QuestionType(str, Enum):
    FACTUAL       = "factual"
    COMPREHENSIVE = "comprehensive"
    SUMMARY       = "summary"
    TOPIC_SUMMARY = "topic_summary"
    DEAD          = "dead"
    OFF_TOPIC     = "off_topic"


class RetrievalStrategy(str, Enum):
    NONE          = "none"
    FAST          = "fast"
    COMPREHENSIVE = "comprehensive"
    SUMMARY       = "summary"
    TOPIC_SUMMARY = "topic_summary"


@dataclass
class ClassifyResult:
    question_type:      QuestionType
    retrieval_strategy: RetrievalStrategy
    confidence:         float
    reason:             str

_SYSTEM_PROMPT = """Bạn là bộ phân loại câu hỏi cho hệ thống RAG phân tích transcript.

NGUYÊN TẮC QUAN TRỌNG: Khi nghi ngờ giữa các loại, ưu tiên theo thứ tự:
comprehensive > topic_summary > fast > summary

[factual → fast]
Hỏi 1 thông tin cụ thể, câu trả lời nằm gọn trong 1-2 câu.
Ví dụ: "lương khởi điểm bao nhiêu", "ai đề xuất tăng lương", "tại sao họp online"

[comprehensive → comprehensive]  
Hỏi nhiều thông tin, cần tổng hợp nhiều đoạn khác nhau.
Dấu hiệu: "kỹ hơn", "chi tiết hơn", "đầy đủ hơn", "cụ thể hơn", "tìm kiếm thêm",
          "liệt kê", "những gì", "các vấn đề", "tất cả", "còn gì nữa không",
          "ngoài ra", "bổ sung", "mở rộng", "giải thích thêm"
Ví dụ: "chi tiết hơn giúp tôi", "tìm kiếm kỹ hơn", "cụ thể hơn về X",
        "liệt kê các vấn đề", "những ai tham gia phát biểu"

[topic_summary → topic_summary]
Hỏi tổng quan về MỘT chủ đề cụ thể, không cần quá chi tiết.
Ví dụ: "phần về lương thế nào", "họ bàn gì về marketing",
        "cụ thể về vấn đề X" (khi X là 1 chủ đề rõ ràng và chưa hỏi trước đó)

[summary → summary]  
CHỈ dùng khi người dùng hỏi tổng quan TOÀN BỘ tài liệu từ đầu, không hỏi tiếp theo câu trước.
Ví dụ: "tóm tắt cuộc họp", "nội dung chính là gì", "overview đi", "kể lại toàn bộ"
KHÔNG dùng khi: câu hỏi là follow-up của câu trước ("chi tiết hơn", "kỹ hơn", "cụ thể hơn")

[dead → none]
Chào hỏi, không liên quan tài liệu. Ví dụ: "xin chào", "cảm ơn", "bạn tên gì"

[off_topic → none]  
Ngoài phạm vi. Ví dụ: "thời tiết hôm nay", "giá vàng"

Trả về JSON hợp lệ, không giải thích thêm:
{
  "question_type": "<factual|comprehensive|topic_summary|summary|dead|off_topic>",
  "retrieval_strategy": "<fast|comprehensive|topic_summary|summary|none>",
  "confidence": <0.0–1.0>,
  "reason": "<1 câu>"
}"""

def classify_question(question: str) -> ClassifyResult:
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user",   "content": question},
    ]
    try:
        resp  = model_caller.get_model_response(messages)
        match = re.search(r'\{.*?\}', resp, re.DOTALL)
        data  = json.loads(match.group())

        result = ClassifyResult(
            question_type      = QuestionType(data["question_type"]),
            retrieval_strategy = RetrievalStrategy(data["retrieval_strategy"]),
            confidence         = float(data["confidence"]),
            reason             = data.get("reason", ""),
        )

        if result.confidence < 0.65 and result.retrieval_strategy == RetrievalStrategy.FAST:
            result.retrieval_strategy = RetrievalStrategy.COMPREHENSIVE
            result.reason += " [upgraded: low confidence]"

        if result.retrieval_strategy == RetrievalStrategy.SUMMARY and result.confidence < 0.80:
            result.retrieval_strategy = RetrievalStrategy.COMPREHENSIVE
            result.reason += " [upgraded: summary low confidence → comprehensive]"

        return result
    except Exception:
        return ClassifyResult(
            question_type      = QuestionType.COMPREHENSIVE,
            retrieval_strategy = RetrievalStrategy.COMPREHENSIVE,
            confidence         = 0.5,
            reason             = "parse error, fallback",
        )

def _find_best_segment(question: str, segments: list[dict]) -> dict | None:
    if not segments:
        return None

    labels = [s["topic_label"] for s in segments]
    q_emb  = embedding_convert.embed_texts([question])[0]
    l_embs = embedding_convert.embed_texts(labels)

    def cosine(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        na  = sum(x**2 for x in a) ** 0.5
        nb  = sum(x**2 for x in b) ** 0.5
        return dot / (na * nb + 1e-9)

    scores   = [cosine(q_emb, le) for le in l_embs]
    best_idx = scores.index(max(scores))
    best_score = scores[best_idx]

    if best_score < 0.30:
        return None

    return segments[best_idx]

def route_and_search(question: str, raw_id, text_id=None) -> dict | None:
    clf = classify_question(question)

    match clf.retrieval_strategy:

        case RetrievalStrategy.NONE:
            return None

        case RetrievalStrategy.SUMMARY:
            data = vectors.get_segments(str(raw_id))
            if data:
                return {"vectors": [{"key": "global-summary", "metadata": {
                    "source_text":  f"[TÓM TẮT TOÀN BỘ]\n{data['global_summary']}",
                    "topic_label":  "global",
                    "segment_idx":  "-1",
                }}]}

            return vectors.search_comprehensive(question, raw_id, text_id)

        
        case RetrievalStrategy.TOPIC_SUMMARY:
            data = vectors.get_segments(str(raw_id))
            if data:
                best = _find_best_segment(question, data["segments"])
                if best:
                    summary_chunk = {
                        "key": f"segment-{best['segment_idx']}-summary",
                        "metadata": {
                            "source_text": f"[TÓM TẮT: {best['topic_label']}]\n{best['summary']}",
                            "topic_label": best["topic_label"],
                            "segment_idx": str(best["segment_idx"]),
                        }
                    }
                    vec_results = vectors.search_with_filter(
                        question, raw_id, text_id,
                        top_k=5,
                        segment_idx=str(best["segment_idx"])
                    )
                    all_vectors = [summary_chunk] + vec_results.get("vectors", [])
                    return {**vec_results, "vectors": all_vectors}

            return vectors.search_comprehensive(question, raw_id, text_id)

        case RetrievalStrategy.FAST:
            return vectors.search_with_filter(
                question, raw_id, text_id
            )

        case RetrievalStrategy.COMPREHENSIVE:
            return vectors.search_comprehensive(question, raw_id, text_id)