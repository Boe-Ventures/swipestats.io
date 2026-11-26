"use client";
import { useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Heart, Plus, Sparkles } from "lucide-react";
const people = [
  {
    name: "Mira",
    initial: "M",
    context: "A little more curious each time",
    status: "Getting to know each other",
    color: "bg-[#eadbcb]",
    entries: [
      {
        date: "November 8",
        title: "The long way home",
        text: "Mira and I went to Juniper Fold. I think we got there around eight. We took the long way home because neither of us wanted to leave just yet.",
        place: "Juniper Fold",
        reflection: "Easy conversation. I want to see her again.",
      },
      {
        date: "October, sometime",
        title: "A first hello",
        text: "We matched on Hinge. Her answer about getting lost in bookshops made me smile.",
        place: "Hinge",
        reflection: "A beginning worth remembering.",
      },
    ],
  },
  {
    name: "Rowan",
    initial: "R",
    context: "An afternoon that stayed with me",
    status: "A remembered connection",
    color: "bg-[#dbe3d6]",
    entries: [
      {
        date: "Summer 2024",
        title: "By the harbor",
        text: "We had tea at Lantern Room, then walked down to the harbor. Rowan said they preferred quiet cafés. We sat there longer than either of us had planned.",
        place: "Alder Bay",
        reflection: "I felt seen. That mattered, even though it was brief.",
      },
    ],
  },
  {
    name: "Alex",
    initial: "A",
    context: "A name is enough to begin",
    status: "New connection",
    color: "bg-[#e4dce8]",
    entries: [],
  },
];
export function LoveStoriesPreview() {
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(["feature", "standalone"] as const).withDefault(
      "feature",
    ),
  );
  const [selected, setSelected] = useState(0);
  const person = people[selected]!;
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#302e2b]">
      <div className="border-b border-[#ded9d0] bg-[#eee9df] px-5 py-3 text-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p>
            Product experiment · Fictional people · Nothing is saved to your
            account
          </p>
          <div
            className="flex rounded-full border border-[#c9c1b5] p-1"
            aria-label="Product presentation"
          >
            {(["feature", "standalone"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => void setMode(value)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${mode === value ? "bg-[#302e2b] text-white" : "hover:bg-[#e2dcd1]"}`}
              >
                {value === "feature" ? "Inside SwipeStats" : "Standalone"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <Link
          href={
            mode === "feature"
              ? "/app/dashboard"
              : "/experiments/love-stories?mode=standalone"
          }
          className="flex items-center gap-3 font-semibold"
        >
          <Heart className="size-5 text-[#9c5948]" />
          {mode === "feature" ? "SwipeStats / Love Stories" : "Love Stories"}
          <span className="hidden text-xs font-normal text-[#81766a] sm:inline">
            {mode === "standalone" ? "by SwipeStats" : "Your private journal"}
          </span>
        </Link>
        <Link href="/" className="text-xs text-[#81766a] hover:underline">
          Back to SwipeStats <ArrowUpRight className="inline size-3" />
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="border-b border-[#ded9d0] pt-7 pb-9">
          <p className="mb-4 text-xs tracking-[0.2em] text-[#9c5948] uppercase">
            People. Moments. What they meant.
          </p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">
            A life made of connections.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#81766a]">
            Remember the people, keep your own words, and notice what matters to
            you. A day or a decade, every story has a place.
          </p>
        </div>
        <div className="grid gap-10 pt-9 md:grid-cols-[260px_1fr]">
          <aside>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-widest uppercase">
                Your people
              </h2>
              <span className="text-xs text-[#81766a]">3 connections</span>
            </div>
            <div className="space-y-2">
              {people.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => setSelected(i)}
                  aria-pressed={selected === i}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${selected === i ? "bg-white shadow-sm ring-1 ring-[#ded9d0]" : "hover:bg-white/60"}`}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full font-serif text-xl ${p.color}`}
                  >
                    {p.initial}
                  </span>
                  <span>
                    <span className="block font-medium">{p.name}</span>
                    <span className="text-xs leading-5 text-[#81766a]">
                      {p.status}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-dashed border-[#c9c1b5] p-5 text-sm leading-6 text-[#81766a]">
              <Sparkles className="mb-3 size-4 text-[#9c5948]" />
              Start with a name. Details can come later. An app upload is never
              required.
            </div>
          </aside>
          <section aria-label={`${person.name}'s story`}>
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs text-[#9c5948]">{person.status}</p>
                <h2 className="font-serif text-4xl">{person.name}</h2>
                <p className="mt-2 text-sm text-[#81766a]">{person.context}</p>
              </div>
              <BookOpen className="size-5 text-[#9c5948]" />
            </div>
            <div className="space-y-5">
              {person.entries.length ? (
                person.entries.map((entry) => (
                  <article
                    key={entry.title}
                    className="rounded-2xl border border-[#ded9d0] bg-white/75 p-6 sm:p-8"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[#81766a]">
                      <time>{entry.date}</time>
                      <span>{entry.place}</span>
                    </div>
                    <h3 className="mb-4 font-serif text-2xl">{entry.title}</h3>
                    <p className="text-[15px] leading-7">{entry.text}</p>
                    <div className="mt-6 border-l-2 border-[#b88170] pl-4">
                      <p className="mb-1 text-[10px] tracking-widest text-[#9c5948] uppercase">
                        My reflection
                      </p>
                      <p className="text-sm leading-6 text-[#81766a]">
                        {entry.reflection}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-[#ded9d0] bg-white/75 p-8">
                  <h3 className="font-serif text-2xl">
                    The story can start here.
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#81766a]">
                    No date, rating, or backstory needed. You can come back when
                    there is something you want to remember.
                  </p>
                </div>
              )}
            </div>
            <form
              className="mt-7 rounded-2xl bg-[#eae3d7] p-6"
              onSubmit={(e) => {
                e.preventDefault();
                setSaved(draft);
                setDraft("");
              }}
            >
              <label htmlFor="memory" className="font-serif text-2xl">
                What would you like to remember?
              </label>
              <textarea
                id="memory"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Try a fictional memory..."
                className="mt-4 w-full resize-y rounded-xl border border-[#d0c6b7] bg-[#fbf9f5] p-4 text-sm focus:outline-2 focus:outline-[#9c5948]"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#81766a]">
                  Preview only. This text disappears when you reload.
                </p>
                <button
                  disabled={!draft.trim()}
                  className="flex items-center gap-2 rounded-full bg-[#8e5141] px-5 py-2.5 text-sm text-white disabled:opacity-40"
                >
                  <Plus className="size-4" />
                  Preview entry
                </button>
              </div>
              {saved && (
                <p
                  role="status"
                  className="mt-5 rounded-xl bg-white/60 p-4 text-sm leading-6 whitespace-pre-wrap"
                >
                  {saved}
                </p>
              )}
            </form>
          </section>
        </div>
        <footer className="mt-12 border-t border-[#ded9d0] pt-5 text-xs leading-6 text-[#81766a]">
          {mode === "feature"
            ? "One SwipeStats account, a separate private journal. Dating-app analytics are optional context."
            : "A journal you can start without using a dating app. The same underlying account and storage architecture can support a separate product."}
        </footer>
      </main>
    </div>
  );
}
