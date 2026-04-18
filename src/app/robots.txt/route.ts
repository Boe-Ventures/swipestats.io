export function GET() {
  const robots = `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /
Allow: /blog
Allow: /blog/*
Allow: /upload
Allow: /research
Allow: /directory
Allow: /how-to-request-your-data
Allow: /contact
Allow: /privacy
Allow: /tos
Disallow: /insights/*
Disallow: /app/*
Disallow: /api/*
Disallow: /share/*
Disallow: /demo
Disallow: /signin
Disallow: /signup
Disallow: /reset-password
Disallow: /verify-email

Sitemap: https://www.swipestats.io/sitemap.xml
Sitemap: https://www.swipestats.io/llms.txt
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
