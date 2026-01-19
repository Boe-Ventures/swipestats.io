import type { ReactNode } from "react";

interface TypographyProps {
  children?: ReactNode;
  className?: string;
}

// Heading Components
export function TypographyH1({ children, className = "" }: TypographyProps) {
  return (
    <h1
      className={`scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance ${className}`}
    >
      {children || "Taxing Laughter: The Joke Tax Chronicles"}
    </h1>
  );
}

export function TypographyH2({ children, className = "" }: TypographyProps) {
  return (
    <h2
      className={`scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 ${className}`}
    >
      {children || "The People of the Kingdom"}
    </h2>
  );
}

export function TypographyH3({ children, className = "" }: TypographyProps) {
  return (
    <h3
      className={`scroll-m-20 text-2xl font-semibold tracking-tight ${className}`}
    >
      {children || "The Joke Tax"}
    </h3>
  );
}

export function TypographyH4({ children, className = "" }: TypographyProps) {
  return (
    <h4
      className={`scroll-m-20 text-xl font-semibold tracking-tight ${className}`}
    >
      {children || "People stopped telling jokes"}
    </h4>
  );
}

// Body Text Components
export function TypographyP({ children, className = "" }: TypographyProps) {
  return (
    <p className={`leading-7 [&:not(:first-child)]:mt-6 ${className}`}>
      {children ||
        "The king, seeing how much happier his subjects were, realized the error of his ways and repealed the joke tax."}
    </p>
  );
}

export function TypographyLead({ children, className = "" }: TypographyProps) {
  return (
    <p className={`text-muted-foreground text-xl ${className}`}>
      {children ||
        "A modal dialog that interrupts the user with important content and expects a response."}
    </p>
  );
}

export function TypographyLarge({ children, className = "" }: TypographyProps) {
  return (
    <div className={`text-lg font-semibold ${className}`}>
      {children || "Are you absolutely sure?"}
    </div>
  );
}

export function TypographySmall({ children, className = "" }: TypographyProps) {
  return (
    <small className={`text-sm leading-none font-medium ${className}`}>
      {children || "Email address"}
    </small>
  );
}

export function TypographyMuted({ children, className = "" }: TypographyProps) {
  return (
    <p className={`text-muted-foreground text-sm ${className}`}>
      {children || "Enter your email address."}
    </p>
  );
}

// Special Components
export function TypographyBlockquote({
  children,
  className = "",
}: TypographyProps) {
  return (
    <blockquote className={`mt-6 border-l-2 pl-6 italic ${className}`}>
      {children ||
        '"After all," he said, "everyone enjoys a good joke, so it\'s only fair that they should pay for the privilege."'}
    </blockquote>
  );
}

export function TypographyInlineCode({
  children,
  className = "",
}: TypographyProps) {
  return (
    <code
      className={`bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold ${className}`}
    >
      {children || "@radix-ui/react-alert-dialog"}
    </code>
  );
}

// List Component
interface ListItem {
  text: string;
}

interface TypographyListProps {
  items?: ListItem[];
  className?: string;
}

export function TypographyList({ items, className = "" }: TypographyListProps) {
  const defaultItems = [
    { text: "1st level of puns: 5 gold coins" },
    { text: "2nd level of jokes: 10 gold coins" },
    { text: "3rd level of one-liners : 20 gold coins" },
  ];

  const listItems = items || defaultItems;

  return (
    <ul className={`my-6 ml-6 list-disc [&>li]:mt-2 ${className}`}>
      {listItems.map((item, index) => (
        <li key={index}>{item.text}</li>
      ))}
    </ul>
  );
}

// Table Component
interface TableRow {
  col1: string;
  col2: string;
}

interface TypographyTableProps {
  headers?: { col1: string; col2: string };
  rows?: TableRow[];
  className?: string;
}

export function TypographyTable({
  headers,
  rows,
  className = "",
}: TypographyTableProps) {
  const defaultHeaders = {
    col1: "King's Treasury",
    col2: "People's happiness",
  };
  const defaultRows = [
    { col1: "Empty", col2: "Overflowing" },
    { col1: "Modest", col2: "Satisfied" },
    { col1: "Full", col2: "Ecstatic" },
  ];

  const tableHeaders = headers || defaultHeaders;
  const tableRows = rows || defaultRows;

  return (
    <div className={`my-6 w-full overflow-y-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="even:bg-muted m-0 border-t p-0">
            <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
              {tableHeaders.col1}
            </th>
            <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
              {tableHeaders.col2}
            </th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, index) => (
            <tr key={index} className="even:bg-muted m-0 border-t p-0">
              <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
                {row.col1}
              </td>
              <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
                {row.col2}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Export all components as a single object for convenience
export const Typography = {
  H1: TypographyH1,
  H2: TypographyH2,
  H3: TypographyH3,
  H4: TypographyH4,
  P: TypographyP,
  Lead: TypographyLead,
  Large: TypographyLarge,
  Small: TypographySmall,
  Muted: TypographyMuted,
  Blockquote: TypographyBlockquote,
  InlineCode: TypographyInlineCode,
  List: TypographyList,
  Table: TypographyTable,
};
