export {};

declare global {
  interface Window {
    CRIBL_API_URL?: string;
    CRIBL_BASE_PATH?: string;
    CRIBL_APP_ID?: string;
    getCriblUser?: () => Promise<CriblUser>;
  }
}

export interface CriblUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  initials?: string;
}
