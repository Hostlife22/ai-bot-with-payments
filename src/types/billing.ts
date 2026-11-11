export interface Payment {
    id: number;
    user_id: string;
    amount: number;
    currency: string;
    created_at: Date;
    tx_id: string | null;
}
export interface PackageData {
    stars: number;
    rub: number;
    text: number;
    img: number;
}
