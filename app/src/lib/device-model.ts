type NavigatorUAData = {
  getHighEntropyValues: (hints: string[]) => Promise<{
    model?: string;
  }>;
};

type NavigatorWithUAData = Navigator & {
  userAgentData?: NavigatorUAData;
};

let cachedModel: string | null | undefined;

export async function resolveDeviceModelHint(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  if (cachedModel !== undefined) return cachedModel || undefined;

  const nav = navigator as NavigatorWithUAData;
  if (!nav.userAgentData?.getHighEntropyValues) {
    cachedModel = null;
    return undefined;
  }

  try {
    const hints = await nav.userAgentData.getHighEntropyValues(["model"]);
    const model = hints.model?.trim();
    cachedModel = model || null;
    return model || undefined;
  } catch {
    cachedModel = null;
    return undefined;
  }
}
