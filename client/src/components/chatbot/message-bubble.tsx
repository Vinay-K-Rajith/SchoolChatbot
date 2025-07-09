import { Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import React from "react";
import Player from 'lottie-react';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
  schoolCode: string;
  availableKeywords: string[];
}

// Helper to linkify URLs and emails in a string or array of strings/JSX
function linkify(text: string | (string | JSX.Element)[]): (string | JSX.Element)[] {
  // If already an array (from bold splitting), process each part
  if (Array.isArray(text)) {
    return text.flatMap((part, idx) => {
      if (typeof part === "string") {
        return linkify(part);
      }
      return part;
    });
  }

  // Regex for URLs (http, https, www)
  const urlRegex = /((https?:\/\/[^\s<]+)|(www\.[^\s<]+))/gi;
  // Regex for emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z09.-]+\.[a-zA-Z]{2,})/gi;

  // Split by URLs and emails in one pass to avoid duplicate rendering
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  const combinedRegex = new RegExp(`${urlRegex.source}|${emailRegex.source}`, "gi");

  let match: RegExpExecArray | null;
  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matchedText = match[0];

    // Check if it's an email
    if (matchedText.match(emailRegex)) {
      parts.push(
        <a
          key={`email-${match.index}-${matchedText}`}
          href={`mailto:${matchedText}`}
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {matchedText}
        </a>
      );
    }
    // Otherwise, it's a URL
    else if (matchedText.match(urlRegex)) {
      // Remove trailing punctuation (like www.x.comwww.)
      let cleanUrl = matchedText.replace(/([.,!?;:]+)$/g, "");
      let displayUrl = cleanUrl;
      // If the next part of the string is the same as the displayUrl, skip it
      // (prevents www.x.comwww.x.com)
      // But this is handled by splitting, so just render once

      // Ensure protocol for www.
      const href = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;
      parts.push(
        <a
          key={`url-${match.index}-${cleanUrl}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {displayUrl}
        </a>
      );
    }
    lastIndex = match.index + matchedText.length;
  }
  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// Fetch image URLs from backend for keywords
async function fetchImageUrl(keyword: string, schoolCode: string): Promise<{ url: string; alt: string } | null> {
  try {
    const res = await fetch(`/api/school/${schoolCode}/images?keyword=${encodeURIComponent(keyword)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ? { url: data.url, alt: data.alt || keyword } : null;
  } catch {
    return null;
  }
}

function formatBotContent(content: string, schoolCode: string, excludeImageUrls: string[] = []): JSX.Element {
  // Remove direct image URLs from the text if they are in excludeImageUrls
  let processedContent = content;
  if (excludeImageUrls.length > 0) {
    for (const url of excludeImageUrls) {
      processedContent = processedContent.replace(new RegExp(`(^|\s)${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\s|$)`, 'g'), ' ');
    }
  }

  // Use ReactMarkdown for proper markdown rendering
  return (
    <div className="message-bubble-custom">
      <ReactMarkdown
        children={processedContent}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({node, ...props}) => (
            <a {...props} className="text-blue-700 underline" target="_blank" rel="noopener noreferrer" />
          ),
          strong: ({node, ...props}) => (
            <strong {...props} className="text-blue-900" />
          ),
          li: ({node, ...props}) => (
            <li {...props} className="ml-4 list-disc" />
          ),
        }}
      />
    </div>
  );
}

function formatMessageContent(content: string, isUser: boolean, schoolCode: string, excludeImageUrls: string[] = []): JSX.Element {
  if (isUser) {
    return <span>{linkify(content)}</span>;
  }
  return formatBotContent(content, schoolCode, excludeImageUrls);
}

export function MessageBubble({ content, isUser, timestamp, schoolCode, availableKeywords }: MessageBubbleProps) {
  const [images, setImages] = useState<JSX.Element[]>([]);
  const [directImageUrls, setDirectImageUrls] = useState<string[]>([]);
  // Word-by-word animation state
  const [displayedWords, setDisplayedWords] = useState<string[]>(isUser ? [content] : []);
  const [botAnimation, setBotAnimation] = useState<any>(null);

  useEffect(() => {
    if (!isUser) {
      fetch('/static/Animation-1751969781201.json')
        .then(res => res.json())
        .then(setBotAnimation)
        .catch(() => setBotAnimation(null));
    }
  }, [isUser]);

  useEffect(() => {
    if (isUser) {
      setDisplayedWords([content]);
      return;
    }
    const words = content.split(' ');
    let idx = 0;
    setDisplayedWords([]);
    const interval = setInterval(() => {
      idx++;
      setDisplayedWords(words.slice(0, idx));
      if (idx >= words.length) clearInterval(interval);
    }, 60); // 60ms per word
    return () => clearInterval(interval);
  }, [content, isUser]);

  useEffect(() => {
    let isMounted = true;
    async function loadImages() {
      const imgs: JSX.Element[] = [];
      const renderedUrls = new Set<string>();
      // Keyword-based images
      for (const keyword of availableKeywords) {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          const res = await fetch(`/api/school/${schoolCode}/images?keyword=${encodeURIComponent(keyword)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.url && isMounted && !renderedUrls.has(data.url)) {
              imgs.push(
                <div key={keyword} className="my-2 flex justify-center">
                  <img
                    src={data.url}
                    alt={data.alt || keyword}
                    className="rounded-lg shadow max-w-xs w-full h-auto border border-gray-200"
                    style={{ maxHeight: 107 }}
                    loading="lazy"
                  />
                </div>
              );
              renderedUrls.add(data.url);
            }
          }
        }
      }
      // Direct image URLs in content
      const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;
      let match;
      const foundDirectUrls: string[] = [];
      while ((match = urlRegex.exec(content)) !== null) {
        const url = match[1];
        if (!renderedUrls.has(url)) {
          imgs.push(
            <div key={url} className="my-2 flex justify-center">
              <img
                src={url}
                alt={url}
                className="rounded-lg shadow max-w-xs w-full h-auto border border-gray-200"
                style={{ maxHeight: 107 }}
                loading="lazy"
              />
            </div>
          );
          renderedUrls.add(url);
          foundDirectUrls.push(url);
        }
      }
        setDirectImageUrls(foundDirectUrls);
      if (isMounted) setImages(imgs);
    }
    loadImages();
    return () => { isMounted = false; };
  }, [content, availableKeywords, schoolCode]);

  // Your formatting logic for bold, bullets, etc.
  const formattedContent = useMemo(() => {
    if (isUser) return formatBotContent(content, schoolCode, directImageUrls);
    return formatBotContent(displayedWords.join(' '), schoolCode, directImageUrls);
  }, [content, schoolCode, directImageUrls, displayedWords, isUser]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      {!isUser && (
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          {botAnimation && (
            <Player
              autoplay
              loop
              animationData={botAnimation}
              style={{ height: 32, width: 32 }}
            />
          )}
        </div>
      )}
      <div className={`rounded-2xl p-4 max-w-[98%] ${isUser ? 'bg-school-blue text-white rounded-tr-sm' : 'bg-gray-50 rounded-tl-sm border border-gray-200'}`}>
        <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-gray-800'}`}>
          {formattedContent}
          {images}
        </div>
        <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-white' : 'text-gray-500'}`}>
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
