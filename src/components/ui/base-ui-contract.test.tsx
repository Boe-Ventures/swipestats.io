import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "./dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Base UI wrapper contracts", () => {
  test("Button render composes a link without nesting a button", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        { render: createElement("a", { href: "/upload" }), variant: "outline" },
        "Upload",
      ),
    );

    expect(html).toContain('<a href="/upload"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('role="button"');
    expect(html).toContain("Upload</a>");
    expect(html).not.toContain("<button");
  });

  test("Checkbox keeps Base UI's hidden native input contract", () => {
    const html = renderToStaticMarkup(
      createElement(Checkbox, { name: "terms", defaultChecked: true }),
    );

    expect(html).toContain('data-slot="checkbox"');
    expect(html).toContain('data-checked=""');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="terms"');
  });

  test("Accordion accepts the always-array value model", () => {
    const html = renderToStaticMarkup(
      createElement(
        Accordion,
        { value: ["details"] },
        createElement(
          AccordionItem,
          { value: "details" },
          createElement(AccordionTrigger, null, "Details"),
          createElement(AccordionContent, null, "Body"),
        ),
      ),
    );

    expect(html).toContain('data-slot="accordion"');
    expect(html).toContain('data-panel-open=""');
    expect(html).toContain("Details");
    expect(html).toContain("Body");
  });

  test("Tabs render the expected tab and panel relationships", () => {
    const html = renderToStaticMarkup(
      createElement(
        Tabs,
        { value: "overview" },
        createElement(
          TabsList,
          null,
          createElement(TabsTrigger, { value: "overview" }, "Overview"),
        ),
        createElement(TabsContent, { value: "overview" }, "Panel"),
      ),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
  });

  test("Dropdown menu labels render inside the group they own", () => {
    const html = renderToStaticMarkup(
      createElement(
        DropdownMenu,
        null,
        createElement(
          DropdownMenuGroup,
          null,
          createElement(DropdownMenuLabel, null, "Account"),
          createElement(DropdownMenuItem, null, "Profile"),
        ),
      ),
    );

    const labelId = /id="([^"]+)"[^>]*>Account<\/div>/.exec(html)?.[1];
    const labelIndex = html.indexOf(">Account</div>");
    const itemIndex = html.indexOf(">Profile</div>");

    expect(labelId).toBeDefined();
    expect(html).toContain('role="group"');
    expect(html).toContain('role="menuitem"');
    expect(labelIndex).toBeGreaterThan(html.indexOf('role="group"'));
    expect(itemIndex).toBeGreaterThan(labelIndex);
  });
});
