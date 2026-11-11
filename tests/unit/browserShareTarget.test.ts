import { describe, expect, it } from "vitest";
import { readSharedLink } from "../../src/data/browserShareTarget";

const sourceUrl = "https://www.pinterest.com/pin/123/?a=1&b=two%20words#recipe";

describe("readSharedLink", () => {
  it("decodes the shared URL without changing the source address", () => {
    const address = `https://cookmarked.example/share-target?${new URLSearchParams(
      {
        url: sourceUrl,
        text: "A recipe + a caption",
      },
    )}`;

    expect(readSharedLink(address)).toEqual({
      url: sourceUrl,
      text: "A recipe + a caption",
    });
  });

  it("keeps shared text available for the capture handoff", () => {
    const text = "Try this recipe: https://www.instagram.com/p/example/";
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)?.text).toBe(text);
  });

  it("extracts a single link supplied through shared text", () => {
    const text = `Try this recipe: ${sourceUrl}`;
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)).toEqual({ url: sourceUrl, text });
  });

  it.each([
    "https://example.com/recipe_(vegan)",
    "https://example.com/recipe_((vegan))",
    "https://example.com/recipe?signature=abc!",
    "https://example.com/recipe?query=tomato.",
    "https://example.com/recipe?query=salt,",
    "https://example.com/recipe?query=herbs;",
  ])("preserves a bare shared URL ending in meaningful punctuation: %s", (url) => {
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text: url })}`;

    expect(readSharedLink(address)?.url).toBe(url);
  });

  it.each([
    "https://example.com/recipe_(vegan)",
    "https://example.com/recipe?signature=abc!",
  ])("preserves punctuation in a link following a caption: %s", (url) => {
    const text = `Try this recipe: ${url}`;
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)).toEqual({ url, text });
  });

  it.each([
    ["(", ")."],
    ["[", "]!"],
    ["{", "},"],
    ["((", "))."],
    ["([", "])!"],
  ])("removes the prose wrapper %s…%s around a URL", (opening, ending) => {
    const url = "https://example.com/recipe_(vegan)?signature=abc!";
    const text = `Try this ${opening}${url}${ending}`;
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)).toEqual({ url, text });
  });

  it.each([
    "https://example.com/recipe_(vegan)",
    "https://example.com/recipe?query=one)two!",
  ])("preserves the URL when an enclosing parenthesis is unclosed: %s", (url) => {
    const text = `Try this (${url}`;
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)).toEqual({ url, text });
  });

  it("extracts a link surrounded by sentence punctuation", () => {
    const text = "Try this (https://www.instagram.com/p/example/).";
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)?.url).toBe(
      "https://www.instagram.com/p/example/",
    );
  });

  it("keeps ambiguous wrapper characters instead of truncating the candidate", () => {
    const candidate = "https://example.com/recipe?query=one]two!)";
    const text = `Try this ([${candidate}`;
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)).toEqual({ url: candidate, text });
  });

  it("uses the explicit URL field when text contains another link", () => {
    const text = "https://www.facebook.com/example/posts/123/";
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ url: sourceUrl, text })}`;

    expect(readSharedLink(address)).toEqual({ url: sourceUrl, text });
  });

  it("preserves text with multiple links for manual selection", () => {
    const text = `${sourceUrl}\nhttps://www.facebook.com/example/posts/123/`;
    const address = `https://cookmarked.example/share-target?${new URLSearchParams({ text })}`;

    expect(readSharedLink(address)).toEqual({ url: "", text });
  });

  it.each(["/", "/add", "/share-target-extra"])(
    "ignores share parameters on %s",
    (path) => {
      expect(
        readSharedLink(
          `https://cookmarked.example${path}?${new URLSearchParams({ url: sourceUrl })}`,
        ),
      ).toBeNull();
    },
  );

  it("accepts a trailing slash on the share entry path", () => {
    expect(
      readSharedLink(
        `https://cookmarked.example/share-target/?${new URLSearchParams({ url: sourceUrl })}`,
      )?.url,
    ).toBe(sourceUrl);
  });

  it("represents an empty share without inventing a link", () => {
    expect(readSharedLink("https://cookmarked.example/share-target")).toEqual({
      url: "",
      text: "",
    });
  });

  it("ignores an invalid entry address", () => {
    expect(readSharedLink("not an address")).toBeNull();
  });
});
