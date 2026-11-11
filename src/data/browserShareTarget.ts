import type { SharedLink } from "../domain/models/SharedLink";

const closingBrackets: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

function extractTextUrl(text: string): string {
  const links = [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)];
  if (links.length !== 1) return "";

  const match = links[0];
  const url = match[0];
  const wrapper = text.slice(0, match.index).match(/[([{]+$/)?.[0];
  if (!wrapper) return url;

  // Match the enclosing prose brackets while preserving brackets inside the URL.
  const expectedClosings = [...wrapper].map((opening) => closingBrackets[opening]);
  for (let index = 0; index < url.length; index++) {
    const character = url[index];
    if (closingBrackets[character]) {
      expectedClosings.push(closingBrackets[character]);
    } else if (character === expectedClosings[expectedClosings.length - 1]) {
      expectedClosings.pop();
      if (expectedClosings.length === 0) {
        // Extra URL content makes the apparent wrapper ambiguous; keep it intact.
        return /^[.,;!]*$/.test(url.slice(index + 1))
          ? url.slice(0, index - wrapper.length + 1)
          : url;
      }
    }
  }
  return url;
}

// Decode browser navigation data only. The capture service owns URL validation.
export function readSharedLink(address: string): SharedLink | null {
  let entry: URL;
  try {
    entry = new URL(address);
  } catch {
    return null;
  }
  if (entry.pathname !== "/share-target" && entry.pathname !== "/share-target/")
    return null;

  const url = entry.searchParams.get("url") ?? "";
  const text = entry.searchParams.get("text") ?? "";
  return {
    url: url || extractTextUrl(text),
    text,
  };
}
