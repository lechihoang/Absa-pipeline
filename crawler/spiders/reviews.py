"""
CellphoneS reviews spider
=========================
Crawl sản phẩm điện thoại từ cellphones.com.vn và thu thập reviews.

Tham số:
  -s MAX_PRODUCTS=50   số sản phẩm crawl tối đa  (mặc định: không giới hạn)
  -s MAX_REVIEWS=100   số review tối đa mỗi sản phẩm (mặc định: không giới hạn)

Ví dụ:
  scrapy crawl cellphones_reviews -s MAX_PRODUCTS=10 -s MAX_REVIEWS=50
"""

import json
import re
from urllib.parse import urljoin

import scrapy
from scrapy_playwright.page import PageMethod

from items import ReviewItem

LISTING_URL = "https://cellphones.com.vn/mobile.html"
REVIEW_API  = "https://api.cellphones.com.vn/graphql-customer/graphql/query"
REVIEWS_GQL = (
    "query{{"
    "  reviews(filter:{{product_id:{product_id}}},page:{page}){{"
    "    total"
    "    matches{{"
    "      id content rating_id is_purchased created_at photos"
    "      attributes{{attribute_name label}}"
    "      customer{{id fullname}}"
    "    }}"
    "  }}"
    "}}"
)

GQL_HEADERS = {
    "Accept":       "application/json",
    "Content-Type": "application/json",
    "Origin":       "https://cellphones.com.vn",
    "Referer":      "https://cellphones.com.vn/",
}

_SKIP_RE    = re.compile(
    r"cellphones\.com\.vn/"
    r"(?:mobile|tablet|laptop|tivi|phu-kien|may-in|man-hinh|may-tinh|"
    r"dien-may|hang-cu|nha-thong|do-choi|do-gia-dung|thiet-bi|camera)"
)
_PRODUCT_RE = re.compile(r"cellphones\.com\.vn/[\w-]+\.html$")


