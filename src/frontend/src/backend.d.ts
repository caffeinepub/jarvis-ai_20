import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Message {
    content: string;
    role: string;
}
export interface UserPreferences {
    userName: string;
    voiceSpeed: number;
    assistantName: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface backendInterface {
    clearConversationHistory(): Promise<void>;
    getAllUserPrefs(): Promise<Array<UserPreferences>>;
    getConversationHistory(): Promise<Array<Message>>;
    getOpenAIKey(): Promise<string>;
    getUserPrefs(): Promise<UserPreferences>;
    sendMessage(message: string, systemPrompt: string | null): Promise<string>;
    sendOpenAIRequest(requestBody: string): Promise<string>;
    setOpenAIKey(key: string): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateUserPrefs(userName: string, assistantName: string, voiceSpeed: number): Promise<void>;
}
