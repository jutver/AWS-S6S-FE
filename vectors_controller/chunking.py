import re
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
from .model_registry import get_embedding_model
import os

load_dotenv(".env")

def _split_sentences(text: str, min_chars: int = 60) -> list[str]:
    raw = re.split(r'(?<=[.!?])\s+|(?<=\n)', text.strip())
    sentences = []
    buffer = ""
    for s in raw:
        s = s.strip()
        if not s:
            continue
        buffer = (buffer + " " + s).strip() if buffer else s
        if len(buffer) >= min_chars:
            sentences.append(buffer)
            buffer = ""
    if buffer:
        if sentences:
            sentences[-1] += " " + buffer
        else:
            sentences.append(buffer)
    return sentences


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def segment_topics(
    text: str,
    window: int = 3,          # số câu mỗi bên để smooth
    percentile: int = 25,     # ngưỡng cắt: bottom 25% similarity = boundary
    min_segment_chars: int = 600,
) -> list[str]:
    
    _model = get_embedding_model() 
    sentences = _split_sentences(text)
    if len(sentences) < 2 * window + 2:
        return [text]

    embeddings = _model.encode(sentences, normalize_embeddings=True, batch_size=64)

    scores = []
    for i in range(window, len(sentences) - window):
        left  = embeddings[i - window:i].mean(axis=0)
        right = embeddings[i:i + window].mean(axis=0)
        scores.append((i, _cosine_sim(left, right)))

    if not scores:
        return [text]

    sim_values = [s for _, s in scores]
    threshold  = float(np.percentile(sim_values, percentile))

    boundaries = []
    for i in range(1, len(scores) - 1):
        idx, score = scores[i]
        prev_score = scores[i - 1][1]
        next_score = scores[i + 1][1]
        if score <= threshold and score <= prev_score and score <= next_score:
            boundaries.append(idx)

    cut_points = [0] + boundaries + [len(sentences)]
    raw_segments = [
        " ".join(sentences[cut_points[i]:cut_points[i + 1]])
        for i in range(len(cut_points) - 1)
    ]

    merged = []
    for seg in raw_segments:
        if merged and len(seg) < min_segment_chars:
            merged[-1] += " " + seg
        else:
            merged.append(seg)

    return [s.strip() for s in merged if s.strip()]


def split_chunks(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=80,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    return splitter.split_text(text)