import { LinkPreview } from '@/components/syntxt/types';

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>]+)/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

/**
 * Extract hashtags from text content
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const matches: string[] = [];
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    matches.push(match[1].toLowerCase());
  }
  
  return [...new Set(matches)];
}

/**
 * Extract mentions from text content
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push(match[1].toLowerCase());
  }
  
  return [...new Set(matches)];
}

/**
 * Render text with links, hashtags, and mentions as clickable elements
 */
export function renderTextWithEntities(
  text: string,
  onUserClick: (handle: string) => void,
  onHashtagClick?: (hashtag: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const entityRegex = /(https?:\/\/[^\s<>]+)|#([a-zA-Z0-9_]+)|@([a-zA-Z0-9_]+)/g;
  
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = entityRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, url, hashtag, mention] = match;

    if (url) {
      // Render as link
      parts.push(
        <a
          key={key++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {url.length > 30 ? url.slice(0, 30) + '...' : url}
        </a>
      );
    } else if (hashtag) {
      // Render as hashtag
      if (onHashtagClick) {
        parts.push(
          <button
            key={key++}
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick(hashtag);
            }}
            className="text-primary hover:underline"
          >
            #{hashtag}
          </button>
        );
      } else {
        parts.push(
          <span key={key++} className="text-primary">
            #{hashtag}
          </span>
        );
      }
    } else if (mention) {
      // Render as mention
      parts.push(
        <button
          key={key++}
          onClick={(e) => {
            e.stopPropagation();
            onUserClick(mention);
          }}
          className="text-primary hover:underline"
        >
          @{mention}
        </button>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Fetch link preview from API
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}
