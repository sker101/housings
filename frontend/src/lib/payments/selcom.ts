import { PaymentProvider, PaymentRequest, PaymentResponse } from './paymentProvider';
import { invokeFunction } from '../supabase';

export class SelcomProvider implements PaymentProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // initiate-payment is the Supabase edge function for Selcom
      const response = await invokeFunction('initiate-payment', {
        amount: request.amount,
        phone: request.customerPhone,
        description: `Booking for ${request.metadata.listingId}`,
        referenceId: request.reference
      }, this.accessToken);

      if (response?.success) {
        return {
          success: true,
          checkoutUrl: response.checkout_url || response.url || response.payment_url
        };
      }

      return {
        success: false,
        error: response?.error || 'Selcom failed to start.'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Selcom initiation error'
      };
    }
  }

  async checkStatus(reference: string): Promise<string> {
    return 'pending'; 
  }
}
