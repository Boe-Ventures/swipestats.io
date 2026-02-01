import { cn } from "@/components/ui/lib/utils";

const featuredTestimonial = {
  body: "The activity charts completely changed how I understand my dating patterns. Being able to see my swipe activity, match rates, and messaging trends over time helped me identify when I'm most successful. The profile directory is a game-changer for comparing yourself to others.",
  author: {
    name: "Female, 32",
    handle: "Berlin, Germany",
    imageUrl: "/images/marketing/testimonials/f37.jpeg",
    logoUrl: "https://tailwindui.com/img/logos/savvycal-logo-gray-900.svg",
  },
};
const testimonials = [
  [
    // column 1 left
    [
      {
        body: "The profile comparison tool is brilliant. I can see my Tinder and Hinge profiles side-by-side and track which one performs better. Helped me optimize both apps quickly.",
        author: {
          name: "Male, 29",
          handle: "London, UK",
          imageUrl: "/images/marketing/testimonials/m29.jpeg",
        },
      },
      {
        body: "Browsing the profile directory gave me so many ideas for improving my own profile. Seeing real data from others helped me understand what actually works.",
        author: {
          name: "Female, 28",
          handle: "New York, USA",
          imageUrl: "/images/marketing/testimonials/f34.jpeg",
        },
      },
      // {
      //   body: "Laborum quis quam. Dolorum et ut quod quia. Voluptas numquam delectus nihil. Aut enim doloremque et ipsam.",
      //   author: {
      //     name: "Leslie Alexander",
      //     handle: "lesliealexander",
      //     imageUrl:
      //       "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      //   },
      // },
      // More testimonials...
    ],
    // column 2 bottom left
    [
      {
        body: "The detailed activity charts show exactly when I get the most matches. I adjusted my active hours based on the data and saw immediate improvement.",
        author: {
          name: "Male, 26",
          handle: "Sydney, Australia",
          imageUrl: "/images/marketing/testimonials/m26.jpeg",
        },
      },
      // {
      //   body: "As a data nerd, I appreciate the depth of analysis SwipeStats.io offers. It's not just about increasing matches but understanding the dynamics of online dating. This platform has been incredibly enlightening and fun to use.",
      //   author: {
      //     name: "Female, 31",
      //     handle: "Toronto, Canada",
      //     imageUrl:
      //       "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      //   },
      // },
      // More testimonials...
    ],
  ],
  [
    // column 3 bottom right
    [
      {
        body: "Comparing my stats to the profile directory benchmarks helped me set realistic goals. Now I can see where I stand and what to improve.",
        author: {
          name: "Male, 31",
          handle: "Tirana, Albania",
          imageUrl: "/images/marketing/testimonials/m37.jpeg",
        },
      },
      // {
      //   body: "I was amazed by how detailed and actionable the advice from SwipeStats.io was. From profile picture nuances to bio suggestions, it's been invaluable. My success rate has improved noticeably since I started using it.",
      //   author: {
      //     name: "Female, 25",
      //     handle: "Cape Town, South Africa",
      //     imageUrl:
      //       "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      //   },
      // },
      // More testimonials...
    ],
    // column 4 right
    [
      {
        body: "The insights dashboard breaks down everything - swipe rates, match rates, messaging patterns. Finally understand what's working and what's not. The time-based analysis is incredibly valuable.",
        author: {
          name: "Male, 28",
          handle: "São Paulo, Brazil",
          imageUrl: "/images/marketing/testimonials/m32.jpeg",
        },
      },
      // {
      //   body: "Using SwipeStats.io feels like unlocking a secret layer of the online dating world. The platform’s insightful analytics have demystified the patterns behind successful profiles, guiding me to adapt mine with strategies I never would have thought of. The result? A significant boost in quality matches and interactions that feel more aligned with what I’m looking for. SwipeStats.io doesn’t just play the numbers game; it elevates your dating profile to resonate with your ideal matches.",
      //   author: {
      //     name: "Male, 24",
      //     handle: "Tokyo, Japan",
      //     imageUrl:
      //       "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      //   },
      // },
      {
        body: "Love the profile comparison feature! Tested different photo orders across apps and could see which setup got more matches. Made optimization so much easier.",
        author: {
          name: "Female, 25",
          handle: "Cape Town, South Africa",
          imageUrl: "/images/marketing/testimonials/f25.jpeg",
        },
      },

      // More testimonials...
    ],
  ],
];

export default function Testimonials() {
  return (
    <div className="relative isolate bg-white pt-32 pb-32" id="testimonials">
      <div
        className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-30 blur-3xl"
        aria-hidden="true"
      >
        <div
          className="ml-[max(50%,38rem)] aspect-[1313/771] w-[82.0625rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
      <div
        className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden pt-32 opacity-25 blur-3xl sm:pt-40 xl:justify-end"
        aria-hidden="true"
      >
        <div
          className="ml-[-22rem] aspect-[1313/771] w-[82.0625rem] flex-none origin-top-right rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] xl:mr-[calc(50%-12rem)] xl:ml-0"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg leading-8 font-semibold tracking-tight text-rose-600">
            Testimonials
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            We have worked with thousands of amazing people
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 grid-rows-1 gap-8 text-sm leading-6 text-gray-900 sm:mt-20 sm:grid-cols-2 xl:mx-0 xl:max-w-none xl:grid-flow-col xl:grid-cols-4">
          <figure className="rounded-2xl bg-white shadow-lg ring-1 ring-gray-900/5 sm:col-span-2 xl:col-start-2 xl:row-end-1">
            <blockquote className="p-6 text-lg leading-7 font-semibold tracking-tight text-gray-900 sm:p-12 sm:text-xl sm:leading-8">
              <p>{`“${featuredTestimonial.body}”`}</p>
            </blockquote>
            <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-4 border-t border-gray-900/10 px-6 py-4 sm:flex-nowrap">
              <img
                className="h-10 w-10 flex-none rounded-full bg-gray-50"
                src={featuredTestimonial.author.imageUrl}
                alt=""
              />
              <div className="flex-auto">
                <div className="font-semibold">
                  {featuredTestimonial.author.name}
                </div>
                <div className="text-gray-600">{`@${featuredTestimonial.author.handle}`}</div>
              </div>
              <img
                className="h-10 w-auto flex-none"
                src={featuredTestimonial.author.logoUrl}
                alt=""
              />
            </figcaption>
          </figure>
          {testimonials.map((columnGroup, columnGroupIdx) => (
            <div
              key={columnGroupIdx}
              className="space-y-8 xl:contents xl:space-y-0"
            >
              {columnGroup.map((column, columnIdx) => (
                <div
                  key={columnIdx}
                  className={cn(
                    (columnGroupIdx === 0 && columnIdx === 0) ||
                      (columnGroupIdx === testimonials.length - 1 &&
                        columnIdx === columnGroup.length - 1)
                      ? "xl:row-span-2"
                      : "xl:row-start-1",
                    "space-y-8",
                  )}
                >
                  {column.map((testimonial) => (
                    <figure
                      key={testimonial.author.handle}
                      className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5"
                    >
                      <blockquote className="text-gray-900">
                        <p>{`“${testimonial.body}”`}</p>
                      </blockquote>
                      <figcaption className="mt-6 flex items-center gap-x-4">
                        <img
                          className="h-10 w-10 rounded-full bg-gray-50"
                          src={testimonial.author.imageUrl}
                          alt=""
                        />
                        <div>
                          <div className="font-semibold">
                            {testimonial.author.name}
                          </div>
                          <div className="text-gray-600">{`@${testimonial.author.handle}`}</div>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
