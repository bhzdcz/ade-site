(() => {
  "use strict";
  const config = window.ADE_CONFIG || {};
  const status = document.querySelector("#copy-status");
  let toastTimer;
  const announce = (text) => {
    if (!status) return;
    status.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      status.textContent = "";
    }, 5000);
  };
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent);
        announce("Copied to clipboard.");
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        announce(
          "Copy unavailable. Text selected; use your device’s copy command.",
        );
      }
    });
  });
  const artifacts = {
    intent: {
      title: "Let users recover access",
      sections: [
        [
          "Problem",
          "A user who forgets their password currently needs support to regain access.",
        ],
        [
          "Proposed outcome",
          "Users can request a reset email and choose a new password without revealing whether an email address has an account.",
        ],
        [
          "Success criteria",
          "Expired and reused links cannot change a password.",
        ],
      ],
    },
    spec: {
      title: "Define what “done” means",
      sections: [
        [
          "Privacy",
          "Known and unknown email addresses receive the same public response.",
        ],
        [
          "Token behavior",
          "A reset token expires after 30 minutes and can be used only once.",
        ],
        [
          "Failure cases",
          "Expired, malformed and reused links return an actionable error. Rate limiting applies to reset requests. Tokens never appear in logs.",
        ],
      ],
    },
    plan: {
      title: "Make the change reviewable",
      sections: [
        [
          "Implementation",
          "Use the existing authentication provider. Add request and confirmation views, and connect the transactional email template.",
        ],
        [
          "Validation",
          "Test response parity, token expiry, one-time use, rate limiting and session invalidation. Exercise the browser flow.",
        ],
        [
          "Human review",
          "Confirm the provider capabilities and test evidence in a pull request. Release through the application’s protected environment.",
        ],
      ],
    },
  };
  const buttons = [...document.querySelectorAll("[data-artifact]")];
  const selectArtifact = (key) => {
    const artifact = artifacts[key];
    const content = document.querySelector("#artifact-content");
    if (!artifact || !content) return;
    buttons.forEach((button) => {
      const selected = button.dataset.artifact === key;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelector("#artifact-path").textContent =
      `password-reset / ${key}.md`;
    const meta = document.createElement("p");
    meta.className = "code-meta";
    meta.textContent = "status: draft";
    const title = document.createElement("h3");
    title.textContent = artifact.title;
    content.replaceChildren(meta, title);
    artifact.sections.forEach(([heading, text]) => {
      const h = document.createElement("h4");
      h.textContent = heading;
      const p = document.createElement("p");
      p.textContent = text;
      content.append(h, p);
    });
  };
  buttons.forEach((button, index) => {
    button.addEventListener("click", () =>
      selectArtifact(button.dataset.artifact),
    );
    button.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight" || event.key === "ArrowDown")
        next = (index + 1) % buttons.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        buttons[next].focus();
        selectArtifact(buttons[next].dataset.artifact);
      }
    });
  });
  const form = document.querySelector("#inquiry-form");
  const fields = document.querySelector("#inquiry-fields");
  if (fields) fields.disabled = false;
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const brief = `Hi Behzad,\n\nI’m interested in the proposed €490 ADE setup for one repository.\n\nTeam: ${data.get("team")}\nStack: ${String(data.get("stack")).trim()}\n\nWhat I’d like to improve:\n${String(data.get("problem")).trim()}\n\nPlease confirm scope, availability, applicable taxes and terms before payment.\n\nThanks!`;
    document.querySelector("#inquiry-text").textContent = brief;
    const email = config.contactEmail || "behzad@airoweb.com";
    document.querySelector("#send-inquiry").href =
      `mailto:${email}?subject=${encodeURIComponent("ADE setup inquiry")}&body=${encodeURIComponent(brief)}`;
    const preview = document.querySelector("#inquiry-preview");
    preview.hidden = false;
    preview.tabIndex = -1;
    preview.focus({ preventScroll: true });
    preview.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  });
  const fundingStatus = document.querySelector("#funding-status");
  if (
    fundingStatus &&
    (config.sponsorUrl ||
      (config.bitcoinAddress && config.bitcoinAddressVerified))
  )
    fundingStatus.textContent =
      "Optional contributions support ADE’s maintenance. Choose a configured destination below; donations do not purchase the setup service.";
  const sponsor = document.querySelector("#sponsor-link");
  if (sponsor && config.sponsorUrl) {
    sponsor.href = config.sponsorUrl;
    document.querySelector("#sponsor-option").hidden = false;
  }
  if (config.bitcoinAddress && config.bitcoinAddressVerified) {
    const section = document.querySelector("#bitcoin-option");
    if (section) {
      document.querySelector("#bitcoin-address").textContent =
        config.bitcoinAddress;
      document.querySelector("#bitcoin-link").href =
        `bitcoin:${config.bitcoinAddress}`;
      section.hidden = false;
    }
  }
  const checkout = document.querySelector("#checkout-link");
  if (checkout && config.commerceEnabled && config.checkoutUrl) {
    checkout.href = config.checkoutUrl;
    document.querySelector("#checkout-option").hidden = false;
  }
})();
