import type { Metadata } from 'next';
import { TriangleAlert } from 'lucide-react';
import { LegalPageShell } from '@/components/common/LegalPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Review the terms that apply when you use wayflo to create, save, and share travel plans.',
};

const termsSections = [
  {
    title: 'Using wayflo',
    body: [
      'By accessing or using wayflo, you agree to these Terms of Service and to comply with applicable laws. If you do not agree, please do not use the service.',
      'You may use wayflo only in a lawful manner and only if you are able to form a binding agreement where you live. If you use wayflo on behalf of an organization, you represent that you are authorized to accept these terms for that organization.',
    ],
  },
  {
    title: 'Accounts and access',
    body: [
      'You are responsible for keeping your account credentials secure and for activities that occur under your account. Please notify us promptly if you believe your account has been accessed without authorization.',
      'We may suspend or restrict access when necessary to protect the service, investigate misuse, enforce these terms, or comply with legal requirements.',
    ],
  },
  {
    title: 'Your content and trip data',
    body: [
      'You retain ownership of the content you submit to wayflo, including trip notes, preferences, itineraries, uploaded details, and shared travel information. You grant us a limited license to host, process, display, and transmit that content only as needed to operate and improve the service.',
      'You are responsible for ensuring that your content is accurate, lawful, and that you have the rights needed to share it. Please avoid uploading confidential or sensitive information you do not want processed by the service.',
    ],
  },
  {
    title: 'Acceptable use',
    body: [
      'You may not misuse wayflo, interfere with other users, attempt unauthorized access, reverse engineer protected parts of the service where prohibited by law, or use the platform to transmit unlawful, infringing, harmful, or deceptive material.',
      'You may not use automated methods to scrape, overload, or disrupt the service except through interfaces or permissions we expressly provide.',
    ],
  },
  {
    title: 'Third-party services and availability',
    body: [
      'Wayflo may rely on third-party services, maps, travel data providers, email infrastructure, authentication tools, and hosting partners. We are not responsible for third-party products or content, and those services may be governed by their own terms and privacy practices.',
      'We work to keep the service available and useful, but we do not guarantee uninterrupted access, specific results, or that every itinerary recommendation will be complete, accurate, or suitable for every trip.',
    ],
  },
  {
    title: 'Intellectual property and feedback',
    body: [
      'The wayflo service, branding, interface, software, and related materials are protected by intellectual property laws. Except for the rights expressly granted to you in these terms, we reserve all rights in the service.',
      'If you share feedback, suggestions, or ideas with us, you agree that we may use them without restriction or compensation, provided that doing so does not reduce any rights you otherwise have under applicable law.',
    ],
  },
  {
    title: 'Disclaimers, liability, and changes',
    body: [
      'Wayflo is provided on an “as is” and “as available” basis to the fullest extent permitted by law. We disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, and any warranties arising from a course of dealing or usage of trade.',
      'To the extent permitted by law, wayflo and its operators will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, goodwill, or business opportunities. We may update these terms from time to time, and continued use of the service after an update becomes effective means you accept the revised terms.',
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      eyebrow="Clear expectations"
      title="Terms of Service"
      intro="These terms explain the rules for using wayflo, your responsibilities as an account holder, and how the service is provided."
      effectiveDate="May 31, 2026"
      sections={termsSections}
    >
      <div className="rounded-2xl bg-[#3F3D56] px-4 py-4 text-white">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">Reminder</div>
            <p className="mt-2 text-sm leading-6 text-white/90">
              Travel guidance can change quickly. Always confirm bookings, local rules, and timing details directly with relevant providers.
            </p>
          </div>
        </div>
      </div>
    </LegalPageShell>
  );
}