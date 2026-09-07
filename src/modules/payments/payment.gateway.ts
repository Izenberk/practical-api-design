export interface ChargeRequest {
  readonly amountSatang: number;
  readonly currency: string;
  readonly reference: string;
}

export interface ChargeSucceeded {
  readonly outcome: 'succeeded';
  readonly providerRef: string;
}

export interface ChargeFailed {
  readonly outcome: 'failed';
  readonly providerRef: string;
  readonly reason: string;
}

export type ChargeResult = ChargeSucceeded | ChargeFailed;

export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}