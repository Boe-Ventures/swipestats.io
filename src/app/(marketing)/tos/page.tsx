import type { Metadata } from "next";
import { SmartLink } from "@/components/ui/smart-link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for SwipeStats. Learn about data usage, payments, refunds, and your rights when using our dating app analytics platform.",
  alternates: {
    canonical: "/tos",
  },
};

export default function TosPage() {
  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[37.5rem] pt-20 pb-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Last updated February 2026
          </p>
        </div>
      </div>
      <div className="prose lg:prose-xl mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2>The short version</h2>
        <p>
          SwipeStats helps you understand your dating app data. Here&apos;s the
          deal:
        </p>
        <ul>
          <li>You upload your own data — never someone else&apos;s</li>
          <li>
            You own your raw data; we can use anonymized versions of it for
            research
          </li>
          <li>
            We sell anonymized research datasets — you can opt out of future
            ones
          </li>
          <li>Payments are handled by LemonSqueezy (a Stripe company)</li>
          <li>Norwegian law applies; disputes go to Oslo courts</li>
        </ul>
        <p>Now, the full terms:</p>

        <h2>1. Agreement to Terms</h2>
        <p>
          By using SwipeStats.io (operated by Boe Ventures AS, Norway) and its
          related services, you agree to these Terms and our{" "}
          <SmartLink href="/privacy">Privacy Policy</SmartLink>. If you
          don&apos;t agree, don&apos;t use the service.
        </p>

        <h2>2. What SwipeStats does</h2>
        <p>SwipeStats is a dating app analytics platform. You can:</p>
        <ul>
          <li>
            Upload and analyze data exports from Tinder, Hinge, and other
            supported platforms
          </li>
          <li>
            Get visualizations and insights about your dating app activity
          </li>
          <li>
            See statistics like match rates, swipe patterns, and comparative
            benchmarks
          </li>
          <li>Access premium features through paid plans</li>
        </ul>
        <p>
          We also run a research data business — we provide anonymized,
          aggregated datasets to researchers, journalists, and commercial
          partners. More on that in Section 5.
        </p>
        <p>
          <strong>Important:</strong> SwipeStats is not affiliated with Tinder,
          Hinge, Bumble, or any dating platform. Tinder® and Hinge® are
          trademarks of Match Group, LLC. Bumble® is a trademark of Bumble
          Holding Limited.
        </p>
        <p>
          We do our best to keep the service running, but we can&apos;t
          guarantee 100% uptime. We may modify, suspend, or discontinue parts of
          the service at any time.
        </p>

        <h2>3. Who can use SwipeStats?</h2>
        <p>To use SwipeStats, you must:</p>
        <ul>
          <li>Be at least 18 years old</li>
          <li>Have the legal capacity to agree to these terms</li>
          <li>
            Only upload your own dating app data (obtained through official data
            export features)
          </li>
        </ul>
        <p>
          When you create an account, you&apos;re responsible for keeping your
          password secure and for all activity under your account. If you think
          your account has been compromised, email us immediately at{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          .
        </p>

        <h2>4. What you can and can&apos;t do</h2>

        <h3>You can:</h3>
        <ul>
          <li>Use the service for personal, non-commercial purposes</li>
          <li>Download your own analytics and visualizations</li>
          <li>Share your visualizations via our sharing features</li>
        </ul>

        <h3>You can&apos;t:</h3>
        <ul>
          <li>Upload data that isn&apos;t yours</li>
          <li>Upload manipulated, falsified, or AI-generated data</li>
          <li>Try to re-identify people from anonymized datasets</li>
          <li>
            Resell, redistribute, or commercialize the service or its data
          </li>
          <li>Use the service to build competing products</li>
          <li>
            Scrape, bot, or access the service through unauthorized automated
            means
          </li>
          <li>Reverse engineer or decompile the software</li>
          <li>
            Interfere with security features or overload our infrastructure
          </li>
          <li>Use the service for anything illegal</li>
          <li>Impersonate others or collect other users&apos; information</li>
        </ul>
        <p>
          Breaking these rules may result in immediate account termination and
          potentially legal action.
        </p>

        <h2>5. Your data and how we use it</h2>

        <h3>You own your data</h3>
        <p>
          You retain ownership of the raw dating app data you upload to
          SwipeStats.
        </p>

        <h3>License for providing the service (revocable)</h3>
        <p>
          By uploading data, you give us a non-exclusive, worldwide license to
          store, process, and analyze your data to provide you with analytics.
          This license ends when you delete your data or close your account.
        </p>

        <h3>License for anonymized data (permanent)</h3>
        <p>
          <strong>This is important — please read carefully.</strong>
        </p>
        <p>
          By uploading data, you also give us a permanent, worldwide,
          royalty-free license to:
        </p>
        <ol>
          <li>
            Create anonymized and aggregated versions of your data by removing
            all personally identifiable information
          </li>
          <li>
            Use, publish, distribute, and commercialize those anonymized
            derivatives
          </li>
          <li>
            Sell or license anonymized datasets to researchers, journalists, and
            commercial partners
          </li>
          <li>
            Publish statistical analyses and research findings derived from
            anonymized data
          </li>
        </ol>
        <p>This means:</p>
        <ul>
          <li>Once anonymized, the data can&apos;t be traced back to you</li>
          <li>
            Anonymized data may be kept forever, even after you delete your
            account
          </li>
          <li>You won&apos;t be compensated for anonymized data</li>
          <li>
            You can&apos;t withdraw this license for data already anonymized
          </li>
        </ul>

        <h3>Can I opt out?</h3>
        <p>
          Yes — you can opt out of having your data included in <em>future</em>{" "}
          anonymized research datasets through your account settings or by
          emailing{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          . This doesn&apos;t affect data already anonymized.
        </p>

        <h3>Your promises about the data you upload</h3>
        <p>By uploading data, you confirm that:</p>
        <ul>
          <li>It&apos;s your data, from your own dating app account</li>
          <li>
            You got it through legitimate means (the app&apos;s official data
            export)
          </li>
          <li>It doesn&apos;t belong to anyone else</li>
          <li>You have the right to grant us the licenses described above</li>
        </ul>

        <h2>6. Social sharing</h2>
        <p>If you share visualizations publicly:</p>
        <ul>
          <li>
            <strong>Don&apos;t share</strong> anything containing identifiable
            info (names, photos, Instagram handles, contact details) about
            yourself or others
          </li>
          <li>You&apos;re responsible for what you share</li>
          <li>
            You give us a royalty-free license to use publicly shared
            visualizations and testimonials for marketing purposes
          </li>
        </ul>

        <h2>7. Payments and subscriptions</h2>

        <h3>Pricing</h3>
        <p>
          We offer various pricing options including free, one-time purchase,
          monthly/annual subscriptions, and lifetime premium. Current pricing is
          on our website and may change.
        </p>

        <h3>How payments work</h3>
        <p>
          Payments are processed by LemonSqueezy (a Stripe company), our
          merchant of record. By purchasing, you agree to their terms. We accept
          major credit cards and other methods shown at checkout. Prices include
          applicable taxes where required.
        </p>

        <h3>Subscriptions auto-renew</h3>
        <p>
          Subscriptions renew automatically unless you cancel before the renewal
          date. You can cancel anytime through your account settings or by
          emailing{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          . You keep access until the end of your paid period.
        </p>

        <h3>Price changes</h3>
        <p>
          If we raise prices, existing subscribers get at least 30 days&apos;
          notice. The new price applies at your next renewal. You can cancel
          before it takes effect.
        </p>

        <h2>8. Refunds</h2>

        <h3>EU/EEA users: digital content exception</h3>
        <p>
          Under the EU Consumer Rights Directive (2011/83/EU) as implemented in
          Norwegian law, the 14-day withdrawal right does not apply to digital
          content where you&apos;ve consented to immediate delivery and
          acknowledged losing the withdrawal right. By completing your purchase,
          you do both.
        </p>

        <h3>Our voluntary refund policy</h3>
        <p>
          We may still offer refunds at our discretion — for example, if
          technical issues prevent you from using the service. To request one,
          email{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>{" "}
          with your order number and reason. We&apos;ll respond within 14
          business days. Approved refunds go back to your original payment
          method within 10 business days.
        </p>
        <p>
          Generally non-refundable: services already rendered, analysis already
          performed, and partially used subscription periods.
        </p>

        <h2>9. Intellectual property</h2>
        <p>
          SwipeStats owns the platform, software, algorithms, branding, design,
          and all content we create (excluding what you upload). Aggregate
          statistics and research from anonymized data are ours too.
        </p>
        <p>
          If you give us feedback or suggestions, we can use them freely without
          compensation or attribution.
        </p>

        <h2>10. Disclaimers</h2>
        <p>
          The service is provided <strong>&quot;as is.&quot;</strong> We
          don&apos;t guarantee that:
        </p>
        <ul>
          <li>Our analytics are 100% accurate</li>
          <li>The service will be uninterrupted or error-free</li>
          <li>Our benchmarks represent all dating app users</li>
          <li>Our insights will improve your dating life</li>
        </ul>
        <p>
          We rely on data exports from third-party dating platforms. We&apos;re
          not responsible for their accuracy, format changes, or if they
          discontinue exports.
        </p>
        <p>
          <strong>This is not relationship advice.</strong> SwipeStats provides
          informational analytics only — not professional counseling or
          guidance.
        </p>
        <p>
          You&apos;re responsible for verifying your own data, any decisions you
          make based on our analytics, and backing up your data.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SWIPESTATS IS NOT LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
          — INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR COST OF SUBSTITUTE
          SERVICES.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ALL CLAIMS IS LIMITED TO THE GREATER OF: (A)
          WHAT YOU PAID US IN THE PAST 12 MONTHS, OR (B) $100 USD.
        </p>
        <p>
          These limits don&apos;t apply to liability for death or personal
          injury caused by negligence, fraud, or anything else that can&apos;t
          be excluded by law. Some jurisdictions don&apos;t allow these
          limitations — in that case, our liability is limited to the greatest
          extent the law allows.
        </p>

        <h2>12. Indemnification</h2>
        <p>
          You agree to defend and hold harmless SwipeStats and its team from any
          claims, damages, or expenses arising from your use of the service,
          violation of these terms, violation of third-party rights, or data you
          upload.
        </p>

        <h2>13. Termination</h2>
        <p>
          <strong>You</strong> can close your account anytime through account
          settings or by emailing{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          .
        </p>
        <p>
          <strong>We</strong> can suspend or terminate your account if you
          violate these terms, if required by law, if we believe your conduct
          could cause harm, or if we discontinue the service.
        </p>
        <p>When your account is terminated:</p>
        <ul>
          <li>Your access to the service ends immediately</li>
          <li>
            Your personal data is deleted per our{" "}
            <SmartLink href="/privacy">Privacy Policy</SmartLink>
          </li>
          <li>Anonymized data derived from your account is retained</li>
          <li>
            No refund for unused subscription time (except as required by law)
          </li>
        </ul>
        <p>
          Sections that survive termination: Your Data (Section 5), Intellectual
          Property (Section 9), Disclaimers (Section 10), Liability (Section
          11), Indemnification (Section 12), and Governing Law (Section 14).
        </p>

        <h2>14. Governing law and disputes</h2>
        <p>
          These terms are governed by Norwegian law. Disputes go to the courts
          of Oslo, Norway.
        </p>
        <p>
          <strong>If you&apos;re in the EU/EEA:</strong> Nothing in these terms
          overrides your mandatory consumer protection rights. You can also use
          the European Commission&apos;s{" "}
          <SmartLink href="https://ec.europa.eu/consumers/odr">
            online dispute resolution platform
          </SmartLink>
          . Our email for ODR purposes:{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          .
        </p>

        <h2>15. Changes to these terms</h2>
        <p>
          <strong>Small changes:</strong> We&apos;ll update the date at the top.
        </p>
        <p>
          <strong>Big changes:</strong> We&apos;ll email you and post a notice
          at least 30 days before they take effect. If you keep using SwipeStats
          after that, you&apos;re accepting the new terms.
        </p>

        <h2>16. General</h2>
        <p>
          These Terms plus our{" "}
          <SmartLink href="/privacy">Privacy Policy</SmartLink> are the entire
          agreement between us. If any part is found unenforceable, the rest
          still applies. Our failure to enforce a right doesn&apos;t waive it.
          You can&apos;t transfer your rights under these terms; we can.
          We&apos;re not liable for delays caused by events beyond our control.
        </p>

        <h2>17. Contact</h2>
        <p>
          <strong>Email:</strong>{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
        </p>
        <p>
          <strong>For faster routing, use these subject lines:</strong>
        </p>
        <ul>
          <li>&quot;Legal Inquiry&quot; for legal matters</li>
          <li>&quot;Privacy Rights Request&quot; for data requests</li>
          <li>&quot;Support Request&quot; for general help</li>
          <li>&quot;Security Issue&quot; for security concerns</li>
        </ul>
        <p>
          <strong>Mail:</strong>
          <br />
          Boe Ventures AS
          <br />
          Norway
        </p>
        <p>We aim to respond within 5 business days.</p>

        <p className="mt-8 text-sm text-gray-600">
          These Terms of Service were last updated in February 2026.
        </p>
      </div>
    </div>
  );
}
