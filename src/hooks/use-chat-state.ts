"use strict";
import { useState, useCallback } from 'react';
import { SharinganEye, SharinganState } from '@/components/shared-eyes';
import { t } from '@/i18n';
import { C } from '@/lib/theme';

export type ChatState = 'idle' | 'sending' | 'sent' | 'error';

function toEyeState(state: ChatState): SharinganState {
  if (state === 'sending') return 'loading';
  if (state === 'sent') return 'sent';
  return 'idle';
}

export function useChatState() {
  const [state, setState] = useState<ChatState>('idle');
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (sendFn: () => Promise<void>, onSuccess?: () => void) => {
      setState('sending');
      setError(null);
      try {
        await sendFn();
        setState('sent');
        if (onSuccess) setTimeout(onSuccess, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setState('error');
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return { state, error, send, reset };
}

const stateLabel: Record<ChatState, keyof ReturnType<typeof t>['common'] | keyof ReturnType<typeof t>['chat'] | ''> = {
  idle: '',
  sending: 'loading',
  sent: 'sent',
  error: 'error',
};

export function ChatStateIndicator(_props: { state: ChatState; onReset: () => void }) {
  // Escape-hatch: full JSX is returned via the canonical eye barrel; keep this minimal for now.
  return undefined;
}
