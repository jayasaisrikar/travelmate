'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';
import { sendWave, retractWave } from '@/services/social';

interface WaveButtonProps {
  userId: string;
  initialStatus: 'none' | 'wave_sent' | 'wave_received' | 'connected' | 'blocked';
  onStatusChange?: (next: string) => void;
}

const labels: Record<string, string> = {
  none:          'Wave 👋',
  wave_sent:     'Waved',
  wave_received: 'Wave back',
  connected:     'Connected',
  blocked:       'Blocked',
};

export function WaveButton({ userId, initialStatus, onStatusChange }: WaveButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading || status === 'connected' || status === 'blocked') return;

    setLoading(true);
    try {
      if (status === 'wave_sent') {
        await retractWave(userId);
        setStatus('none');
        onStatusChange?.('none');
      } else {
        await sendWave(userId);
        const next = status === 'wave_received' ? 'connected' : 'wave_sent';
        setStatus(next);
        onStatusChange?.(next);
      }
    } catch {
      // silently ignore — the parent page will show errors if needed
    } finally {
      setLoading(false);
    }
  };

  const isActive    = status === 'wave_sent' || status === 'connected';
  const isDisabled  = loading || status === 'connected' || status === 'blocked';

  return (
    <motion.button
      type="button"
      whileTap={isDisabled ? {} : { scale: 0.93 }}
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold
        transition-all duration-150 select-none
        ${isActive
          ? 'bg-[#6C63FF] text-white shadow-[0_2px_12px_rgba(108,99,255,0.35)]'
          : 'border border-[#DDDCE8] bg-white text-[#3F3D56] hover:border-[#6C63FF] hover:text-[#6C63FF]'
        }
        disabled:cursor-not-allowed disabled:opacity-60
      `}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.14 }}
          className="flex items-center gap-1.5"
        >
          {loading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <Hand size={13} />
          )}
          {labels[status]}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
