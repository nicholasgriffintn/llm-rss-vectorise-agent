-- Add notes support for items
ALTER TABLE "item"
ADD COLUMN "notes" TEXT NULL;

-- Add configurable RSS feed sources
CREATE TABLE "rss_feed" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "url" TEXT NOT NULL UNIQUE,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO "rss_feed" ("url") VALUES
('https://www.theverge.com/rss/index.xml'),
('https://feeds.bbci.co.uk/sport/rss.xml'),
('https://feeds.bbci.co.uk/news/england/rss.xml'),
('https://feeds.bbci.co.uk/news/england/london/rss.xml'),
('https://feeds.bbci.co.uk/news/business/rss.xml'),
('https://feeds.bbci.co.uk/news/politics/rss.xml'),
('https://feeds.bbci.co.uk/news/health/rss.xml'),
('https://feeds.bbci.co.uk/news/education/rss.xml'),
('https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'),
('https://feeds.bbci.co.uk/news/technology/rss.xml'),
('https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'),
('https://feeds.bbci.co.uk/news/in_pictures/rss.xml'),
('https://www.theguardian.com/uk/rss'),
('https://www.theguardian.com/uk/sport/rss'),
('https://hnrss.org/frontpage');
