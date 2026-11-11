export interface Theme {
    title: string;
    fill: string;
    empty: string;
    statuses: [string, string, string, string];
    max: string;
}
export type Themes = Record<string, Theme> & {
    default: Theme;
};
export type ModeNames = Record<string, string>;
