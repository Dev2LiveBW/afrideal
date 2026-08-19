'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        gutter={10}
        toastOptions={{
          duration: 3600,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '12px',
            fontSize: '14px',
            padding: '12px 16px',
            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.55)',
          },
          success: { iconTheme: { primary: '#1A5C2A', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#C0392B', secondary: '#ffffff' } },
        }}
      />
    </SessionProvider>
  );
}
