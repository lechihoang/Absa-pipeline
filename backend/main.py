"""FastAPI backend for ABSA Sentiment Analysis demo."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.predictor import Predictor

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT          = Path(__file__).parent.parent   # Sentiment-analysis/
INFERRED_FILE = ROOT / "data/inferenced/cellphones.jsonl"
FRONTEND_DIST = ROOT / "frontend/dist"

# ── Global state ──────────────────────────────────────────────────────────────
predictor = Predictor(
    ner_model_path=ROOT / "models/NER",
    sa_model_path=ROOT  / "models/SA",
    vncorenlp_dir=ROOT  / "models/vncorenlp",
)
reviews: list[dict] = []


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    predictor.load()

    if INFERRED_FILE.exists():
        with open(INFERRED_FILE, encoding="utf-8") as f:
            for line in f:
                reviews.append(json.loads(line))
        print(f"[startup] loaded {len(reviews)} inferred reviews")
    else:
        print(f"[startup] WARNING: {INFERRED_FILE} not found — run script/inference.py first")

    yield
    reviews.clear()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="ABSA Demo", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/reviews")
def getreviews(
    product:   Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None, description="POSITIVE|NEGATIVE|NEUTRAL"),
    aspect:    Optional[str] = Query(None, description="e.g. BATTERY, CAMERA"),
    page:      int           = Query(1, ge=1),
    size:      int           = Query(20, ge=1, le=100),
):
    filtered = reviews
    if product:
        filtered = [r for r in filtered if r.get("product_slug") == product]
    if sentiment:
        filtered = [r for r in filtered if r.get("sentiment") == sentiment.upper()]
    if aspect:
        a = aspect.upper()
        filtered = [r for r in filtered if any(a in lbl[2] for lbl in r.get("labels", []))]
    total = len(filtered)
    start = (page - 1) * size
    return {"total": total, "page": page, "size": size, "items": filtered[start: start + size]}


@app.get("/api/products")
def get_products():
    products: dict[str, dict] = {}
    for r in reviews:
        slug = r.get("product_slug", "unknown")
        if slug not in products:
            products[slug] = {
                "product_slug":   slug,
                "product_name":   r.get("product_name", ""),
                "product_id":     r.get("product_id"),
                "review_count":   0,
                "sentiment_dist": Counter(),
                "_ratings":       [],
            }
        p = products[slug]
        p["review_count"] += 1
        p["sentiment_dist"][r.get("sentiment", "NEUTRAL")] += 1
        if r.get("rating_id"):
            p["_ratings"].append(r["rating_id"])

    result = []
    for p in products.values():
        ratings = p.pop("_ratings")
        p["avg_rating"]     = round(sum(ratings) / len(ratings), 2) if ratings else None
        p["sentiment_dist"] = dict(p["sentiment_dist"])
        result.append(p)
    result.sort(key=lambda x: x["review_count"], reverse=True)
    return result


@app.get("/api/stats")
def get_stats():
    if not reviews:
        return {"totalreviews": 0}

    sentiment_dist    = Counter(r.get("sentiment") for r in reviews)
    aspect_sentiment: dict[str, Counter] = defaultdict(Counter)
    for r in reviews:
        for lbl in r.get("labels", []):
            parts = lbl[2].split("#")
            if len(parts) == 2:
                aspect_sentiment[parts[0]][parts[1]] += 1

    aspect_counts = {a: sum(c.values()) for a, c in aspect_sentiment.items()}
    top_aspects   = sorted(aspect_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "totalreviews":    len(reviews),
        "sentiment_dist":   dict(sentiment_dist),
        "aspect_sentiment": {a: dict(c) for a, c in aspect_sentiment.items()},
        "top_aspects":      [{"aspect": a, "count": c} for a, c in top_aspects],
    }


class PredictRequest(BaseModel):
    text: str


@app.post("/api/predict")
def api_predict(req: PredictRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    return predictor.predict_absa(req.text)


# ── Serve React SPA ───────────────────────────────────────────────────────────

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
