create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id);
create index if not exists customer_favorites_product_idx on public.customer_favorites(product_id);
create index if not exists recently_viewed_product_idx on public.recently_viewed_products(product_id);
create index if not exists product_questions_user_idx on public.product_questions(user_id);
create index if not exists review_reports_user_idx on public.review_reports(user_id);
create index if not exists stock_notifications_product_idx on public.stock_notifications(product_id);
create index if not exists loyalty_transactions_user_idx on public.loyalty_transactions(user_id, created_at desc);
create index if not exists marketing_consent_events_user_idx on public.marketing_consent_events(user_id, created_at desc);
create index if not exists customer_coupons_coupon_idx on public.customer_coupons(coupon_id);
