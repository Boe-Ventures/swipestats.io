import { SmartLink } from "swipestats";

export const InlineInCopy = () => (
  <span className="text-sm text-gray-600">
    Inline <SmartLink href="/privacy">SmartLink</SmartLink> in copy — internal
    routes render through Next.js Link.
  </span>
);

export const ExternalLinks = () => (
  <div className="flex flex-col gap-2 text-sm text-gray-600">
    <span>
      External:{" "}
      <SmartLink href="https://swipestats.io" newTab>
        swipestats.io
      </SmartLink>{" "}
      opens in a new tab with rel=&quot;noopener noreferrer&quot;.
    </span>
    <span>
      Contact:{" "}
      <SmartLink href="mailto:kris@swipestats.io">
        kris@swipestats.io
      </SmartLink>
    </span>
  </div>
);

export const NoUnderline = () => (
  <span className="text-sm text-gray-600">
    Underline off:{" "}
    <SmartLink href="/insights" underline={false}>
      View your insights
    </SmartLink>{" "}
    keeps the rose color without the underline.
  </span>
);
