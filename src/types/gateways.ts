export interface PlategaInvoice {
    transactionId: string;
    redirect?: string;
    url?: string;
    paymentUrl?: string;
}
export interface PlategaStatus {
    status: string;
    payload: string;
    paymentDetails: {
        amount: number;
        currency: string;
    };
}
export interface PaymentGateway {
    createPlategaInvoice(
        amount: number,
        paymentMethod: number,
        payload: string,
    ): Promise<PlategaInvoice | null>;
    checkPlategaInvoice(transactionId: string): Promise<PlategaStatus | null>;
}
