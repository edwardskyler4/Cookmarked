import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const readManifest = () =>
  JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

describe("PWA installation", () => {
  it("identifies the browser tab as Cookmarked", () => {
    const document = new JSDOM(readFileSync("index.html", "utf8")).window
      .document;

    expect(document.title).toBe("Cookmarked");
  });

  it("links the manifest from the application document", () => {
    const document = new JSDOM(readFileSync("index.html", "utf8")).window
      .document;

    expect(
      document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
    ).toBe("/manifest.webmanifest");
  });

  it("identifies Cookmarked as an application in its own window", () => {
    expect(readManifest()).toMatchObject({
      name: "Cookmarked",
      short_name: "Cookmarked",
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
  });

  it("registers URL and text sharing at the agreed entry path", () => {
    expect(readManifest().share_target).toMatchObject({
      action: "/share-target",
      method: "GET",
      params: { url: "url", text: "text" },
    });
  });

  it.each([192, 512])(
    "provides a loadable %i pixel installation icon",
    (size) => {
      const icon = readManifest().icons.find(
        (entry: { sizes: string }) => entry.sizes === `${size}x${size}`,
      );
      expect(icon).toBeDefined();
      expect(icon.type).toBe("image/png");
      const bytes = readFileSync(`public${icon.src}`);
      expect(bytes.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(bytes.readUInt32BE(16)).toBe(size);
      expect(bytes.readUInt32BE(20)).toBe(size);
    },
  );

  it("provides a home screen icon for the iPhone paste fallback", () => {
    const document = new JSDOM(readFileSync("index.html", "utf8")).window
      .document;
    const iconPath = document
      .querySelector('link[rel="apple-touch-icon"]')
      ?.getAttribute("href");

    expect(iconPath).toBeTruthy();
    expect(readFileSync(`public${iconPath}`).length).toBeGreaterThan(0);
  });
});
