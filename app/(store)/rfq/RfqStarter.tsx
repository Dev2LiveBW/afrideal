'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Step one of the quotation: one field, one button. Alibaba benchmark §3b.
 *
 * The description travels to the details step in the URL, so a buyer who
 * is sent to sign in on the way arrives with what they typed intact - the
 * sign-in redirect carries the whole path back.
 *
 * The button is live with nothing typed. A buyer who wants the form and
 * has nothing to say yet should get the form, not a disabled button.
 */
export function RfqStarter({ className }: { className?: string }) {
  const router = useRouter();
  const [text, setText] = useState('');

  function go(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    router.push(trimmed ? `/rfq/details?item=${encodeURIComponent(trimmed)}` : '/rfq/details');
  }

  return (
    <form onSubmit={go} className={cn(className)}>
      <div className="rounded-[12px] bg-surface-raised p-3">
        <label htmlFor="rfq-what" className="sr-only">
          What do you need?
        </label>
        <textarea
          id="rfq-what"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder={
            'Describe it, or paste a listing. For example, "200 school uniform sets, navy, sizes 6 to 14, delivered to Francistown before term."'
          }
          className="block h-16 w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-5 text-ink placeholder:text-[#999] focus:outline-none focus:ring-0"
        />
      </div>

      <button
        type="submit"
        className="mt-3 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-full bg-[#E67E22] text-[13px] font-bold text-white transition-colors hover:bg-[#D35400]"
      >
        Write request details
        <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </form>
  );
}
