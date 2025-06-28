// Message interfaces for communication between popup, content script, and background script

export enum RequestType {
  URL = "url",
  TEXT = "text",
  CARD = "card",
  PUBLISH = "publish"
}

interface URLRequest {
  type: RequestType.URL;
}

interface URLResponse {
  type: RequestType.URL;
  success: boolean;
  message?: string;
  url?: string;
}

interface TextResponse {
  success: boolean;
  url?: string;
  message?: string;
}

interface CardRequest {
  sourceText: string;
  numCards?: number;
}

interface CardResponse {
  success: boolean;  // Fixed from 'bool' to 'boolean'
  message: string;
  cards?: string[];
}

interface PublishCardsRequest {
  cards: string[];
}

interface PublishCardsResponse {
  success: boolean;
  message?: string;
}

// User configuration interface
interface UserInformation {  // Fixed typo from 'userInfromation'
  ankiPort: number; // default value 8765
  ankiApiVersion: number; // default value 6
  ankiDeckName: string;
  openRouterApiKey: string;
  maxGenerationTries: number; // some sane default
}

// Export all interfaces
export type {
  URLRequest,
  URLResponse,
  TextResponse,
  CardRequest,
  CardResponse,
  PublishCardsRequest,
  PublishCardsResponse,
  UserInformation,
};
