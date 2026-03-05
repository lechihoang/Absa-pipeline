import scrapy


class ReviewItem(scrapy.Item):
    product_slug   = scrapy.Field()
    product_name   = scrapy.Field()
    product_id     = scrapy.Field()
    review_id      = scrapy.Field()
    content        = scrapy.Field()
    rating_id      = scrapy.Field()
    is_purchased   = scrapy.Field()
    customer_name  = scrapy.Field()
    created_at     = scrapy.Field()
    attributes     = scrapy.Field()
    photos         = scrapy.Field()
