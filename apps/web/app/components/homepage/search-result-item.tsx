import { Fragment } from 'react';
import { UserRoundPen, Calendar } from 'lucide-react';

import { Button } from '../ui/button';
import { Modal } from '../modal/base';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { RenderDate } from '../text/date';

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

  // Remove lines starting with "Points:" or "# Comments:"
  const cleanedText = decodedText.replace(/^(Points:|# Comments:).*\n?/gm, '');

  // Remove leading and trailing new lines and ensure no more than one consecutive new line
  return cleanedText.trim().replace(/\n+/g, '\n');
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

function getBadgeColor(score: number): string {
  if (score < 40) {
    return 'bg-red-500'; // Bad match
  } else if (score < 70) {
    return 'bg-yellow-500'; // Okay match
  } else {
    return 'bg-green-500'; // Great match
  }
}

export const SearchResultItem = ({
  result,
  imagePosition = 'left',
}: {
  result: {
    metadata: {
      title: string;
      description: string;
      url: string;
      author?: string;
      published?: string;
      updated?: string;
      thumbnail?: {
        url: string;
        width?: number;
        height?: number;
      };
      media_0?: {
        url: string;
        type?: string;
        width?: number;
        height?: number;
        credit?: string;
      };
      [key: string]: {
        url?: string;
        label: string;
      };
    };
    score: number;
  };
  imagePosition?: string;
}) => {
  const matchPercentage = Math.round(result.score * 100);
  const badgeColor = getBadgeColor(matchPercentage);

  const imageUrl =
    result.metadata?.thumbnail?.url ||
    result.metadata?.['media_0']?.url ||
    null;

  const imageWidth =
    result.metadata?.thumbnail?.width ||
    result.metadata?.['media_0']?.width ||
    null;
  const imageHeight =
    result.metadata?.thumbnail?.height ||
    result.metadata?.['media_0']?.height ||
    null;

  const shouldCover = imageWidth && imageHeight && imageWidth > imageHeight;

  // Extract categories
  const categories = Object.keys(result.metadata)
    .filter((key) => key.startsWith('category_'))
    .map((key) => result.metadata[key]);

  return (
    <li>
      <Card className="overflow-hidden">
        <div
          className={`flex flex-col ${
            imagePosition === 'top' ? 'sm:flex-col' : 'sm:flex-row'
          } h-full`}
        >
          {imageUrl ? (
            <div
              className={`image-container image-container--${imagePosition} ${
                imagePosition === 'left' ? 'sm:w-1/3' : 'w-full'
              } ${imagePosition === 'right' ? 'sm:w-1/4' : ''} ${
                imagePosition === 'top' ? 'h-24 sm:h-48' : 'h-24 sm:h-auto'
              }`}
            >
              <div className="relative h-full bg-gray-600">
                <img
                  src={imageUrl}
                  alt=""
                  className={`w-full h-full ${
                    shouldCover ? 'object-cover' : 'object-contain'
                  }`}
                />
              </div>
            </div>
          ) : null}
          <div
            className={`flex flex-col ${
              imageUrl && imagePosition === 'right' ? 'sm:w-3/4' : 'w-full'
            }`}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-col space-y-2">
                <CardTitle className="text-lg sm:text-xl font-semibold text-left">
                  <a
                    href={result.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="title"
                  >
                    {result.metadata.title}
                  </a>
                </CardTitle>
              </div>
              <div className="flex flex-wrap justify-left gap-2 mb-2">
                {result.score && (
                  <Badge variant="secondary" className={`w-fit ${badgeColor}`}>
                    {matchPercentage}% match
                  </Badge>
                )}
                {result.metadata.author && (
                  <span className="text-xs text-muted-foreground flex items-center">
                    <UserRoundPen className="mr-2 h-4 w-4" />
                    {result.metadata.author}
                  </span>
                )}
                {result.metadata.published && (
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    <RenderDate
                      date={result.metadata.published}
                      timeZone="UTC"
                    />
                    {result.metadata.updated && (
                      <span>
                        (Updated:{' '}
                        <RenderDate
                          date={result.metadata.updated}
                          timeZone="UTC"
                        />
                        )
                      </span>
                    )}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              {result.metadata.description && (
                <p className="text-sm sm:text-base text-left">
                  {renderTextWithNewLines(
                    stripHtmlTagsAndDecode(result.metadata.description),
                    result.metadata.url
                  )}
                </p>
              )}
              {categories.length ? (
                <div className="flex flex-wrap justify-left gap-2 mt-2">
                  <strong>Categories:</strong>
                  {categories.map((category, index) =>
                    category.url ? (
                      <a
                        key={index}
                        href={category.url}
                        className="category-badge"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {category.label}
                      </a>
                    ) : (
                      <span key={index} className="category-badge">
                        {category.label}
                      </span>
                    )
                  )}
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-wrap justify-end space-x-2 space-y-2 sm:space-y-0 bg-muted/50 py-2">
              <Modal
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Summarise
                  </Button>
                }
                title="Summarise article"
                description="Use AI to generate a summary of the article."
              >
                <div className="flex items-center space-x-2">
                  Coming soon...
                </div>
              </Modal>
              <Modal
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Analyse
                  </Button>
                }
                title="Analyse article"
                description="Use AI to analyse the article."
              >
                <div className="flex items-center space-x-2">
                  Coming soon...
                </div>
              </Modal>
            </CardFooter>
          </div>
        </div>
      </Card>
    </li>
  );
};
