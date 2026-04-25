import { PaymentProvider } from './paymentProvider';
import { AzamPayProvider } from './azampay';
import { SelcomProvider } from './selcom';
import { MockPaymentProvider } from './mock';

export function getPaymentProvider(accessToken: string, gateway?: string): PaymentProvider {
  // The user explicitly requested to use mock payment everywhere for now to verify the flow
  return new MockPaymentProvider();
}
