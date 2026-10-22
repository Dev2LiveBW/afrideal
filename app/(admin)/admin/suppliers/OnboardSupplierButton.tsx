'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/brand/ActionButton';
import { cn } from '@/lib/utils';
import type { Category, Country, SupplierType } from '@/types';

const SUPPLIER_TYPES: { value: SupplierType; label: string }[] = [
  { value: 'WHOLESALER', label: 'Wholesaler' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'MANUFACTURER', label: 'Manufacturer' },
  { value: 'IMPORTER', label: 'Importer' },
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'BRAND', label: 'Brand' },
  { value: 'AGENT', label: 'Agent' },
];

export function OnboardSupplierButton({
  categories,
  countries,
}: {
  categories: Category[];
  /** Active countries from the `countries` data: a supplier can be anywhere (spec 0009). */
  countries: Country[];
}) {
  const firstCountry = countries[0]?.code ?? '';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [country, setCountry] = useState(firstCountry);
  const [city, setCity] = useState('');
  const [supplierType, setSupplierType] = useState<SupplierType>('WHOLESALER');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<'VERIFIED' | 'PENDING'>('VERIFIED');

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, saving]);

  function resetForm() {
    setName('');
    setCountry(firstCountry);
    setCity('');
    setSupplierType('WHOLESALER');
    setContactPhone('');
    setContactEmail('');
    setSelectedCategories([]);
    setStatus('VERIFIED');
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !city.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          country,
          city: city.trim(),
          supplier_type: supplierType,
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          categories: selectedCategories,
          status,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error ?? 'Request failed');
      }

      toast.success(
        status === 'VERIFIED'
          ? `${name.trim()} onboarded and live`
          : `${name.trim()} added as pending`,
      );
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not onboard supplier');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ActionButton
        variant="forest"
        size="sm"
        icon={<Plus size={15} strokeWidth={2} />}
        onClick={() => setOpen(true)}
      >
        Onboard supplier
      </ActionButton>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => !saving && setOpen(false)}
              className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
            />

            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Onboard launch supplier"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg overflow-hidden rounded-lg bg-surface-raised shadow-lift outline-none"
            >
              <form onSubmit={handleSubmit}>
                <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-5">
                  <div className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-wash text-forest">
                      <Building2 size={18} strokeWidth={1.5} />
                    </span>
                    <div>
                      <h2 className="text-[16px] font-semibold text-ink">Onboard launch supplier</h2>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        Minimum launch profile. KYC documents, registration numbers, and portal login can be added later.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => !saving && setOpen(false)}
                    aria-label="Close"
                    className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                  <div>
                    <label htmlFor="supplier-name" className="block text-[12px] font-medium text-ink">
                      Trading name <span className="text-danger-ink">*</span>
                    </label>
                    <input
                      id="supplier-name"
                      type="text"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Kgale Wholesale Supplies"
                      className="mt-1.5 w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-forest"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="supplier-country" className="block text-[12px] font-medium text-ink">
                        Country <span className="text-danger-ink">*</span>
                      </label>
                      <select
                        id="supplier-country"
                        value={country}
                        onChange={(event) => setCountry(event.target.value)}
                        className="mt-1.5 w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-forest"
                      >
                        {countries.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.name} ({option.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="supplier-city" className="block text-[12px] font-medium text-ink">
                        City <span className="text-danger-ink">*</span>
                      </label>
                      <input
                        id="supplier-city"
                        type="text"
                        required
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        placeholder="Town or city"
                        className="mt-1.5 w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-forest"
                      />
                    </div>

                    <div>
                      <label htmlFor="supplier-type" className="block text-[12px] font-medium text-ink">
                        Supplier type
                      </label>
                      <select
                        id="supplier-type"
                        value={supplierType}
                        onChange={(event) => setSupplierType(event.target.value as SupplierType)}
                        className="mt-1.5 w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-forest"
                      >
                        {SUPPLIER_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="supplier-phone" className="block text-[12px] font-medium text-ink">
                        Contact phone <span className="text-[11px] font-normal text-muted">(optional)</span>
                      </label>
                      <input
                        id="supplier-phone"
                        type="tel"
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder="+267 71 000 000"
                        className="mt-1.5 w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-forest"
                      />
                    </div>

                    <div>
                      <label htmlFor="supplier-email" className="block text-[12px] font-medium text-ink">
                        Contact email <span className="text-[11px] font-normal text-muted">(optional)</span>
                      </label>
                      <input
                        id="supplier-email"
                        type="email"
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                        placeholder="sales@supplier.co.bw"
                        className="mt-1.5 w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <span className="block text-[12px] font-medium text-ink">
                        Trade categories <span className="text-[11px] font-normal text-muted">(optional)</span>
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {categories.map((category) => {
                          const active = selectedCategories.includes(category.id);
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => toggleCategory(category.id)}
                              className={cn(
                                'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                                active
                                  ? 'bg-forest text-white'
                                  : 'bg-surface text-body ring-1 ring-inset ring-hairline-strong hover:bg-ink/[0.04]',
                              )}
                            >
                              {category.emoji} {category.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-md border border-hairline bg-surface p-3.5">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={status === 'VERIFIED'}
                        onChange={(event) => setStatus(event.target.checked ? 'VERIFIED' : 'PENDING')}
                        className="mt-0.5 h-4 w-4 rounded border-hairline-strong accent-forest"
                      />
                      <span className="text-[12.5px]">
                        <span className="block font-medium text-ink">
                          Mark verified for launch immediately
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-muted">
                          Seeds baseline routing scores (70/100 reliability, 4.0★ rating, 3d lead time) so offers go live right away while KYC docs remain pending for later collection.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-hairline bg-surface px-6 py-4">
                  <ActionButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    type="submit"
                    variant="forest"
                    size="sm"
                    loading={saving}
                    disabled={!name.trim() || !city.trim()}
                  >
                    Onboard supplier
                  </ActionButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
