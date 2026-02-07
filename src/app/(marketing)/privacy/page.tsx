import type { Metadata } from "next";
import { SmartLink } from "@/components/ui/smart-link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how SwipeStats handles your dating app data. We strip personal identifiers, never sell personal data, and our extraction code is open source.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[37.5rem] pt-20 pb-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Last updated February 2026
          </p>
        </div>
      </div>
      <div className="prose lg:prose-xl mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2>The short version</h2>
        <p>
          We know dating data is personal. Here&apos;s what you need to know
          upfront:
        </p>
        <ul>
          <li>
            <strong>
              We strip your name, email, phone number, and username
            </strong>{" "}
            from your dating app data before storing it
          </li>
          <li>
            <strong>We do store your photos</strong> anonymously (not linked to
            your name or contact info) to power features like profile
            comparisons
          </li>
          <li>
            We never sell your personal data — only anonymized, aggregated
            research datasets
          </li>
          <li>
            Our data extraction code is{" "}
            <SmartLink href="https://github.com/Boe-Ventures/swipestats.io/blob/main/src/lib/upload/extract-tinder-data.ts">
              open source
            </SmartLink>{" "}
            — you can see exactly what we strip and what we keep
          </li>
          <li>You can delete your data at any time</li>
        </ul>
        <p>Now, here&apos;s the full policy:</p>

        <h2>1. Who are we?</h2>
        <p>
          SwipeStats.io is operated by Boe Ventures AS, a Norwegian company.
          We&apos;re a dating app analytics platform that helps you understand
          your Tinder and Hinge data. For data protection purposes, we are the
          &quot;data controller&quot; of your personal data.
        </p>
        <p>
          <strong>Contact:</strong>
          <br />
          Boe Ventures AS
          <br />
          Norway
          <br />
          Email:{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>{" "}
          (for all inquiries including privacy, security, and support)
        </p>

        <h2>2. What information do we collect?</h2>

        <h3>Information you give us directly</h3>
        <p>
          <strong>Account info:</strong> Your email address, password (stored
          encrypted), and username.
        </p>

        <p>
          <strong>Dating app data you upload:</strong>
        </p>
        <p>
          When you upload a data export from Tinder or Hinge, we process the
          full file but{" "}
          <strong>immediately strip personally identifiable information</strong>{" "}
          before storing anything. Here&apos;s exactly what happens:
        </p>

        <p>
          <strong>For Tinder uploads, we remove:</strong>
        </p>
        <ul>
          <li>Your name, email, username, and phone ID</li>
          <li>Authentication IDs</li>
          <li>
            Instagram and Spotify details (we only keep a yes/no for whether
            they were connected)
          </li>
        </ul>

        <p>
          <strong>For Tinder uploads, we keep:</strong>
        </p>
        <ul>
          <li>Birth date, gender, and gender preferences</li>
          <li>Age filter settings</li>
          <li>Account creation date</li>
          <li>
            Daily usage stats (app opens, swipes, matches, messages
            sent/received)
          </li>
          <li>Match and conversation metadata</li>
          <li>Photos</li>
        </ul>

        <p>
          <strong>For Hinge uploads, we remove:</strong>
        </p>
        <ul>
          <li>First name and last name</li>
          <li>Email, phone number, and phone carrier</li>
          <li>IP addresses, device IDs, and advertising identifiers</li>
          <li>User agent strings</li>
        </ul>

        <p>
          <strong>For Hinge uploads, we keep:</strong>
        </p>
        <ul>
          <li>Age, preferences, and dating intent</li>
          <li>Account signup date</li>
          <li>Country-level location (not city or address)</li>
          <li>Match and conversation data</li>
          <li>Prompts and media</li>
          <li>Device type (not device ID)</li>
        </ul>

        <p>
          We generate a unique, hashed profile ID from your birth date and
          account creation date — this means your profile can&apos;t be linked
          back to your real identity.
        </p>
        <p>
          Want to verify this yourself? Our extraction code is{" "}
          <SmartLink href="https://github.com/Boe-Ventures/swipestats.io/blob/main/src/lib/upload/extract-tinder-data.ts">
            open source on GitHub
          </SmartLink>
          .
        </p>

        <p>
          <strong>Payment info:</strong> Card details are processed by
          LemonSqueezy (a Stripe company) — we never see or store your full card
          number. We keep billing address and transaction history.
        </p>

        <p>
          <strong>Communications:</strong> Support emails, feedback, and your
          marketing preferences.
        </p>

        <h3>Information we collect automatically</h3>
        <p>When you use our site, we automatically collect:</p>
        <ul>
          <li>
            <strong>Device info:</strong> Browser type, operating system, device
            type, screen resolution
          </li>
          <li>
            <strong>Usage info:</strong> Pages viewed, features used, time on
            page, clicks
          </li>
          <li>
            <strong>Network info:</strong> IP address, approximate location
            (country/region level), referring website
          </li>
        </ul>

        <h3>Information from third parties</h3>
        <ul>
          <li>
            <strong>PostHog:</strong> Aggregated analytics data
          </li>
          <li>
            <strong>LemonSqueezy:</strong> Payment transaction confirmations
          </li>
        </ul>

        <h3>What if I don&apos;t want to provide information?</h3>
        <p>
          You can browse our public website without providing any personal
          information. To use our analytics features, you&apos;ll need to create
          an account and upload dating app data.
        </p>

        <h2>3. What about sensitive data in dating profiles?</h2>

        <p>
          We know dating app data can be especially sensitive. Your gender
          preferences may reveal your sexual orientation. Your profile might
          mention your religion, health status, or ethnicity. Under GDPR, this
          is called &quot;special category data&quot; (Article 9) and gets extra
          protection.
        </p>

        <p>
          <strong>How we handle it:</strong> We process this data based on your
          explicit consent, which you give when you upload your data and accept
          our terms. You can withdraw that consent anytime by deleting your data
          or contacting us at{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          .
        </p>
        <p>
          Withdrawing consent doesn&apos;t affect anything we did before you
          withdrew it. And data that&apos;s already been anonymized into
          aggregate research can&apos;t be deleted — because it&apos;s no longer
          linked to you in any way.
        </p>

        <h2>4. How do we use your information?</h2>
        <table>
          <thead>
            <tr>
              <th>What we do</th>
              <th>Why we&apos;re allowed to (GDPR legal basis)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Show you analytics and visualizations</td>
              <td>Contract performance (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Manage your account</td>
              <td>Contract performance (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Process payments</td>
              <td>Contract performance (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Create anonymized research datasets</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr>
              <td>Improve the product</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr>
              <td>Keep the service secure</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr>
              <td>Send you marketing emails</td>
              <td>Your consent (Art. 6(1)(a))</td>
            </tr>
            <tr>
              <td>Comply with the law</td>
              <td>Legal obligation (Art. 6(1)(c))</td>
            </tr>
            <tr>
              <td>Process sensitive dating data</td>
              <td>Your explicit consent (Art. 9(2)(a))</td>
            </tr>
          </tbody>
        </table>
        <p>
          When we rely on &quot;legitimate interest,&quot; we&apos;ve done
          balancing tests to make sure our interests don&apos;t override your
          rights. You can ask us for details anytime.
        </p>

        <h2>5. How does anonymization work?</h2>

        <h3>Why we anonymize data</h3>
        <p>
          SwipeStats runs a research data business. We create anonymized,
          aggregated datasets used by academic researchers, universities,
          journalists, content creators, and commercial research partners.
        </p>

        <h3>What &quot;anonymized&quot; actually means</h3>
        <p>We remove or generalize data so it can&apos;t identify you:</p>
        <ul>
          <li>
            <strong>Direct identifiers removed:</strong> Names, usernames,
            contact info, exact locations
          </li>
          <li>
            <strong>Data aggregated:</strong> Combined across many users so
            individual patterns disappear
          </li>
          <li>
            <strong>Small groups protected:</strong> We don&apos;t release
            statistics based on tiny sample sizes
          </li>
          <li>
            <strong>Values generalized:</strong> Specific numbers become ranges
          </li>
          <li>
            <strong>Quasi-identifiers removed:</strong> Unusual combinations
            that could narrow down who you are
          </li>
        </ul>
        <p>
          Our anonymization meets the GDPR Recital 26 standard — the data
          &quot;does not relate to an identified or identifiable natural
          person.&quot;
        </p>

        <h3>What this means for you</h3>
        <p>Once data is anonymized:</p>
        <ul>
          <li>It&apos;s no longer &quot;personal data&quot; under the law</li>
          <li>It can be kept indefinitely</li>
          <li>
            It can&apos;t be deleted on request (because we genuinely can&apos;t
            figure out which bits were yours)
          </li>
          <li>You won&apos;t receive compensation for its use</li>
        </ul>

        <h3>Can I opt out of the research data?</h3>
        <p>
          Yes. You can opt out of having your data included in <em>future</em>{" "}
          anonymized research datasets through your account settings, or by
          emailing{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          . This won&apos;t affect data already anonymized and published.
        </p>

        <h2>6. Who do we share your information with?</h2>

        <h3>Our service providers</h3>
        <table>
          <thead>
            <tr>
              <th>Who</th>
              <th>What they get</th>
              <th>Why</th>
              <th>Safeguards</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel</td>
              <td>Application data</td>
              <td>Cloud hosting</td>
              <td>SOC 2, ISO 27001 certified, DPA</td>
            </tr>
            <tr>
              <td>Neon</td>
              <td>Database content</td>
              <td>PostgreSQL hosting</td>
              <td>Encryption at rest and in transit, DPA</td>
            </tr>
            <tr>
              <td>LemonSqueezy (Stripe)</td>
              <td>Payment info</td>
              <td>Payment processing</td>
              <td>PCI DSS compliant, EU-US DPF</td>
            </tr>
            <tr>
              <td>PostHog</td>
              <td>Usage analytics, session replays</td>
              <td>Product analytics and debugging</td>
              <td>Data anonymization, DPA</td>
            </tr>
            <tr>
              <td>Research partners</td>
              <td>Anonymized data only</td>
              <td>Research datasets</td>
              <td>Robust anonymization per Section 5</td>
            </tr>
          </tbody>
        </table>

        <h3>Do you sell my personal data?</h3>
        <p>
          <strong>No.</strong> We do not sell your personal data as defined by
          GDPR, CCPA, or any similar law. The anonymized datasets we license to
          researchers are not personal data.
        </p>

        <h3>When might you disclose my information?</h3>
        <p>Only when required to:</p>
        <ul>
          <li>Comply with legal obligations</li>
          <li>Respond to lawful requests from authorities</li>
          <li>Protect our rights, safety, or property</li>
          <li>Enforce our Terms of Service</li>
        </ul>

        <h3>What if SwipeStats gets acquired?</h3>
        <p>
          If we&apos;re involved in a merger, acquisition, or sale of assets,
          your information may be transferred. We&apos;ll notify you before your
          data becomes subject to a different privacy policy.
        </p>

        <h2>7. Where is my data stored?</h2>

        <p>
          SwipeStats is based in Norway (part of the EEA). Your data may also be
          processed in:
        </p>
        <ul>
          <li>
            <strong>European Union:</strong> Cloud infrastructure
          </li>
          <li>
            <strong>United States:</strong> Vercel, Neon, PostHog, LemonSqueezy
          </li>
        </ul>

        <p>For transfers outside the EEA, we use:</p>
        <ul>
          <li>EU-US Data Privacy Framework (our US providers are certified)</li>
          <li>Standard Contractual Clauses where the DPF doesn&apos;t apply</li>
          <li>Additional technical measures where necessary</li>
        </ul>
        <p>
          Want details? Email{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>{" "}
          and we&apos;ll send you a copy of our transfer safeguards.
        </p>

        <h2>8. How long do you keep my data?</h2>
        <table>
          <thead>
            <tr>
              <th>Data type</th>
              <th>How long we keep it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account information</td>
              <td>Until you delete your account</td>
            </tr>
            <tr>
              <td>Uploaded dating app data</td>
              <td>Until you delete it or close your account</td>
            </tr>
            <tr>
              <td>Payment records</td>
              <td>As required by Norwegian accounting law</td>
            </tr>
            <tr>
              <td>Analytics and usage data</td>
              <td>As long as necessary for business purposes</td>
            </tr>
            <tr>
              <td>Support communications</td>
              <td>As long as necessary for business purposes</td>
            </tr>
            <tr>
              <td>Anonymized research data</td>
              <td>Indefinitely (no longer personal data)</td>
            </tr>
            <tr>
              <td>Backup copies</td>
              <td>Automatically deleted after a reasonable period</td>
            </tr>
          </tbody>
        </table>

        <p>
          <strong>When you delete your account:</strong>
        </p>
        <ul>
          <li>
            Personal data is removed from our active systems within a reasonable
            timeframe
          </li>
          <li>Backups are purged on a regular schedule</li>
          <li>
            Anonymized data stays — because it&apos;s no longer linked to you
          </li>
        </ul>

        <h2>9. What are my privacy rights?</h2>

        <h3>Rights for everyone</h3>
        <p>No matter where you live, you can:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Ask us to correct inaccurate data</li>
          <li>Delete your account and data</li>
          <li>Opt out of marketing emails</li>
        </ul>

        <h3>Additional rights for EEA/UK residents (GDPR)</h3>
        <table>
          <thead>
            <tr>
              <th>Right</th>
              <th>What it means</th>
              <th>How to use it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Access (Art. 15)</td>
              <td>Get a copy of your personal data</td>
              <td>Email us or use account export</td>
            </tr>
            <tr>
              <td>Rectification (Art. 16)</td>
              <td>Fix inaccurate data</td>
              <td>Account settings or email us</td>
            </tr>
            <tr>
              <td>Erasure (Art. 17)</td>
              <td>Delete your data</td>
              <td>Delete account in settings or email us</td>
            </tr>
            <tr>
              <td>Restriction (Art. 18)</td>
              <td>Limit how we process your data</td>
              <td>Email us</td>
            </tr>
            <tr>
              <td>Portability (Art. 20)</td>
              <td>Get your data in a machine-readable format</td>
              <td>Use account export</td>
            </tr>
            <tr>
              <td>Object (Art. 21)</td>
              <td>Object to legitimate interest processing</td>
              <td>Email us</td>
            </tr>
            <tr>
              <td>Withdraw consent (Art. 7)</td>
              <td>Take back consent you gave us</td>
              <td>Account settings or email us</td>
            </tr>
            <tr>
              <td>Complaint</td>
              <td>Complain to a supervisory authority</td>
              <td>Contact Datatilsynet (see below)</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Norwegian supervisory authority:</strong>
          <br />
          Datatilsynet
          <br />
          Postboks 458 Sentrum
          <br />
          0105 Oslo, Norway
          <br />
          <SmartLink href="https://www.datatilsynet.no">
            https://www.datatilsynet.no
          </SmartLink>
        </p>

        <h3>Additional rights for California residents (CCPA/CPRA)</h3>
        <p>If you&apos;re in California, you also have the right to:</p>
        <ul>
          <li>
            <strong>Know</strong> what personal information we collect, where it
            comes from, and who we share it with
          </li>
          <li>
            <strong>Delete</strong> your personal information (with some
            exceptions)
          </li>
          <li>
            <strong>Correct</strong> inaccurate personal information
          </li>
          <li>
            <strong>Opt out of sale/sharing</strong> — we don&apos;t sell
            personal info or share it for behavioral advertising, so this
            doesn&apos;t apply
          </li>
          <li>
            <strong>Limit sensitive info use</strong> — you can restrict how we
            use sensitive personal information
          </li>
          <li>
            <strong>Non-discrimination</strong> — we won&apos;t treat you
            differently for exercising your rights
          </li>
        </ul>
        <p>
          To exercise your California rights, email{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>{" "}
          with the subject line &quot;California Privacy Rights Request.&quot;
        </p>

        <h3>How quickly will you respond?</h3>
        <ul>
          <li>GDPR requests: Within 30 days (up to 90 for complex requests)</li>
          <li>CCPA requests: Within 45 days (up to 90 with notice)</li>
        </ul>

        <h2>10. What about cookies?</h2>

        <h3>What cookies do we use?</h3>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Purpose</th>
              <th>Do we need your consent?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Strictly necessary</td>
              <td>Site functionality, security, keeping you logged in</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Analytics</td>
              <td>Understanding how people use the site</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Functional</td>
              <td>Remembering your preferences</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Marketing</td>
              <td>Measuring ad effectiveness (if applicable)</td>
              <td>Yes</td>
            </tr>
          </tbody>
        </table>

        <h3>How does consent work?</h3>
        <p>
          <strong>If you&apos;re just browsing:</strong> We ask for explicit
          consent before setting non-essential cookies.
        </p>
        <p>
          <strong>If you create an account</strong> (including anonymous
          accounts): Analytics tracking is enabled under legitimate interest
          (GDPR Art. 6(1)(f)) to improve service quality, prevent fraud, and
          guide feature development.
        </p>
        <p>
          <strong>Session replays:</strong> We use session replays (via PostHog)
          to debug issues and improve the experience. These are enabled for all
          account holders. You can request deletion of your recordings anytime.
        </p>

        <h3>How can I manage cookies?</h3>
        <ul>
          <li>Through our website cookie settings (if available)</li>
          <li>
            Through your browser settings — most browsers let you block or
            delete cookies
          </li>
        </ul>

        <h3>Do you respond to &quot;Do Not Track&quot; signals?</h3>
        <p>
          Currently no, as there&apos;s no industry standard. We&apos;ll update
          this if a standard is adopted.
        </p>

        <h2>11. How do you keep my data safe?</h2>

        <h3>Technical measures</h3>
        <ul>
          <li>Encryption in transit (TLS 1.2+)</li>
          <li>Encryption at rest (AES-256)</li>
          <li>Access controls and authentication</li>
          <li>Regular security assessments</li>
          <li>Automated threat detection</li>
        </ul>

        <h3>Organizational measures</h3>
        <ul>
          <li>Staff training on data protection</li>
          <li>Access limited to need-to-know basis</li>
          <li>Confidentiality agreements</li>
          <li>Incident response procedures</li>
          <li>Regular policy reviews</li>
        </ul>

        <h3>What&apos;s your part?</h3>
        <p>
          You&apos;re responsible for keeping your login credentials secure,
          using a strong password, not sharing your account, and logging out on
          shared devices.
        </p>
        <p>
          No system is 100% secure — we can&apos;t guarantee absolute security,
          but we take it seriously.
        </p>

        <h2>12. What about children?</h2>
        <p>
          SwipeStats is not for anyone under 18. Dating apps require users to be
          at least 18, and so do we. We don&apos;t knowingly collect data from
          minors.
        </p>
        <p>
          If you believe we&apos;ve accidentally collected data from someone
          under 18, please contact us immediately at{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          .
        </p>

        <h2>13. What about links to other sites?</h2>
        <p>
          We may link to third-party sites. We&apos;re not responsible for their
          privacy practices — check their own policies.
        </p>

        <h2>14. What happens if there&apos;s a data breach?</h2>
        <p>If we experience a breach that puts your rights at risk:</p>
        <ul>
          <li>
            We&apos;ll notify the Norwegian Data Protection Authority
            (Datatilsynet) within 72 hours
          </li>
          <li>
            If the breach is high-risk for you personally, we&apos;ll notify you
            directly without undue delay
          </li>
          <li>
            We&apos;ll tell you what happened, the likely consequences, and what
            we&apos;re doing about it
          </li>
        </ul>

        <h2>15. Will this policy change?</h2>
        <p>
          <strong>Small changes:</strong> We&apos;ll update the &quot;Last
          Updated&quot; date at the top.
        </p>
        <p>
          <strong>Big changes:</strong> We&apos;ll email you and post a
          prominent notice on the site at least 30 days before changes take
          effect.
        </p>
        <p>
          If you keep using SwipeStats after changes take effect, that counts as
          acceptance of the updated policy.
        </p>

        <h2>16. How can I contact you?</h2>
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
          <li>
            &quot;Privacy Rights Request&quot; for data access or deletion
          </li>
          <li>&quot;Security Concern&quot; for security issues</li>
          <li>&quot;Support&quot; for general questions</li>
        </ul>
        <p>
          <strong>Mail:</strong>
          <br />
          Boe Ventures AS
          <br />
          Norway
        </p>
        <p>We aim to respond to all inquiries within 5 business days.</p>

        <p className="mt-8 text-sm text-gray-600">
          This Privacy Policy was last updated in February 2026.
        </p>
      </div>
    </div>
  );
}
