import { PaymentProvider, PaymentRequest, PaymentResponse } from './paymentProvider';

export class MockPaymentProvider implements PaymentProvider {
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    console.log('--- [MOCK PAYMENT] ---');
    console.log('Reference:', request.reference);
    console.log('Amount:', request.amount);
    if (request.metadata.breakdown) {
      const b = request.metadata.breakdown as any;
      console.log('Breakdown:');
      console.log('  - Monthly Rent:', b.monthlyRent);
      console.log('  - Platform Fee:', b.platformDepositFee);
      console.log('  - Total Due:', b.totalDue);
    }
    console.log('Metadata:', request.metadata);
    console.log('-----------------------');

    // Simulate a short delay then success
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          transactionId: `mock_tx_${Date.now()}`
        });
      }, 1000);
    });
  }

  async checkStatus(reference: string): Promise<string> {
    return 'completed';
  }
}
