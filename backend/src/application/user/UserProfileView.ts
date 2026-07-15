export interface UserProfileView {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}