class CellphonesReviewsSpider(scrapy.Spider):
    name = "cellphones_reviews"

    # ------------------------------------------------------------------ #
    #  BƯỚC 1: Listing page — Playwright, click "Xem thêm" cho đủ hàng   #
    # ------------------------------------------------------------------ #
    async def start(self):
        yield scrapy.Request(
            LISTING_URL,
            callback=self.parse_listing,
            meta={
                "playwright": True,
                "playwright_include_page": True,
                "playwright_page_methods": [
                    PageMethod("wait_for_selector", "a.product__link", timeout=30_000),
                ],
            },
        )

    async def parse_listing(self, response):
        page     = response.meta["playwright_page"]
        max_prod = int(self.settings.get("MAX_PRODUCTS") or 0)

        try:
            await self._click_all_load_more(page, max_prod)
            content = await page.content()
        finally:
            await page.close()

        seen  = set()
        count = 0
        for href in scrapy.Selector(text=content).css("a.product__link::attr(href)").getall():
            url = href if href.startswith("http") else urljoin(LISTING_URL, href)
            if url in seen or not _PRODUCT_RE.search(url) or _SKIP_RE.search(url):
                continue
            seen.add(url)

            if max_prod and count >= max_prod:
                break
            count += 1

            slug = re.sub(r"\.html$", "", url.rstrip("/").split("/")[-1])
            yield scrapy.Request(
                re.sub(r"\.html$", "", url.rstrip("/")) + "/review",
                callback=self.parse_review_page,
                errback=self.handle_error,
                meta={
                    "playwright": True,
                    "playwright_include_page": True,
                    "playwright_page_methods": [
                        PageMethod("wait_for_selector",
                                   ".boxReview-review, .boxReview-comment",
                                   state="attached", timeout=25_000),
                    ],
                    "slug": slug,
                },
            )

    async def _click_all_load_more(self, page, max_prod: int):
        """Click 'Xem thêm sản phẩm' trên listing cho đến khi đủ hoặc hết."""
        BTN = "button.btn-show-more, a.btn-show-more, [class*='show-more']:not([class*='review'])"
        while True:
            if max_prod:
                count = await page.eval_on_selector_all("a.product__link", "els => els.length")
                if count >= max_prod:
                    break
            try:
                btn = await page.wait_for_selector(BTN, timeout=3_000, state="visible")
                if not btn:
                    break
                await btn.scroll_into_view_if_needed()
                await btn.click()
                await page.wait_for_timeout(1_500)
            except Exception:
                break

    # ------------------------------------------------------------------ #
    #  BƯỚC 2: Review page — intercept GraphQL để lấy product_id thật    #
    # ------------------------------------------------------------------ #
    async def parse_review_page(self, response):
        page        = response.meta["playwright_page"]
        slug        = response.meta["slug"]
        max_reviews = int(self.settings.get("MAX_REVIEWS") or 0)
        product_name = response.css("h1::text").get("").strip()

        try:
            product_id = await self._intercept_product_id(page)
        finally:
            await page.close()

        if not product_id:
            self.logger.warning(f"[{slug}] Không lấy được product_id, bỏ qua.")
            return

        self.logger.info(f"[{slug}] product_id={product_id}  name='{product_name}'")
        yield self._review_request(slug, product_name, product_id, page=1, fetched=0,
                                   max_reviews=max_reviews)

    async def _intercept_product_id(self, page) -> int | None:
        """Intercept POST GraphQL khi click 'Xem thêm đánh giá' để lấy product_id."""
        captured = {}

        def on_request(request):
            if "graphql-customer" not in request.url or request.method != "POST":
                return
            try:
                body = request.post_data or ""
                if "reviews" in body:
                    m = re.search(r"product_id\s*:\s*(\d+)", body)
                    if m:
                        captured["product_id"] = int(m.group(1))
            except Exception:
                pass

        page.on("request", on_request)
        try:
            btn = await page.wait_for_selector(
                "a.load-more, .button__view-more-review, "
                "[class*='view-more-review'], [class*='load-more']",
                timeout=6_000, state="visible",
            )
            if btn:
                await btn.scroll_into_view_if_needed()
                await btn.click()
                await page.wait_for_timeout(2_500)
        except Exception:
            pass
        finally:
            page.remove_listener("request", on_request)

        return captured.get("product_id")

    def handle_error(self, failure):
        self.logger.warning(f"Request failed: {failure.request.url} — {failure.value}")

    # ------------------------------------------------------------------ #
    #  BƯỚC 3: Paginate reviews qua HTTP thuần (không cần browser)        #
    # ------------------------------------------------------------------ #
    def _review_request(self, slug, product_name, product_id, page, fetched, max_reviews):
        return scrapy.Request(
            REVIEW_API,
            method="POST",
            headers=GQL_HEADERS,
            body=json.dumps({
                "query":     REVIEWS_GQL.format(product_id=product_id, page=page),
                "variables": {},
            }),
            callback=self.parse_reviews,
            errback=self.handle_error,
            meta=dict(slug=slug, product_name=product_name, product_id=product_id,
                      page=page, fetched=fetched, max_reviews=max_reviews),
            dont_filter=True,
        )

    def parse_reviews(self, response):
        reviews_data = (response.json().get("data") or {}).get("reviews") or {}
        total        = reviews_data.get("total") or 0
        matches      = reviews_data.get("matches") or []

        slug         = response.meta["slug"]
        product_name = response.meta["product_name"]
        product_id   = response.meta["product_id"]
        page         = response.meta["page"]
        fetched      = response.meta["fetched"]
        max_reviews  = response.meta["max_reviews"]

        if not matches:
            self.logger.info(f"[{slug}] Hết review trang {page} (total={total})")
            return

        for r in matches:
            if max_reviews and fetched >= max_reviews:
                return
            yield ReviewItem(
                product_slug  = slug,
                product_name  = product_name,
                product_id    = product_id,
                review_id     = r.get("id"),
                content       = (r.get("content") or "").strip(),
                rating_id     = r.get("rating_id"),
                is_purchased  = r.get("is_purchased", False),
                customer_name = ((r.get("customer") or {}).get("fullname") or ""),
                created_at    = r.get("created_at", ""),
                attributes    = r.get("attributes") or [],
                photos        = r.get("photos") or [],
            )
            fetched += 1

        if max_reviews and fetched >= max_reviews:
            self.logger.info(f"[{slug}] Đủ {fetched} reviews")
            return
        if fetched >= total:
            self.logger.info(f"[{slug}] Crawl xong {fetched}/{total} reviews")
            return

        yield self._review_request(slug, product_name, product_id,
                                   page=page + 1, fetched=fetched, max_reviews=max_reviews)
