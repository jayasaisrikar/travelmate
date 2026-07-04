import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Meet fellow travelers, join destination rooms, and find companions for your next trip on wayflo.',
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
