import { LegalLayout } from './LegalLayout';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function PrivacyPolicy() {
  usePageTitle('Privacy Policy · ResiHub');
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="01 May 2026">
      <p>
        ResiHub ("we", "us", "our") respects your privacy. This Privacy
        Policy explains how we collect, use, store, and protect your
        personal information when you use the ResiHub platform — the web
        app, the residence-management tools, and any related services.
      </p>
      <p>
        We process your personal information in accordance with the
        <strong> Protection of Personal Information Act, 4 of 2013 ("POPIA")</strong>
        of the Republic of South Africa. By using ResiHub you acknowledge
        you've read this policy and consent to the processing described
        below.
      </p>

      <h2>1. Who is the responsible party</h2>
      <p>
        The responsible party (data controller) for the information you
        share is the residence administrator who invited you to use
        ResiHub, supported by Athera as the operator of the platform.
        Contact us at{' '}
        <a href="mailto:privacy@resihub.co">privacy@resihub.co</a>
        {' '}for any data-related question.
      </p>

      <h2>2. What personal information we collect</h2>
      <ul>
        <li>
          <strong>Identity & contact</strong> — name, email address,
          phone number, profile photo (optional), bio (optional).
        </li>
        <li>
          <strong>Education</strong> — university, programme, year of
          study (used for housemate context only).
        </li>
        <li>
          <strong>Accommodation</strong> — room allocation, move-in
          date, monthly rent, lease contract status.
        </li>
        <li>
          <strong>Financial</strong> — invoice history, payment-proof
          screenshots you upload, wallet credit balance and transaction
          history. <em>We do not collect or store credit-card numbers,
          bank account numbers, or any other payment-card data.</em>
        </li>
        <li>
          <strong>Operational</strong> — visitor passes you create,
          maintenance tickets you raise (and any photos you attach),
          chore claims and proof images.
        </li>
        <li>
          <strong>Technical</strong> — device type, IP address, log
          timestamps. Used for security (rate-limiting, account-lockout
          on suspicious activity) and basic uptime monitoring.
        </li>
      </ul>

      <h2>3. How we use your information</h2>
      <ul>
        <li>To run residence services — allocate rooms, issue invoices, manage visitors and maintenance.</li>
        <li>To send you notifications relevant to your stay (new invoices, news, chore approvals).</li>
        <li>To verify your identity at sign-in.</li>
        <li>To produce aggregate, non-identifying business-health metrics for your residence administrator.</li>
        <li>To respond to your questions, complaints or access requests.</li>
        <li>To comply with applicable laws and lawful instructions from a regulator.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal information to any
        third party. We do not run advertising on the platform and do
        not share your data with advertisers.
      </p>

      <h2>4. Lawful basis for processing</h2>
      <p>
        We rely on the following grounds under POPIA, depending on
        context:
      </p>
      <ul>
        <li><strong>Contract</strong> — to provide the accommodation services you've signed up for.</li>
        <li><strong>Consent</strong> — for optional fields like your bio, profile photo, and notification opt-ins.</li>
        <li><strong>Legitimate interest</strong> — for security logging, fraud prevention, and platform reliability.</li>
        <li><strong>Legal obligation</strong> — when a court order or regulator requires disclosure.</li>
      </ul>

      <h2>5. Who we share your information with</h2>
      <ul>
        <li>
          <strong>Your residence administrator</strong> — your name,
          contact, room, payment status and operational records (the
          information they need to run the residence).
        </li>
        <li>
          <strong>Other residents in your block</strong> — only your
          name, room number, programme and bio, so housemates can
          recognise each other. Email and phone are <strong>not</strong>
          {' '}shared with other residents.
        </li>
        <li>
          <strong>Service providers</strong> we contract to operate the
          platform (cloud hosting, transactional email). They process
          data on our instructions only.
        </li>
        <li>
          <strong>Regulators and courts</strong> when legally required.
        </li>
      </ul>

      <h2>6. Where your data is stored</h2>
      <p>
        Personal information is stored on servers in South Africa or in
        cross-border data centres operated by reputable cloud providers
        with adequate POPIA-compatible safeguards. Where data must move
        across borders, we ensure equivalent protection through
        contractual measures.
      </p>

      <h2>7. How long we keep your information</h2>
      <ul>
        <li>While your account is active.</li>
        <li>For up to <strong>5 years</strong> after you leave the residence, for tax, lease and audit purposes (the SARS retention norm).</li>
        <li>Anonymised aggregate metrics (e.g. occupancy rates) may be retained indefinitely as they no longer identify you.</li>
      </ul>

      <h2>8. How we keep your information safe</h2>
      <ul>
        <li>Encrypted transport (HTTPS) for every request.</li>
        <li>Passwords are stored as one-way bcrypt hashes — we cannot read your password.</li>
        <li>Role-based access control: residents only see their own data; admins see only the residences they manage.</li>
        <li>Inactivity auto sign-out (90 seconds with a warning) to protect shared devices.</li>
        <li>Account-deactivation by an administrator immediately blocks sign-in.</li>
        <li>Routine security reviews of the application stack.</li>
      </ul>
      <p>
        No system is 100% impenetrable. If we ever detect a data breach
        affecting you, we will notify you and the Information Regulator
        as required by POPIA section 22.
      </p>

      <h2>9. Your rights under POPIA</h2>
      <p>You have the right, free of charge, to:</p>
      <ul>
        <li>Know what personal information we hold about you.</li>
        <li>Request a copy of that information.</li>
        <li>Correct or update inaccurate information.</li>
        <li>Delete information that is no longer necessary or that you previously consented to provide.</li>
        <li>Object to our processing in specific circumstances.</li>
        <li>Withdraw consent (where consent is the lawful basis) — though some services may stop working as a result.</li>
        <li>Lodge a complaint with the South African Information Regulator at <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer">inforegulator.org.za</a>.</li>
      </ul>
      <p>
        To exercise any of these rights, email{' '}
        <a href="mailto:privacy@resihub.co">privacy@resihub.co</a>{' '}
        or speak to your residence administrator. We respond within 30
        calendar days.
      </p>

      <h2>10. Cookies & local storage</h2>
      <p>
        ResiHub uses your browser's local storage to keep you signed
        in, remember your theme preference (light/dark) and the
        residence you last viewed. We do not use third-party tracking
        cookies. Clearing your browser storage will sign you out.
      </p>

      <h2>11. Children</h2>
      <p>
        ResiHub is intended for residents aged 18 and over (university
        students). We do not knowingly collect information about
        children under 18. If you believe a minor has registered, contact
        us and we'll remove the account.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        We may update this policy as the platform evolves. Material
        changes will be communicated via in-app notification and email.
        The "Last updated" date at the top of this page always reflects
        the current version.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions, requests, or complaints — email{' '}
        <a href="mailto:privacy@resihub.co">privacy@resihub.co</a>.
      </p>
    </LegalLayout>
  );
}
