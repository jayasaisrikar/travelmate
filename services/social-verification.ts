export type SocialVerificationLevel = 'unverified' | 'basic' | 'trusted' | 'high_trust';
export type SocialVerificationStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'declined'
  | 'in_review'
  | 'expired'
  | 'abandoned'
  | 'resubmitted';

export interface VerificationBadgeMeta {
  label: string;
  description: string;
  pillClassName: string;
  textClassName: string;
  iconClassName: string;
}

export const VERIFICATION_LEVEL_ORDER: SocialVerificationLevel[] = [
  'unverified',
  'basic',
  'trusted',
  'high_trust',
];

export function isTrustedSocialVerificationLevel(
  level: string | null | undefined
): level is 'trusted' | 'high_trust' {
  return level === 'trusted' || level === 'high_trust';
}

export function getVerificationLevelMeta(level: SocialVerificationLevel): VerificationBadgeMeta {
  switch (level) {
    case 'basic':
      return {
        label: 'Basic verified',
        description: 'A public profile with a light identity check.',
        pillClassName: 'border-[#C8D7FF] bg-[#F3F7FF]',
        textClassName: 'text-[#3451D1]',
        iconClassName: 'text-[#3451D1]',
      };
    case 'trusted':
      return {
        label: 'Trusted traveler',
        description: 'Identity confirmed by Didit.',
        pillClassName: 'border-[#BEE8D0] bg-[#F0FBF4]',
        textClassName: 'text-[#1B7A5A]',
        iconClassName: 'text-[#1B7A5A]',
      };
    case 'high_trust':
      return {
        label: 'High trust',
        description: 'Reserved for the strongest verification tier.',
        pillClassName: 'border-[#D9CEF7] bg-[#F7F4FF]',
        textClassName: 'text-[#6C63FF]',
        iconClassName: 'text-[#6C63FF]',
      };
    case 'unverified':
    default:
      return {
        label: 'Unverified',
        description: 'Your profile is visible, but not identity checked yet.',
        pillClassName: 'border-[#DDDCE8] bg-[#FBFAFF]',
        textClassName: 'text-[#6F6C82]',
        iconClassName: 'text-[#8A869C]',
      };
  }
}

export function getVerificationStatusMeta(status: SocialVerificationStatus): VerificationBadgeMeta {
  switch (status) {
    case 'approved':
      return {
        label: 'Verified',
        description: 'Didit approved this identity check.',
        pillClassName: 'border-[#BEE8D0] bg-[#F0FBF4]',
        textClassName: 'text-[#1B7A5A]',
        iconClassName: 'text-[#1B7A5A]',
      };
    case 'pending':
    case 'in_review':
    case 'resubmitted':
      return {
        label: status === 'resubmitted' ? 'Resubmitted' : 'In review',
        description: 'Your verification is being processed.',
        pillClassName: 'border-[#C8D7FF] bg-[#F3F7FF]',
        textClassName: 'text-[#3451D1]',
        iconClassName: 'text-[#3451D1]',
      };
    case 'declined':
      return {
        label: 'Action needed',
        description: 'Didit could not complete the verification.',
        pillClassName: 'border-[#F5B8C8] bg-[#FFF1F5]',
        textClassName: 'text-[#C14D72]',
        iconClassName: 'text-[#C14D72]',
      };
    case 'expired':
      return {
        label: 'Expired',
        description: 'The verification session timed out.',
        pillClassName: 'border-[#F0D9A8] bg-[#FFF9EB]',
        textClassName: 'text-[#A07800]',
        iconClassName: 'text-[#A07800]',
      };
    case 'abandoned':
      return {
        label: 'Paused',
        description: 'You can restart verification at any time.',
        pillClassName: 'border-[#DDDCE8] bg-[#FBFAFF]',
        textClassName: 'text-[#6F6C82]',
        iconClassName: 'text-[#8A869C]',
      };
    case 'not_started':
    default:
      return {
        label: 'Not started',
        description: 'You have not begun the verification flow yet.',
        pillClassName: 'border-[#DDDCE8] bg-[#FBFAFF]',
        textClassName: 'text-[#6F6C82]',
        iconClassName: 'text-[#8A869C]',
      };
  }
}

