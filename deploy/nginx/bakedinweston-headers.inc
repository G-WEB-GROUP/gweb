# Response headers for every response. Included at server level AND inside each location
# that sets its own add_header (nginx drops inherited add_header in such locations).
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-Frame-Options "SAMEORIGIN" always;
# Empty on production; "noindex, nofollow" on the test server (see $biw_robots map). Empty = header not sent.
add_header X-Robots-Tag $biw_robots always;
