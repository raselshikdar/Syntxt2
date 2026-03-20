import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; syntxt-bot/1.0)',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 });
    }

    const html = await res.text();
    
    // Extract meta tags
    const getMetaContent = (name: string): string | null => {
      // Try og: first
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
      if (ogMatch) return ogMatch[1];
      
      // Try twitter:
      const twitterMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
      if (twitterMatch) return twitterMatch[1];
      
      // Try standard meta
      const standardMatch = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
      return standardMatch ? standardMatch[1] : null;
    };

    const title = getMetaContent('title') || 
                  html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 
                  '';
    
    const description = getMetaContent('description') || '';
    const image = getMetaContent('image') || '';

    return NextResponse.json({
      url,
      title: title.slice(0, 200),
      description: description.slice(0, 300),
      image: image.slice(0, 500),
    });
  } catch (error) {
    console.error('Link preview error:', error);
    return NextResponse.json({ error: 'Failed to fetch link preview' }, { status: 500 });
  }
}
