const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Грешен имейл или парола.",
  EMAIL_NOT_VERIFIED: "Имейлът не е потвърден. Провери пощата си.",
  ACCOUNT_SUSPENDED: "Профилът е спрян. Свържи се с поддръжката.",
  ACCOUNT_INACTIVE: "Профилът не е активен.",
  USER_ALREADY_EXISTS: "Вече има профил с този имейл.",
  INVALID_TOKEN: "Връзката е невалидна или е изтекла.",
  PASSWORD_TOO_SHORT: "Паролата е твърде кратка.",
  PASSWORD_TOO_LONG: "Паролата е твърде дълга.",
  INVALID_PASSWORD: "Грешна парола.",
};

export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  if (!error) return "Възникна грешка. Опитай отново.";
  if (error.status === 429) return "Твърде много опити. Опитай отново след няколко минути.";
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code] as string;
  return "Възникна грешка. Опитай отново.";
}
