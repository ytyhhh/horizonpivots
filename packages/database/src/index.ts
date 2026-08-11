export const clerkSubject = "(select auth.jwt() ->> 'sub')";

export type ClerkOwnedRecord = {
  user_id: string;
};
