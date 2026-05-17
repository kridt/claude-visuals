'use client';

import { useEffect, useState } from 'react';
import { BridgeContainer } from '@/components/bridge/bridge-container';
import { WarRoomContainer } from '@/components/warroom/warroom-container';

type Mode = 'bridge' | 'warroom';

const STORAGE_KEY = 'cv:mode';

function readMode(): Mode {
  if (typeof window === 'undefined') return 'bridge';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'warroom' ? 'warroom' : 'bridge';
  } catch {
    return 'bridge';
  }
}

export default function Page() {
  const [mode, setMode] = useState<Mode>('bridge');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMode(readMode());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode, hydrated]);

  if (mode === 'warroom') {
    return <WarRoomContainer mode={mode} onModeChange={setMode} />;
  }
  return <BridgeContainer mode={mode} onModeChange={setMode} />;
}
