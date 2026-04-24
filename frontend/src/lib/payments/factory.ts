import { PaymentProvider } from './paymentProvider';
import { AzamPayProvider } from './azampay';
import { MockPaymentProvider } from './mock';

export function getPaymentProvider(accessToken: string): PaymentProvider {
  const env = import.meta.env.VITE_PAYMENT_ENV || 'mock';

  switch (env.toLowerCase()) {
    case 'azampay':
      return new AzamPayProvider(accessToken);
    case 'mock':
    default:
      return new MockPaymentProvider();
  }
}
