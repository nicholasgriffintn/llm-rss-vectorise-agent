import { Fragment } from 'react';

import { Button } from '../ui/button';
import { Modal } from '../modal/base';
import { RenderDate } from '../text/date';

import { Fragment } from 'react';

function stripHtmlTagsAndDecode(html: string): string {
  // Replace paragraph tags with new lines
  const textWithNewLines = html.replace(/<\/?p[^>]*>/g, '\n');

  // Strip remaining HTML tags
  const text = textWithNewLines.replace(/<\/?[^>]+(>|$)/g, '');

  // Decode HTML entities
  const decodedText = text
    .replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(dec);
    })
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      const entities: { [key: string]: string } = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        // Add more entities if needed
      };
      return entities[entity] || match;
    });

  // Remove leading and trailing new lines and ensure no more than one consecutive new line
  return decodedText.trim().replace(/\n+/g, '\n');
}

function renderTextWithNewLines(text: string, url: string): JSX.Element {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const continueReadingRegex = /Continue reading\.\.\./g;

  return (
    <>
      {text.split('\n').map((line, index) => (
        <Fragment key={index}>
          {line
            .split(urlRegex)
            .map((part, i) =>
              urlRegex.test(part) ? (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {part}
                </a>
              ) : (
                part
              )
            )
            .map((part, i) =>
              continueReadingRegex.test(part as string) ? (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  Continue reading...
                </a>
              ) : (
                part
              )
            )}
          <br />
        </Fragment>
      ))}
    </>
  );
}

export const SearchResultItem = ({
  result,
}: {
  result: {
    metadata: {
      title: string;
      description: string;
      url: string;
      author?: string;
      published?: string;
      updated?: string;
    };
    score: number;
  };
}) => (
  <li className="bg-card text-card-foreground rounded-lg shadow relative">
    {result.score && (
      <span className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
        {Math.round(result.score * 100)}% match
      </span>
    )}
    <img
      src="/assets/placeholders/150x150.png"
      alt=""
      className="w-full h-16 object-cover rounded-t-lg"
    />
    <div className="p-4">
      <a
        href={result.metadata.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-bold title"
      >
        {result.metadata.title}
      </a>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {result.metadata.author && (
          <span className="text-xs text-muted-foreground">
            Author: {result.metadata.author}
          </span>
        )}
        {document.fhfhs}
        {result.metadata.published && (
          <span className="text-xs text-muted-foreground">
            Published:{' '}
            <RenderDate date={result.metadata.published} timeZone="UTC" />
          </span>
        )}
        {result.metadata.updated && (
          <span className="text-xs text-muted-foreground">
            Updated:{' '}
            <RenderDate date={result.metadata.updated} timeZone="UTC" />
          </span>
        )}
      </div>
      {result.metadata.description && (
        <p className="text-sm text-muted-foreground">
          {renderTextWithNewLines(
            stripHtmlTagsAndDecode(result.metadata.description),
            result.metadata.url
          )}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <Modal
          trigger={
            <Button variant="outline" size="sm" className="text-xs">
              Summarise
            </Button>
          }
          title="Summarise article"
          description="Use AI to generate a summary of the article."
        >
          <div className="flex items-center space-x-2">Coming soon...</div>
        </Modal>
        <Modal
          trigger={
            <Button variant="outline" size="sm" className="text-xs">
              Analyse
            </Button>
          }
          title="Analyse article"
          description="Use AI to analyse the article."
        >
          <div className="flex items-center space-x-2">Coming soon...</div>
        </Modal>
      </div>
    </div>
  </li>
);
