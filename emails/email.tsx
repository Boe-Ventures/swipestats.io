import { Button, Html, Head, Body, Tailwind } from "@react-email/components";
import * as React from "react";

export default function Email() {
  return (
    <Html>
      <Head />
      <Body>
        <Tailwind
          config={{
            theme: {
              extend: {
                colors: {
                  brand: "#007291",
                },
              },
            },
          }}
        >
          <Button
            href="https://example.com"
            className="bg-black px-5 py-3 font-medium text-white"
          >
            Click me
          </Button>
        </Tailwind>
      </Body>
    </Html>
  );
}
