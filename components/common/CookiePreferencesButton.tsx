'use client';

interface CookiePreferencesButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function CookiePreferencesButton({
  className,
  children = 'Cookie settings',
}: CookiePreferencesButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('wayflo:open-cookie-preferences'));
      }}
    >
      {children}
    </button>
  );
}