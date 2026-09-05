const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test("artifact explorer supports click and keyboard without losing context", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "spec.md" }).click();
  await expect(page.locator("#artifact-content")).toContainText(
    "Token behavior",
  );
  await page.getByRole("button", { name: "spec.md" }).press("ArrowRight");
  await expect(page.getByRole("button", { name: "plan.md" })).toBeFocused();
  await expect(page.locator("#artifact-content")).toContainText("Human review");
  await expect(page.getByRole("button", { name: "plan.md" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("inquiry remains local and opens an encoded email draft", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") requests.push(request.url());
  });
  await page.goto("/#inquiry");
  await page.getByLabel("Your stack").fill("Python & FastAPI");
  await page
    .getByLabel("What would you like to improve?")
    .fill('Review plans before edits. <script>alert("x")</script>');
  await page.getByRole("button", { name: "Preview my inquiry" }).click();
  await expect(page.locator("#inquiry-preview")).toBeVisible();
  await expect(page.locator("#inquiry-text")).toContainText("<script>");
  expect(await page.locator("#inquiry-preview script").count()).toBe(0);
  const href = await page.locator("#send-inquiry").getAttribute("href");
  expect(href).toMatch(/^mailto:behzad@airoweb.com\?subject=/);
  expect(decodeURIComponent(href)).toContain("Python & FastAPI");
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.reload();
  await expect(page.locator("#inquiry-preview")).toBeHidden();
});

test("clipboard rejection offers a readable fallback", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
    }),
  );
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Text selected");
});

test("public pages are accessible and fit the viewport", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/", "/docs/", "/support/", "/privacy/"]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("examples download and payment controls stay hidden until configured", async ({
  page,
}) => {
  await page.goto("/docs/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download all three files" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "password-reset.zip",
  );
  await page.goto("/support/");
  await expect(page.locator("#bitcoin-option")).toBeHidden();
  await expect(page.locator("#sponsor-option")).toBeHidden();
  await expect(page.locator("#checkout-option")).toBeHidden();
});

test("core content works without JavaScript and honors reduced motion", async ({
  browser,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("http://127.0.0.1:4173/");
  await expect(staticPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    staticPage.getByRole("link", {
      name: "Read all three example files in the docs.",
    }),
  ).toBeVisible();
  await expect(
    staticPage.getByRole("button", { name: "Preview my inquiry" }),
  ).toBeDisabled();
  await context.close();
});

test("configured funding destinations render with clear donation boundaries", async ({
  page,
}) => {
  await page.route("**/config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body:
        "window.ADE_CONFIG = " +
        JSON.stringify({
          contactEmail: "behzad@airoweb.com",
          sponsorUrl: "https://github.com/sponsors/bhzdcz",
          bitcoinAddress: "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
          bitcoinAddressVerified: true,
          checkoutUrl: "https://checkout.example.test/agreed-setup",
          commerceEnabled: true,
        }) +
        ";",
    }),
  );
  await page.goto("/support/");
  await expect(page.locator("#bitcoin-option")).toBeVisible();
  await expect(page.locator("#bitcoin-option")).toContainText(
    "Donations do not purchase",
  );
  await expect(page.locator("#bitcoin-link")).toHaveAttribute(
    "href",
    /^bitcoin:BC1/,
  );
  await expect(page.locator("#sponsor-link")).toHaveAttribute(
    "href",
    "https://github.com/sponsors/bhzdcz",
  );
  await expect(page.locator("#checkout-link")).toHaveAttribute(
    "href",
    "https://checkout.example.test/agreed-setup",
  );
  await expect(page.locator("#funding-status")).not.toContainText(
    "not configured",
  );
});
