import { useLocales } from '../providers/locale';

type IntlDateProps = {
  date: string;
  timeZone?: string;
};

export const RenderDate = ({ date, timeZone }: IntlDateProps) => {
  const dateFromString = new Date(date);

  const locales = useLocales();
  const isoString = dateFromString.toISOString();
  const formattedDate = new Intl.DateTimeFormat(locales, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(dateFromString);

  return <time dateTime={isoString}>{formattedDate}</time>;
};
