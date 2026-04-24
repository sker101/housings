import { PaymentProvider, PaymentRequest, PaymentResponse } from './paymentProvider';
import { invokeFunction } from '../supabase';

export class AzamPayProvider implements PaymentProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await invokeFunction('azampay-checkout', {
        bookingId: request.metadata.bookingId || request.reference,
        amount: request.amount,
        name: request.customerName || 'iRent Tenant',
        email: request.customerEmail,
        phone: request.customerPhone,
        metadata: request.metadata
      }, this.accessToken);

      if (response?.checkout_url || response?.url) {
        return {
          success: true,
          checkoutUrl: response.checkout_url || response.url
        };
      }

      return {
        success: false,
        error: response?.error || 'AzamPay failed to start.'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'AzamPay initiation error'
      };
    }
  }

  async checkStatus(reference: string): Promise<string> {
    // Logic to check status via Supabase function or direct API
    return 'pending'; 
  }
}
