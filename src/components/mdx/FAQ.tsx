"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answerElements: React.ReactNode[];
}

/** Recursively extract plain text from React nodes (for JSON-LD) */
function getTextContent(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return getTextContent(props.children);
  }
  return "";
}

/** Group children by h3 boundaries into question/answer pairs */
function parseFAQItems(children: React.ReactNode): FAQItem[] {
  const items: FAQItem[] = [];
  let currentQuestion: string | null = null;
  let currentAnswerElements: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    const isH3 =
      React.isValidElement(child) &&
      (child.type === "h3" ||
        (typeof child.type === "function" &&
          (child.type as { displayName?: string }).displayName === "h3"));

    if (isH3) {
      if (currentQuestion) {
        items.push({
          question: currentQuestion,
          answerElements: [...currentAnswerElements],
        });
      }
      const props = child.props as { children?: React.ReactNode };
      currentQuestion = getTextContent(props.children);
      currentAnswerElements = [];
    } else if (currentQuestion) {
      currentAnswerElements.push(child);
    }
  });

  if (currentQuestion) {
    items.push({
      question: currentQuestion,
      answerElements: [...currentAnswerElements],
    });
  }

  return items;
}

export function FAQ({ children }: { children: React.ReactNode }) {
  const items = parseFAQItems(children);

  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answerElements.map(getTextContent).join("").trim(),
      },
    })),
  };

  return (
    <section className="not-prose my-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="border-b border-gray-200"
          >
            <AccordionTrigger className="cursor-pointer py-5 text-left text-base leading-7 font-semibold text-gray-900 transition-colors hover:text-rose-600 hover:no-underline data-[state=open]:text-rose-600 lg:text-lg">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <div className="prose prose-gray max-w-none text-base leading-7 text-gray-600 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {item.answerElements}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
