import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  getFieldControlA11yProps,
  getFormFieldIds,
  mergeAriaDescribedBy,
  useForm,
} from "./form-new";
import { CountrySelect, RegionSelect } from "./form-inputs/CountrySelect";

function CountryRegionHarness() {
  const form = useForm<{ country: string; region: string }>({
    defaultValues: { country: "US", region: "CA" },
  });
  return createElement(
    "div",
    null,
    createElement(CountrySelect, {
      control: form.control,
      name: "country",
      label: "Country",
    }),
    createElement(RegionSelect, {
      control: form.control,
      name: "region",
      countryCode: "US",
      label: "Region",
    }),
  );
}

describe("form field accessibility contract", () => {
  test("derives stable IDs and composes described-by values", () => {
    expect(getFormFieldIds("profile-email")).toEqual({
      controlId: "profile-email-control",
      labelId: "profile-email-label",
      descriptionId: "profile-email-description",
      errorId: "profile-email-error",
    });
    expect(
      mergeAriaDescribedBy(
        "profile-email-description profile-email-error",
        "external-help profile-email-error",
      ),
    ).toBe("profile-email-description profile-email-error external-help");
    expect(mergeAriaDescribedBy(undefined, "")).toBeUndefined();
  });

  test("preserves caller IDs and ARIA while adding shared relationships", () => {
    expect(
      getFieldControlA11yProps("profile-email", {
        id: "custom-control",
        "aria-describedby": "external-help profile-email-error",
        "aria-invalid": "grammar",
        hasDescription: true,
        hasError: true,
      }),
    ).toEqual({
      id: "custom-control",
      "aria-describedby":
        "profile-email-description profile-email-error external-help",
      "aria-invalid": "grammar",
    });
  });

  test("renders a native control with its label, description, and error", () => {
    const ids = getFormFieldIds("email");
    const controlProps = getFieldControlA11yProps("email", {
      hasDescription: true,
      hasError: true,
      "aria-invalid": true,
    });
    const html = renderToStaticMarkup(
      createElement(
        Field,
        { "data-invalid": true },
        createElement(
          FieldLabel,
          { id: ids.labelId, htmlFor: controlProps.id },
          "Email",
        ),
        createElement("input", controlProps),
        createElement(
          FieldDescription,
          { id: ids.descriptionId },
          "Used for receipts",
        ),
        createElement(FieldError, {
          id: ids.errorId,
          errors: [{ type: "required", message: "Email is required" }],
        }),
      ),
    );

    expect(html).toContain('id="email-label" for="email-control"');
    expect(html).toContain('id="email-control"');
    expect(html).toContain('aria-describedby="email-description email-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="email-description"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain('role="alert"');
  });

  test("renders a compound checkbox group with a legend and shared help", () => {
    const ids = getFormFieldIds("interests");
    const html = renderToStaticMarkup(
      createElement(
        FieldSet,
        { "aria-describedby": `${ids.descriptionId} ${ids.errorId}` },
        createElement(FieldLegend, { id: ids.labelId }, "Interests"),
        createElement(
          FieldDescription,
          { id: ids.descriptionId },
          "Choose any",
        ),
        createElement("input", { id: "interests-design", type: "checkbox" }),
        createElement(FieldLabel, { htmlFor: "interests-design" }, "Design"),
        createElement(FieldError, {
          id: ids.errorId,
          errors: [{ type: "required", message: "Choose one interest" }],
        }),
      ),
    );

    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(html).toContain('id="interests-label"');
    expect(html).toContain('for="interests-design"');
    expect(html).toContain('id="interests-design"');
    expect(html).toContain(
      'aria-describedby="interests-description interests-error"',
    );
    expect(html).toContain('id="interests-error"');
    expect(html).toContain('role="alert"');
  });

  test("wires country and region labels to their combobox triggers", () => {
    const html = renderToStaticMarkup(createElement(CountryRegionHarness));

    expect(html).toContain('id="country-label" for="country-control"');
    expect(html).toContain('id="country-control"');
    expect(html).toContain('id="region-label" for="region-control"');
    expect(html).toContain('id="region-control"');
  });
});
