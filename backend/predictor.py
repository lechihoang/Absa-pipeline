"""Shared ABSA prediction logic (NER + SA pipeline)."""

from __future__ import annotations

import os
import re
import unicodedata
from pathlib import Path

import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoTokenizer,
)
import py_vncorenlp

MAX_SEQ_LEN = 256


class Predictor:
    def __init__(
        self,
        ner_model_path: str | Path,
        sa_model_path: str | Path,
        vncorenlp_dir: str | Path,
    ):
        self.ner_model_path = Path(ner_model_path)
        self.sa_model_path  = Path(sa_model_path)
        self.vncorenlp_dir  = Path(vncorenlp_dir)
        self.device         = "cuda" if torch.cuda.is_available() else "cpu"

        self.segmenter:     py_vncorenlp.VnCoreNLP | None                 = None
        self.ner_tokenizer: AutoTokenizer | None                           = None
        self.ner_model:     AutoModelForTokenClassification | None         = None
        self.sa_tokenizer:  AutoTokenizer | None                           = None
        self.sa_model:      AutoModelForSequenceClassification | None      = None

    def load(self) -> None:
        print(f"[predictor] device={self.device}")

        os.makedirs(self.vncorenlp_dir, exist_ok=True)
        self.segmenter = py_vncorenlp.VnCoreNLP(
            annotators=["wseg"], save_dir=str(self.vncorenlp_dir)
        )

        self.ner_tokenizer = AutoTokenizer.from_pretrained(self.ner_model_path)
        self.ner_model = (
            AutoModelForTokenClassification.from_pretrained(self.ner_model_path)
            .to(self.device)
            .eval()
        )

        self.sa_tokenizer = AutoTokenizer.from_pretrained(self.sa_model_path)
        self.sa_model = (
            AutoModelForSequenceClassification.from_pretrained(self.sa_model_path)
            .to(self.device)
            .eval()
        )
        print("[predictor] models loaded")

    # ── Preprocessing ──────────────────────────────────────────────────────────

    def clean(self, text: str) -> str:
        chars = [
            c if (unicodedata.category(c)[0] in ("L", "N") or c == " ") else " "
            for c in text
        ]
        return re.sub(r" +", " ", "".join(chars)).strip().lower()

    def seg(self, text: str) -> str:
        segs = self.segmenter.word_segment(self.clean(text))
        return segs[0] if segs else self.clean(text)

    # ── Core predict ───────────────────────────────────────────────────────────

    def predict_ner(self, text: str) -> list[dict]:
        words = text.split()
        if not words:
            return []
        inputs = self.ner_tokenizer(
            words,
            is_split_into_words=True,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_SEQ_LEN,
        ).to(self.device)
        with torch.no_grad():
            logits = self.ner_model(**inputs).logits
        pred_ids   = torch.argmax(logits, dim=2)[0].tolist()
        word_ids   = inputs.word_ids()
        word_preds: dict[int, str] = {}
        for sub_idx, word_id in enumerate(word_ids):
            if word_id is not None and word_id not in word_preds:
                word_preds[word_id] = self.ner_model.config.id2label[pred_ids[sub_idx]]
        return [{"word": words[i], "tag": word_preds.get(i, "O")} for i in range(len(words))]

    def predict_sa(self, text: str) -> str:
        inputs = self.sa_tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_SEQ_LEN,
        ).to(self.device)
        with torch.no_grad():
            logits = self.sa_model(**inputs).logits
        pred_id = torch.argmax(logits, dim=1).item()
        return self.sa_model.config.id2label[pred_id]

    def predict_absa(self, text: str) -> dict:
        """Return {"text", "labels": [[start, end, "ASPECT#SENTIMENT"], ...], "sentiment"}."""
        ner_text   = self.clean(text)
        sa_text    = self.seg(text)
        ner_result = self.predict_ner(ner_text)

        aspects: dict[str, list[str]] = {}
        for item in ner_result:
            tag = item["tag"].split("-")[-1]
            if tag == "O":
                continue
            aspects.setdefault(tag, []).append(item["word"])

        overall = self.predict_sa(sa_text)

        if not aspects:
            return {"text": text, "labels": [], "sentiment": overall}

        labels = []
        for aspect, span_words in aspects.items():
            span  = " ".join(span_words)
            match = re.search(re.escape(span), ner_text)
            if match is None:
                continue
            span_sa   = self.seg(text[match.start():match.end()])
            sentiment = self.predict_sa(f"{span_sa} : {sa_text}")
            labels.append([match.start(), match.end(), f"{aspect}#{sentiment}"])

        return {"text": text, "labels": labels, "sentiment": overall}
