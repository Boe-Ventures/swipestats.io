import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "swipestats";

export const Faq = () => (
  <Accordion
    type="single"
    collapsible
    defaultValue="a"
    className="w-full max-w-md"
  >
    <AccordionItem value="a">
      <AccordionTrigger>Is my data anonymous?</AccordionTrigger>
      <AccordionContent>
        Yes, identifiers are stripped in your browser.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="b">
      <AccordionTrigger>Does it cost anything?</AccordionTrigger>
      <AccordionContent>Seeing your insights is free.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="c">
      <AccordionTrigger>Which apps are supported?</AccordionTrigger>
      <AccordionContent>
        Tinder, Hinge, and Bumble data exports all work.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
