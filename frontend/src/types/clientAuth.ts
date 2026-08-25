export interface ClientProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ClientAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  client: ClientProfile;
}
