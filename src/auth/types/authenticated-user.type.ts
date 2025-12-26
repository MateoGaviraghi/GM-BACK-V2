export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export interface RequestWithUser {
  user: AuthenticatedUser;
  params: Record<string, string>;
  body: any;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
}
