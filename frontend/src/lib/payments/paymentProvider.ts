/**
 * paymentProvider.ts
 * Generic interface for payment gateways.
 */

export interface PaymentRequest {
  amount: number;
  reference: string;
  metadata: Record<string, unknown>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  success: boolean;
  checkoutUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface PaymentProvider {
  initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
  checkStatus(reference: string): Promise<string>;
}
