import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { LegalPageShell } from '@/components/common/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | wayflo',
  description: 'Learn how wayflo collects, uses, stores, and protects your information when you plan and manage trips.',
};

const privacySections = [
  {
    title: 'Information we collect',
    body: [
      'We collect the information you provide directly to wayflo, including account details, trip preferences, destinations, travel dates, notes, and any other content you add while planning or sharing a trip.',
      'We also collect limited technical information needed to keep the product working well, such as device, browser, log, and performance data. If you allow optional cookies, we may also collect analytics and preference information that helps us improve the experience.',
    ],
  },
  {
    title: 'How we use your information',
    body: [
      'We use your information to operate the service, generate and save itineraries, secure accounts, support collaboration and sharing features, respond to support requests, and maintain reliable product performance.',
      'When you opt in to optional cookies or similar technologies, we may use those signals to understand product usage patterns, remember interface preferences, and improve the quality of planning suggestions and user flows.',
    ],
  },
  {
    title: 'When we share information',
    body: [
      'We do not sell your personal information. We may share information with service providers that help us host the app, authenticate users, send transactional emails, or support infrastructure and analytics on our behalf.',
      'We may also disclose information when reasonably necessary to comply with the law, protect users, investigate abuse, enforce our terms, or support a business transition such as a merger, acquisition, or asset transfer.',
    ],
  },
  {
    title: 'Cookies and similar technologies',
    body: [
      'Essential cookies help keep wayflo secure and usable. They support core tasks like authentication, session continuity, and protecting the product from misuse.',
      'Optional cookies may be used for analytics and interface preferences if you consent. You can update your choices at any time through the cookie settings control available on the site.',
    ],
  },
  {
    title: 'Data retention and security',
    body: [
      'We retain information for as long as reasonably necessary to provide the service, comply with legal obligations, resolve disputes, and enforce agreements. Retention periods may vary depending on the type of data and how the account is used.',
      'We use administrative, technical, and organizational safeguards designed to protect personal information. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.',
    ],
  },
  {
    title: 'Your choices and rights',
    body: [
      'Depending on where you live, you may have the right to access, correct, delete, or export certain personal information, or to object to or limit specific processing activities. You may also be able to withdraw consent for optional cookies at any time.',
      'To make a privacy request or ask a question about your information, contact us using the support details below. We may need to verify your identity before completing some requests.',
    ],
  },
  {
    title: 'Children and policy updates',
    body: [
      'Wayflo is not intended for children under the age required by applicable law to use the service without parental permission. If you believe a child has provided personal information to us in error, please contact us so we can review and take appropriate action.',
      'We may update this Privacy Policy from time to time. If changes are material, we will revise the effective date and may provide additional notice within the product or by email when appropriate.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy first"
      title="Privacy Policy"
      intro="This policy explains what information wayflo collects, why we collect it, and the choices you have while using the product."
      effectiveDate="May 31, 2026"
      sections={privacySections}
    >
      <div className="rounded-2xl bg-[#3a2540] px-4 py-4 text-white">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Contact</div>
            <p className="mt-2 text-sm leading-6 text-white/90">Questions or requests: support@wayflo.app</p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  );
}