"""Batch inference: data/crawled/cellphones.jsonl → data/inferenced/cellphones.jsonl"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from tqdm import tqdm

from backend.predictor import Predictor

ROOT        = Path(__file__).parent.parent
INPUT_FILE  = ROOT / "data/crawled/cellphones.jsonl"
OUTPUT_FILE = ROOT / "data/inferenced/cellphones.jsonl"

predictor = Predictor(
    ner_model_path=ROOT / "models/NER",
    sa_model_path=ROOT  / "models/SA",
    vncorenlp_dir=ROOT  / "models/vncorenlp",
)


def main():
    predictor.load()

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    total = sum(1 for _ in open(INPUT_FILE, encoding="utf-8"))
    print(f"\nProcessing {total} reviews from {INPUT_FILE}")

    skipped = written = 0

    with (
        open(INPUT_FILE, encoding="utf-8") as fin,
        open(OUTPUT_FILE, "w", encoding="utf-8") as fout,
    ):
        for line in tqdm(fin, total=total, desc="Inferencing"):
            review  = json.loads(line)
            content = (review.get("content") or "").strip()

            if not content:
                skipped += 1
                continue

            try:
                result = predictor.predict_absa(content)
            except Exception as exc:
                tqdm.write(f"[WARN] review_id={review.get('review_id')} error: {exc}")
                skipped += 1
                continue

            out = {
                "product_slug":  review.get("product_slug", ""),
                "product_name":  review.get("product_name", ""),
                "product_id":    review.get("product_id"),
                "review_id":     review.get("review_id"),
                "content":       content,
                "rating_id":     review.get("rating_id"),
                "customer_name": review.get("customer_name", ""),
                "created_at":    review.get("created_at", ""),
                "sentiment":     result["sentiment"],
                "labels":        result["labels"],
            }
            fout.write(json.dumps(out, ensure_ascii=False) + "\n")
            written += 1

    print(f"\nDone. Written: {written}, Skipped: {skipped}")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
