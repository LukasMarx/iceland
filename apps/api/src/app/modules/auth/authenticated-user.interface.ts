export interface AuthenticatedUser {
  userId: string;
  email: string | null;
  provider: string;
  displayName: string | null;
}