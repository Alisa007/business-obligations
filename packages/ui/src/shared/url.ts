export const safeUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

export const isGovernmentUrl = (value?: string) => {
  const href = safeUrl(value);
  if (!href) return false;
  const hostname = new URL(href).hostname.toLowerCase().replace(/\.$/, "");
  return hostname === "gov" || hostname.endsWith(".gov");
};

export const host = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
};
