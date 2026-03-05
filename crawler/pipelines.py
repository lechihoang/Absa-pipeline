import json
import os


class JsonlPipeline:
    def open_spider(self, spider=None):
        out = os.path.join("..", "data", "crawled", "cellphones.jsonl")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        self.file = open(out, "w", encoding="utf-8")

    def close_spider(self, spider=None):
        self.file.close()

    def process_item(self, item, spider=None):
        self.file.write(json.dumps(dict(item), ensure_ascii=False) + "\n")
        return item
