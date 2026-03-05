BOT_NAME = "crawler"

SPIDER_MODULES = ["spiders"]
NEWSPIDER_MODULE = "spiders"

DOWNLOAD_HANDLERS = {
    "http":  "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
PLAYWRIGHT_BROWSER_TYPE = "chromium"
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
    "args": ["--no-sandbox", "--disable-dev-shm-usage"],
}
PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = 30_000

DOWNLOAD_DELAY = 1
RANDOMIZE_DOWNLOAD_DELAY = True
CONCURRENT_REQUESTS = 1

ITEM_PIPELINES = {
    "pipelines.JsonlPipeline": 300,
}

ROBOTSTXT_OBEY = False
REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
FEED_EXPORT_ENCODING = "utf-8"
LOG_LEVEL = "INFO"
