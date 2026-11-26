import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ClientAuthForm } from "./ClientAuthForm";

void test("server-rendered credential forms use POST and disable controls until hydration", () => {
  const html = renderToStaticMarkup(
    createElement(
      ClientAuthForm,
      { className: "auth-form" },
      createElement("input", { name: "password", type: "password" }),
      createElement("button", { type: "submit" }, "Sign in"),
    ),
  );
  assert.match(html, /<form[^>]*method="post"/);
  assert.match(html, /<form[^>]*class="auth-form"/);
  assert.match(html, /<fieldset[^>]*disabled=""/);
  assert.match(html, /<noscript>/);
  assert.match(html, /Enable JavaScript/);
});
