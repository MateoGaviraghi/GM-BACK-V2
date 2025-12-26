declare module 'passport-jwt' {
  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken: () => (req: any) => string | null;
  };
  export class Strategy {
    constructor(options: any, verify?: any);
    authenticate(): void;
  }
}
