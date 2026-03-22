import os
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv(".env")

_embedding_model: SentenceTransformer | None = None

def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(os.getenv("EMB_MODEL"))
    return _embedding_model