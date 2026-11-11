export interface AdminStats {
    users: Record<'day' | 'week' | 'month' | 'year' | 'total', string>;
    revenue: {
        stars_total: string;
        rub_total: string;
    };
    api_cost: string;
    api_costs_time: Record<'min' | 'hour' | 'day' | 'week' | 'month' | 'total', string>;
    funnel: Record<'total_users' | 'spent_free' | 'store_opened' | 'paid', string>;
}
