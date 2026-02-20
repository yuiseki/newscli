import { expect, test } from 'vitest';
import { parseFeedSourcesFromOpmlString } from '../src/opml';

test('parseFeedSourcesFromOpmlString extracts categories and feed sources', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Japan">
      <outline text="NHK" xmlUrl="https://example.com/japan.xml" />
    </outline>
    <outline text="International">
      <outline text="BBC" xmlUrl="https://example.com/world.xml" />
    </outline>
  </body>
</opml>`;

  const parsed = await parseFeedSourcesFromOpmlString(xml);

  expect(parsed.categories).toEqual(['Japan', 'International']);
  expect(parsed.sources).toEqual([
    {
      category: 'Japan',
      name: 'NHK',
      url: 'https://example.com/japan.xml',
    },
    {
      category: 'International',
      name: 'BBC',
      url: 'https://example.com/world.xml',
    },
  ]);
});

test('parseFeedSourcesFromOpmlString throws when no rss source exists', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Japan">
      <outline text="No URL" />
    </outline>
  </body>
</opml>`;

  await expect(parseFeedSourcesFromOpmlString(xml)).rejects.toThrow(
    'No RSS feed sources found in OPML file.',
  );
});
