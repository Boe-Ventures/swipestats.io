import { SmartLink } from "@/components/ui/smart-link";

export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[37.5rem] pt-20 pb-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Last updated January 2026
          </p>
        </div>
      </div>
      <div className="prose lg:prose-xl mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2>1. Introduction</h2>
        <p>
          Welcome to SwipeStats.io (&quot;SwipeStats,&quot; &quot;Company,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We are committed
          to protecting your personal information and respecting your privacy
          rights. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your information when you use our website at{" "}
          <SmartLink href="https://swipestats.io">
            https://swipestats.io
          </SmartLink>{" "}
          and our related services (collectively, the &quot;Services&quot;).
        </p>
        <p>
          SwipeStats is a dating app analytics platform that allows users to
          upload and analyze their dating app data exports. We take your privacy
          seriously, especially given the sensitive nature of dating-related
          information.
        </p>
        <p>
          By accessing or using our Services, you acknowledge that you have
          read, understood, and agree to be bound by this Privacy Policy. If you
          do not agree, please do not access or use our Services.
        </p>

        <h2>2. Who We Are</h2>
        <p>
          SwipeStats.io is operated by Boe Ventures AS, a Norwegian company. For
          the purposes of data protection laws, we are the &quot;data
          controller&quot; of your personal data.
        </p>
        <p>
          <strong>Contact Information:</strong>
          <br />
          Company: Boe Ventures AS
          <br />
          Location: Norway
          <br />
          Email:{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>{" "}
          (for all inquiries including privacy, security, and support)
        </p>

        <h2>3. Information We Collect</h2>

        <h3>3.1 Information You Provide Directly</h3>
        <p>
          <strong>Account Information:</strong>
        </p>
        <ul>
          <li>Email address</li>
          <li>Password (stored in encrypted form)</li>
          <li>Username or display name</li>
        </ul>

        <p>
          <strong>Dating App Data You Upload:</strong>
        </p>
        <p>
          When you use our Services, you may upload data exports from dating
          apps including Tinder, Bumble, Hinge, and other supported platforms.
          This data may include:
        </p>
        <ul>
          <li>Profile information (name, bio, age, gender, education, job)</li>
          <li>Profile photos (optional)</li>
          <li>Match data (timestamps, counts)</li>
          <li>Swipe/like data (patterns, ratios)</li>
          <li>
            Message statistics (counts, conversation statistics—not message
            content)
          </li>
          <li>Usage statistics (app usage patterns, active periods)</li>
          <li>Geographic information (city, region)</li>
          <li>
            Preferences (gender preferences, distance, age range preferences)
          </li>
        </ul>

        <p>
          <strong>Payment Information:</strong>
        </p>
        <ul>
          <li>
            Payment card details (processed by LemonSqueezy—we do not store full
            card numbers)
          </li>
          <li>Billing address</li>
          <li>Transaction history</li>
        </ul>

        <p>
          <strong>Communications:</strong>
        </p>
        <ul>
          <li>Support inquiries</li>
          <li>Feedback and surveys</li>
          <li>Marketing preferences</li>
        </ul>

        <h3>3.2 Information Collected Automatically</h3>
        <p>When you access our Services, we automatically collect:</p>
        <ul>
          <li>
            <strong>Device Information:</strong> Browser type and version,
            operating system, device type, screen resolution
          </li>
          <li>
            <strong>Usage Information:</strong> Pages viewed, features used,
            time spent on pages, click patterns
          </li>
          <li>
            <strong>Network Information:</strong> IP address, approximate
            geographic location (country/region level), referring website
          </li>
        </ul>

        <h3>3.3 Information from Third Parties</h3>
        <ul>
          <li>
            <strong>Analytics Providers:</strong> Aggregated analytics data from
            services like PostHog
          </li>
          <li>
            <strong>Payment Processors:</strong> Transaction confirmation from
            LemonSqueezy
          </li>
        </ul>

        <h3>3.4 Information You Choose Not to Provide</h3>
        <p>
          You are not required to provide any personal information to browse our
          public website. However, to use our analytics services, you must
          create an account and upload dating app data.
        </p>

        <h2>4. Special Category Data</h2>

        <h3>4.1 Sensitive Information in Dating App Data</h3>
        <p>
          <strong>Important:</strong> Dating app data may reveal or allow
          inference of special category personal data as defined under GDPR
          Article 9 and similar laws. This includes:
        </p>
        <ul>
          <li>
            <strong>Sexual orientation:</strong> Your gender preferences in
            dating apps may reveal sexual orientation
          </li>
          <li>
            <strong>Religious beliefs:</strong> If mentioned in your profile or
            bio
          </li>
          <li>
            <strong>Health information:</strong> If disclosed in your profile
          </li>
          <li>
            <strong>Racial or ethnic origin:</strong> Potentially inferable from
            profile content
          </li>
        </ul>

        <h3>4.2 Legal Basis for Processing Special Category Data</h3>
        <p>
          We process special category data based on your explicit consent, which
          you provide when:
        </p>
        <ul>
          <li>Creating an account and accepting our Terms of Service</li>
          <li>Uploading your dating app data</li>
          <li>
            Specifically consenting at the point of upload through our consent
            mechanism
          </li>
        </ul>

        <h3>4.3 Withdrawing Consent</h3>
        <p>You may withdraw your consent at any time by:</p>
        <ul>
          <li>Deleting your uploaded data through your account settings</li>
          <li>Deleting your account entirely</li>
          <li>
            Contacting us at{" "}
            <SmartLink href="mailto:privacy@swipestats.io">
              privacy@swipestats.io
            </SmartLink>
          </li>
        </ul>
        <p>
          Withdrawal of consent does not affect the lawfulness of processing
          before withdrawal. Anonymized data already incorporated into aggregate
          research cannot be deleted as it no longer constitutes personal data.
        </p>

        <h2>5. How We Use Your Information</h2>
        <table>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Legal Basis (GDPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Provide analytics services</td>
              <td>Contract performance (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Create visualizations</td>
              <td>Contract performance (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Account management</td>
              <td>Contract performance (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Payment processing</td>
              <td>Contract performance (Art. 6(1)(b))</td>
            </tr>
            <tr>
              <td>Create anonymized research data</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr>
              <td>Service improvement</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr>
              <td>Security and fraud prevention</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr>
              <td>Marketing communications</td>
              <td>Consent (Art. 6(1)(a))</td>
            </tr>
            <tr>
              <td>Legal compliance</td>
              <td>Legal obligation (Art. 6(1)(c))</td>
            </tr>
            <tr>
              <td>Process special category data</td>
              <td>Explicit consent (Art. 9(2)(a))</td>
            </tr>
          </tbody>
        </table>
        <p>
          Where we rely on legitimate interests, we have conducted balancing
          tests to ensure our interests do not override your rights and
          freedoms. You may request details of these assessments by contacting
          us.
        </p>

        <h2>6. Anonymization and Research Data</h2>

        <h3>6.1 Our Research Data Business</h3>
        <p>
          SwipeStats operates a research data business. We create anonymized,
          aggregated datasets that are used by:
        </p>
        <ul>
          <li>Academic researchers</li>
          <li>Universities and research institutions</li>
          <li>Journalists and media organizations</li>
          <li>Content creators</li>
          <li>Commercial research partners</li>
        </ul>

        <h3>6.2 How We Anonymize Data</h3>
        <p>We implement robust anonymization processes including:</p>
        <p>
          <strong>Removal of Direct Identifiers:</strong>
        </p>
        <ul>
          <li>Names, profile photos, usernames</li>
          <li>Contact information</li>
          <li>Exact locations</li>
        </ul>
        <p>
          <strong>Technical Measures:</strong>
        </p>
        <ul>
          <li>Data aggregation (combining data from multiple users)</li>
          <li>
            Statistical thresholds (not releasing statistics based on small
            sample sizes)
          </li>
          <li>Generalization (converting specific values to ranges)</li>
          <li>Removal of quasi-identifiers</li>
        </ul>
        <p>
          <strong>Compliance Standard:</strong>
        </p>
        <p>
          Our anonymization meets the standard set by GDPR Recital 26, meaning
          the data &quot;does not relate to an identified or identifiable
          natural person.&quot;
        </p>

        <h3>6.3 Your Rights Regarding Anonymized Data</h3>
        <p>Once your data has been properly anonymized:</p>
        <ul>
          <li>
            It is no longer considered &quot;personal data&quot; under data
            protection laws
          </li>
          <li>Anonymized data may be retained indefinitely</li>
          <li>
            Anonymized data cannot be deleted at your request (as it cannot be
            traced back to you)
          </li>
          <li>You will not receive compensation for anonymized data</li>
        </ul>

        <h3>6.4 Opting Out of Research Data Contribution</h3>
        <p>
          You may opt out of having your data included in future anonymized
          research datasets by:
        </p>
        <ul>
          <li>Adjusting your preferences in account settings, OR</li>
          <li>
            Emailing{" "}
            <SmartLink href="mailto:privacy@swipestats.io">
              privacy@swipestats.io
            </SmartLink>
          </li>
        </ul>
        <p>Opting out does not affect data already anonymized and published.</p>

        <h2>7. How We Share Your Information</h2>

        <h3>7.1 Categories of Recipients</h3>
        <table>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Data Shared</th>
              <th>Purpose</th>
              <th>Safeguards</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel Inc.</td>
              <td>Application data</td>
              <td>Cloud hosting and infrastructure</td>
              <td>SOC 2, ISO 27001 certified, DPA</td>
            </tr>
            <tr>
              <td>Neon</td>
              <td>Database content</td>
              <td>PostgreSQL database hosting</td>
              <td>Encryption at rest and in transit, DPA</td>
            </tr>
            <tr>
              <td>LemonSqueezy (a Stripe company)</td>
              <td>Payment information</td>
              <td>Payment processing</td>
              <td>PCI DSS compliant, EU-US DPF</td>
            </tr>
            <tr>
              <td>PostHog</td>
              <td>Usage and analytics data</td>
              <td>Product analytics</td>
              <td>Data anonymization, self-hosted option available</td>
            </tr>
            <tr>
              <td>Research Partners (Academic/Commercial)</td>
              <td>Anonymized data only</td>
              <td>Research datasets</td>
              <td>Robust anonymization per Section 6</td>
            </tr>
          </tbody>
        </table>

        <h3>7.2 We Do NOT Sell Your Personal Data</h3>
        <p>
          We do not sell your personal data as defined by CCPA and similar laws.
          The anonymized data we license to third parties does not constitute
          personal data.
        </p>

        <h3>7.3 Legal and Safety Disclosures</h3>
        <p>We may disclose your information if required to:</p>
        <ul>
          <li>Comply with legal obligations</li>
          <li>Respond to lawful requests from public authorities</li>
          <li>Protect our rights, privacy, safety, or property</li>
          <li>Enforce our Terms of Service</li>
          <li>Protect against legal liability</li>
        </ul>

        <h3>7.4 Business Transfers</h3>
        <p>
          If SwipeStats is involved in a merger, acquisition, or sale of assets,
          your information may be transferred. We will provide notice before
          your information becomes subject to a different privacy policy.
        </p>

        <h2>8. International Data Transfers</h2>

        <h3>8.1 Where Your Data May Be Processed</h3>
        <p>
          SwipeStats is based in Norway (part of the European Economic Area).
          Your data may be transferred to and processed in:
        </p>
        <ul>
          <li>
            <strong>Norway:</strong> Our primary location
          </li>
          <li>
            <strong>European Union:</strong> Cloud infrastructure
          </li>
          <li>
            <strong>United States:</strong> Vercel, Neon, PostHog, LemonSqueezy
          </li>
        </ul>

        <h3>8.2 Transfer Safeguards</h3>
        <p>For transfers outside the EEA, we rely on:</p>
        <ul>
          <li>
            <strong>EU-US Data Privacy Framework:</strong> Our key US service
            providers are certified under the EU-US Data Privacy Framework
          </li>
          <li>
            <strong>Standard Contractual Clauses (SCCs):</strong> Where the Data
            Privacy Framework does not apply
          </li>
          <li>
            <strong>Supplementary Measures:</strong> Additional technical and
            organizational measures where necessary
          </li>
        </ul>
        <p>
          You may request a copy of the safeguards we use for international
          transfers by contacting{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          .
        </p>

        <h2>9. Data Retention</h2>
        <p>
          We retain your personal information only for as long as necessary for
          the purposes outlined in this privacy policy, or as required by
          applicable law.
        </p>
        <table>
          <thead>
            <tr>
              <th>Data Category</th>
              <th>Retention Period</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account information</td>
              <td>Until account deletion</td>
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
          <strong>Deletion Process:</strong>
        </p>
        <p>When you delete your data or account:</p>
        <ul>
          <li>
            Personal data is deleted from active systems within a reasonable
            timeframe
          </li>
          <li>Backup copies are deleted on a regular schedule</li>
          <li>
            Anonymized data that has already been created is retained (not
            personal data)
          </li>
        </ul>

        <h2>10. Your Privacy Rights</h2>

        <h3>10.1 Rights for All Users</h3>
        <p>Regardless of location, you have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Request correction of inaccurate data</li>
          <li>Delete your account and data</li>
          <li>Opt out of marketing communications</li>
        </ul>

        <h3>10.2 Rights for EEA/UK Users (GDPR)</h3>
        <p>
          If you are in the European Economic Area or United Kingdom, you have
          additional rights:
        </p>
        <table>
          <thead>
            <tr>
              <th>Right</th>
              <th>Description</th>
              <th>How to Exercise</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Access (Art. 15)</td>
              <td>Request a copy of your personal data</td>
              <td>Email privacy@swipestats.io or use account export</td>
            </tr>
            <tr>
              <td>Rectification (Art. 16)</td>
              <td>Correct inaccurate personal data</td>
              <td>Update in account settings or email us</td>
            </tr>
            <tr>
              <td>Erasure (Art. 17)</td>
              <td>Request deletion of your data</td>
              <td>Delete account in settings or email us</td>
            </tr>
            <tr>
              <td>Restriction (Art. 18)</td>
              <td>Restrict processing in certain circumstances</td>
              <td>Email privacy@swipestats.io</td>
            </tr>
            <tr>
              <td>Portability (Art. 20)</td>
              <td>Receive your data in machine-readable format</td>
              <td>Use account export feature</td>
            </tr>
            <tr>
              <td>Object (Art. 21)</td>
              <td>Object to processing based on legitimate interests</td>
              <td>Email privacy@swipestats.io</td>
            </tr>
            <tr>
              <td>Withdraw Consent (Art. 7)</td>
              <td>Withdraw consent at any time</td>
              <td>Account settings or email us</td>
            </tr>
            <tr>
              <td>Complaint</td>
              <td>Lodge complaint with supervisory authority</td>
              <td>Contact Datatilsynet (Norway)</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Norwegian Supervisory Authority:</strong>
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

        <h3>10.3 Rights for California Residents (CCPA/CPRA)</h3>
        <p>If you are a California resident:</p>
        <ul>
          <li>
            <strong>Right to Know:</strong> You can request disclosure of the
            categories and specific pieces of personal information collected,
            sources, purposes, and third parties with whom we share.
          </li>
          <li>
            <strong>Right to Delete:</strong> You can request deletion of your
            personal information, subject to certain exceptions.
          </li>
          <li>
            <strong>Right to Correct:</strong> You can request correction of
            inaccurate personal information.
          </li>
          <li>
            <strong>Right to Opt-Out of Sale/Sharing:</strong> We do NOT sell
            personal information or share it for cross-context behavioral
            advertising.
          </li>
          <li>
            <strong>Right to Limit Sensitive Information:</strong> You can limit
            our use of sensitive personal information.
          </li>
          <li>
            <strong>Right to Non-Discrimination:</strong> We will not
            discriminate against you for exercising your rights.
          </li>
        </ul>
        <p>
          <strong>To Exercise California Rights:</strong>
          <br />
          Email:{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          <br />
          Subject Line: &quot;California Privacy Rights Request&quot;
        </p>

        <h3>10.4 Response Times</h3>
        <ul>
          <li>GDPR: 30 days (extendable to 90 days for complex requests)</li>
          <li>CCPA: 45 days (extendable to 90 days with notice)</li>
        </ul>

        <h2>11. Cookies and Tracking Technologies</h2>

        <h3>11.1 What We Use</h3>
        <table>
          <thead>
            <tr>
              <th>Cookie Type</th>
              <th>Purpose</th>
              <th>Consent Required</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Strictly Necessary</td>
              <td>Site functionality, security, authentication</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Analytics</td>
              <td>Understanding usage patterns</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Functional</td>
              <td>Remembering preferences</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Marketing</td>
              <td>Ad effectiveness (if applicable)</td>
              <td>Yes</td>
            </tr>
          </tbody>
        </table>

        <h3>11.2 Cookie Consent</h3>
        <p>In accordance with Norwegian law and GDPR:</p>
        <ul>
          <li>
            We obtain explicit consent before setting non-essential cookies
          </li>
          <li>You can withdraw consent at any time through cookie settings</li>
          <li>Pre-selected checkboxes are not used</li>
        </ul>

        <h3>11.3 Managing Cookies</h3>
        <ul>
          <li>
            <strong>Through Our Website:</strong> Use cookie settings if
            available
          </li>
          <li>
            <strong>Through Your Browser:</strong> Most browsers allow you to
            block or delete cookies
          </li>
        </ul>

        <h3>11.4 Do Not Track</h3>
        <p>
          We currently do not respond to &quot;Do Not Track&quot; browser
          signals, as there is no industry standard. We will update this policy
          if a standard is established.
        </p>

        <h2>12. Data Security</h2>

        <h3>12.1 Technical Measures</h3>
        <ul>
          <li>Encryption in transit (TLS 1.2+)</li>
          <li>Encryption at rest (AES-256)</li>
          <li>Access controls and authentication</li>
          <li>Regular security assessments</li>
          <li>Automated threat detection</li>
        </ul>

        <h3>12.2 Organizational Measures</h3>
        <ul>
          <li>Staff training on data protection</li>
          <li>Access limited to need-to-know basis</li>
          <li>Confidentiality agreements</li>
          <li>Incident response procedures</li>
          <li>Regular policy reviews</li>
        </ul>

        <h3>12.3 Your Responsibilities</h3>
        <p>You are responsible for:</p>
        <ul>
          <li>Keeping your account credentials secure</li>
          <li>Using a strong password</li>
          <li>Not sharing your account</li>
          <li>Logging out of shared devices</li>
        </ul>

        <h3>12.4 Security Limitations</h3>
        <p>
          Despite our efforts, no method of transmission over the Internet or
          electronic storage is 100% secure. We cannot guarantee absolute
          security.
        </p>

        <h2>13. Children&apos;s Privacy</h2>
        <p>
          SwipeStats is not intended for individuals under 18 years of age. We
          do not knowingly collect personal data from children under 18.
        </p>
        <p>
          Dating apps require users to be at least 18 years old. Our service
          analyzes data from these platforms, which should only contain adult
          user data.
        </p>
        <p>
          If you believe we have inadvertently collected data from a minor,
          please contact us immediately at{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
          .
        </p>

        <h2>14. Third-Party Links</h2>
        <p>
          Our Services may contain links to third-party websites or services. We
          are not responsible for the privacy practices of these third parties.
          We encourage you to read the privacy policies of any third-party sites
          you visit.
        </p>

        <h2>15. Data Breach Notification</h2>
        <p>
          In the event of a personal data breach that poses a risk to your
          rights and freedoms:
        </p>
        <ul>
          <li>
            We will notify the Norwegian Data Protection Authority
            (Datatilsynet) within 72 hours
          </li>
          <li>
            If the breach is likely to result in high risk to you, we will
            notify you without undue delay
          </li>
          <li>
            Notification will include the nature of the breach, likely
            consequences, and measures taken
          </li>
        </ul>

        <h2>16. Changes to This Privacy Policy</h2>
        <p>
          <strong>For Minor Changes:</strong> We will update the &quot;Last
          Updated&quot; date.
        </p>
        <p>
          <strong>For Material Changes:</strong> We will notify you by email
          and/or prominent notice on our website at least 30 days before changes
          take effect.
        </p>
        <p>
          Your continued use of the Services after changes take effect
          constitutes acceptance of the updated Privacy Policy.
        </p>

        <h2>17. Contact Us</h2>
        <p>
          <strong>All Inquiries:</strong>{" "}
          <SmartLink href="mailto:privacy@swipestats.io">
            privacy@swipestats.io
          </SmartLink>
        </p>
        <p>
          <strong>Subject Lines for faster routing:</strong>
        </p>
        <ul>
          <li>&quot;Privacy Rights Request&quot; for data access/deletion</li>
          <li>&quot;Security Concern&quot; for security issues</li>
          <li>&quot;Support&quot; for general questions</li>
        </ul>
        <p>
          <strong>Mailing Address:</strong>
          <br />
          Boe Ventures AS
          <br />
          Norway
        </p>
        <p>
          <strong>Response Time:</strong> We aim to respond to all inquiries
          within 5 business days.
        </p>

        <p className="mt-8 text-sm text-gray-600">
          This Privacy Policy was last updated in January 2026.
        </p>
      </div>
    </div>
  );
}
