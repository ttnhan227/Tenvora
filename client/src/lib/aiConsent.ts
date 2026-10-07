type ConsentHandler = () => Promise<boolean>;
let handler: ConsentHandler | undefined;

export const AI_CONSENT_DECLINED = "AI_CONSENT_DECLINED";
export const isAiConsentDeclined = (response: { errors?: string[] }) =>
  response.errors?.includes(AI_CONSENT_DECLINED) === true;

export function registerAiConsentHandler(next: ConsentHandler) {
  handler = next;
  return () => { if (handler === next) handler = undefined; };
}

// No mounted disclosure means no permission to transmit business data.
export async function requireAiConsent(): Promise<boolean> {
  return handler ? handler() : false;
}
