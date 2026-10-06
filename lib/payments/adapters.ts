import 'server-only';

import { findById } from '@/lib/db';
import type { Order, PaymentMethod, PaymentProvider } from '@/types';

/**
 * Which provider actually takes the money, and what the buyer does next
 * (spec 0003).
 *
 * While DPO Pay approval is outstanding, `PAYMENTS_PROVIDER=mock` routes every
 * card and wallet order to a mock provider that confirms through the same signed
 * callback the real gateway will use. That is what lets the whole payment path be
 * built and tested before the gateway exists.
 */

/** What checkout hands back to the buyer once an order is waiting for payment. */
export type StartedPayment = {
  provider: PaymentProvider;
  /** What a callback arrives carrying, so it can find this attempt. */
  providerReference: string;
  /** Where to send the buyer. Null when there is nothing hosted to send them to. */
  redirectUrl: string | null;
  /** What the buyer must do by hand, for a bank transfer. Null otherwise. */
  instructions: string | null;
};

/**
 * A mock that can mark orders paid must never exist in production.
 *
 * Thrown rather than quietly falling back to a real provider: a misconfigured
 * deployment should fail loudly at the first checkout, not take money through a
 * path nobody meant to enable.
 */
export class MockProviderInProductionError extends Error {
  constructor() {
    super(
      'PAYMENTS_PROVIDER=mock is refused in production. A mock must not be able to mark orders paid.',
    );
    this.name = 'MockProviderInProductionError';
  }
}

function usingMock(): boolean {
  const mock = process.env.PAYMENTS_PROVIDER === 'mock';
  if (mock && process.env.NODE_ENV === 'production') throw new MockProviderInProductionError();
  return mock;
}

/**
 * The provider for a method.
 *
 * A bank transfer is always itself: there is no gateway in the middle, so mocking
 * it would mean mocking a human reading a bank statement.
 */
export function providerFor(method: PaymentMethod): PaymentProvider {
  if (method === 'EFT') return 'EFT';
  return usingMock() ? 'MOCK' : method;
}

/**
 * Open a payment attempt for an order.
 *
 * The reference is minted here rather than at confirmation because a callback has
 * to be able to find the attempt it belongs to. For a bank transfer it is the
 * order reference, which is what the buyer quotes to their bank.
 */
export async function startPayment(order: Order): Promise<StartedPayment> {
  const provider = providerFor(order.payment_method);

  if (provider === 'EFT') {
    return {
      provider,
      providerReference: order.reference,
      redirectUrl: null,
      instructions: await bankTransferInstructions(order),
    };
  }

  // The mock has no hosted page yet, so there is nowhere to send the buyer: the
  // order sits at AWAITING_PAYMENT until a signed callback arrives. The real
  // gateway adapter fills `redirectUrl` in when DPO Pay is approved.
  return {
    provider,
    providerReference: `${provider}-${order.id}-${Date.now().toString(36)}`,
    redirectUrl: null,
    instructions: null,
  };
}

/**
 * What a buyer paying by bank transfer needs to see.
 *
 * The account details come from the `eft_bank_details` setting, never from code.
 * If that setting is missing we say so plainly instead of inventing an account
 * number, because a wrong one sends a buyer's money to a stranger.
 */
async function bankTransferInstructions(order: Order): Promise<string> {
  const setting = await findById('settings', 'eft_bank_details');
  const raw = setting?.value?.text;
  const details = typeof raw === 'string' ? raw.trim() : '';

  const quote = `Use ${order.reference} as the payment reference so we can match your transfer.`;

  if (!details) {
    return `${quote} Our banking details will be sent to you shortly.`;
  }

  return `${details}\n\n${quote}`;
}
