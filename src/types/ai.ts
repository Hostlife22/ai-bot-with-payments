import type { AiResponse, HistoryMessage } from '@contracts/conversation';

export interface TextCompletion {
    text: string;
    cost: number;
}
export interface ImageCompletion {
    photo: AiResponse['photo'];
    cost: number;
}
export interface AiGateway {
    complete(system: string, history: HistoryMessage[], text: string): Promise<TextCompletion>;
    image(prompt: string): Promise<ImageCompletion>;
}
export interface PhotoSource {
    random(): Promise<AiResponse['photo']>;
}
