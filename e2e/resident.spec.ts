import { test, expect, bill, noOverflow } from "./fixtures";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
test("C01 home shows outstanding invoice and navigation", async ({
  page,
  state,
}) => {
  await page.goto("/");
  await expect(page.getByText("ลูกบ้านทดสอบ").first()).toBeVisible();
  await expect(page.getByText("5,000").first()).toBeVisible();
  await noOverflow(page);
  expect(state.requests.some((r) => r.path === "/miniapp/home")).toBeTruthy();
});
test("C02 empty home does not invent a bill", async ({ page, state }) => {
  state.invoices = [];
  await page.goto("/");
  await expect(
    page.getByText(/ยังไม่มี.*บิล|ยังไม่มีใบแจ้งหนี้|ไม่มีบิล/).first(),
  ).toBeVisible();
  await noOverflow(page);
});
test("C03 bills switch unpaid and paid filters", async ({ page }) => {
  await page.goto("/invoices");
  await expect(page.locator('a[href="/invoices/due"]')).toBeVisible();
  await page.getByRole("button", { name: /ชำระแล้ว/ }).click();
  await expect(page.locator('a[href="/invoices/paid"]')).toBeVisible();
  await expect(page.locator('a[href="/invoices/due"]')).toHaveCount(0);
  await noOverflow(page);
});
test("C04 invoice detail contains amounts and links to pay", async ({
  page,
}) => {
  await page.goto("/invoices/due");
  await expect(page.getByText("INV-due")).toBeVisible();
  await expect(page.locator('a[href="/pay/due"]')).toBeVisible();
  await noOverflow(page);
});
for (const status of ["PAID", "VOID", "DRAFT"])
  test("C05 direct payment blocked: " + status, async ({ page, state }) => {
    state.invoices = [bill("due", status)];
    await page.goto("/pay/due");
    await expect(
      page.getByRole("heading", {
        name: status === "PAID" ? "ชำระบิลนี้แล้ว" : "บิลนี้ไม่เปิดรับชำระ",
      }),
    ).toBeVisible();
    await expect(page.locator("input[type=file]")).toHaveCount(0);
    expect(
      state.requests.filter((r) => r.path === "/miniapp/payments/slip"),
    ).toHaveLength(0);
  });
test("C06 pending review prevents duplicate payment", async ({
  page,
  state,
}) => {
  state.invoices = [
    bill("due", "ISSUED", [{ id: "pending", status: "PENDING", amount: 5000 }]),
  ];
  await page.goto("/pay/due");
  await expect(
    page.getByRole("heading", { name: "ได้รับสลิปแล้ว" }),
  ).toBeVisible();
  await expect(page.locator("input[type=file]")).toHaveCount(0);
});
test("C07 partial payment QR requests remaining balance", async ({
  page,
  state,
}) => {
  state.invoices = [
    bill("due", "PARTIALLY_PAID", [
      { id: "partial", status: "APPROVED", amount: 2000 },
    ]),
  ];
  await page.goto("/pay/due");
  await expect(page.getByText("฿3,000.00", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }),
  ).toBeEnabled();
});
test("C08 slip requires both file and transfer time", async ({ page }) => {
  await page.goto("/pay/due");
  await page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("แนบสลิปและระบุเวลาที่โอนให้ครบ");
});
test("C09 unsupported slip rejected before upload", async ({ page, state }) => {
  await page.goto("/pay/due");
  await page
    .getByLabel("เลือกรูปสลิป")
    .setInputFiles({
      name: "bad.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalid"),
    });
  await page.getByLabel("วันที่และเวลาที่โอน").fill("2026-09-06T10:00");
  await page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ไม่เกิน 8 MB");
  expect(
    state.requests.filter((r) => r.path === "/miniapp/payments/slip"),
  ).toHaveLength(0);
});
test("C10 upload persists pending history and blocks repeat payment", async ({
  page,
  state,
}) => {
  await page.goto("/pay/due");
  await page
    .getByLabel("เลือกรูปสลิป")
    .setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("วันที่และเวลาที่โอน").fill("2026-09-06T10:00");
  await page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }).click();
  await expect(
    page.getByRole("heading", { name: "กำลังตรวจสอบสลิป" }),
  ).toBeVisible();
  const uploads = state.requests.filter(
    (r) => r.path === "/miniapp/payments/slip",
  );
  expect(uploads).toHaveLength(1);
  expect(uploads[0].body).toContain("invoiceId");
  expect(uploads[0].body).toContain("due");
  await page.getByRole("link", { name: "ดูประวัติการชำระ" }).click();
  await page.getByRole("button", { name: /รอตรวจ/ }).click();
  await expect(page.locator(".history-entry")).toHaveCount(1);
  await page.goto("/pay/due");
  await expect(
    page.getByRole("heading", { name: "ได้รับสลิปแล้ว" }),
  ).toBeVisible();
});
test("C11 rejected slip displays reason in history", async ({
  page,
  state,
}) => {
  state.invoices = [
    bill("due", "ISSUED", [
      {
        id: "rejected",
        status: "REJECTED",
        amount: 5000,
        rejectReason: "ยอดเงินไม่ตรง",
        paidAt: "2026-09-06",
      },
    ]),
  ];
  await page.goto("/payments");
  await page.getByRole("button", { name: /ไม่ผ่าน/ }).click();
  await expect(page.getByText("ยอดเงินไม่ตรง")).toBeVisible();
});
test("C12 history search and empty filter", async ({ page }) => {
  await page.goto("/payments");
  await expect(page.getByText("ใบเสร็จ RC-QA-001")).toBeVisible();
  await page.getByLabel("ค้นหาประวัติตามเดือนหรือเลขบิล").fill("not-found");
  await expect(
    page.getByRole("heading", { name: "ไม่พบรายการที่เลือก" }),
  ).toBeVisible();
});
test("C13 history links to payment section", async ({ page }) => {
  await page.goto("/payments");
  await page.locator(".history-entry").first().click();
  await expect(page).toHaveURL(new RegExp("invoices/paid#bill-payments"));
  await expect(page.locator("#bill-payments")).toBeVisible();
});
test("C14 empty history has useful next action", async ({ page, state }) => {
  state.invoices = [];
  await page.goto("/payments");
  await expect(
    page.getByRole("heading", { name: "ยังไม่มีประวัติการชำระ" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "ดูบิลของฉัน" })).toBeVisible();
});
test("C15 backend error is visible without fake success", async ({
  page,
  state,
}) => {
  state.fail = "/invoices";
  await page.goto("/payments");
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ทดสอบระบบขัดข้อง");
  await expect(page.locator(".history-entry")).toHaveCount(0);
});
test("C16 missing invoice shows error and return action", async ({ page }) => {
  await page.goto("/pay/missing");
  await expect(
    page.getByRole("heading", { name: "เปิดหน้าชำระเงินไม่ได้" }),
  ).toBeVisible();
  await expect(page.getByText("ไม่พบบิล")).toBeVisible();
});
test("C17 QR failure disables submission", async ({ page, state }) => {
  state.fail = "payment-qr";
  await page.goto("/pay/due");
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("โหลด PromptPay ไม่สำเร็จ");
  await expect(
    page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }),
  ).toBeDisabled();
});
test("C18 LINE logged out offers login", async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("e2e-liff", "logged-out"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /เข้าสู่ระบบ.*LINE/ }),
  ).toBeVisible();
});
test("C19 LINE init failure offers retry", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("e2e-liff", "error"));
  await page.goto("/");
  await expect(page.getByText("LINE offline")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /ลองใหม่|ลองอีกครั้ง/ }),
  ).toBeVisible();
});
test("C20 unlinked resident cannot access bills", async ({ page, state }) => {
  state.unlinked = true;
  await page.goto("/invoices");
  await expect(
    page.getByText(/ยังไม่ได้ผูก.*ห้อง|ยังไม่พบห้อง/).first(),
  ).toBeVisible();
  expect(
    state.requests.filter((r) => r.path === "/miniapp/invoices"),
  ).toHaveLength(0);
});
test("C21 invite claim sends identity and stores session", async ({
  page,
  state,
}) => {
  state.unlinked = true;
  await page.goto("/claim/demo");
  await page.getByLabel("ชื่อ-นามสกุล").fill("ผู้เช่าทดสอบ");
  await page.getByRole("button", { name: "ยืนยันและผูกห้องนี้" }).click();
  await expect(
    page.getByRole("heading", { name: "ห้องของคุณพร้อมใช้งานแล้ว" }),
  ).toBeVisible();
  const request = state.requests.find(
    (r) => r.path === "/miniapp/invites/demo/claim",
  );
  expect(JSON.parse(request!.body!)).toMatchObject({
    idToken: "e2e-id-token",
    fullName: "ผู้เช่าทดสอบ",
  });
});
test("C22 expired invite cannot be claimed", async ({ page }) => {
  await page.goto("/claim/expired");
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ลิงก์หมดอายุ");
  await expect(
    page.getByRole("button", { name: "ยืนยันและผูกห้องนี้" }),
  ).toBeDisabled();
});
for (const route of ["/privacy", "/terms", "/claim/branch/demo"])
  test("C23 route renders " + route, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "ไม่พบหน้านี้" }),
    ).toHaveCount(0);
    await noOverflow(page);
  });

test("C24 branch link registers entered room", async ({ page, state }) => {
  state.unlinked = true;
  await page.goto("/claim/branch/demo");
  await expect(page.getByText("สาขาทดสอบ", { exact: true })).toBeVisible();
  await page.getByLabel("ชื่อ-นามสกุล").fill("ลูกบ้านใหม่");
  await page.getByLabel("เลขห้อง", { exact: true }).fill("101");
  await page.getByRole("button", { name: "ยืนยันและผูกห้องนี้" }).click();
  await expect(
    page.getByRole("heading", { name: "ห้องของคุณพร้อมใช้งานแล้ว" }),
  ).toBeVisible();
  expect(
    JSON.parse(
      state.requests.find((r) => r.path === "/miniapp/branches/demo/claim")!
        .body!,
    ),
  ).toMatchObject({
    fullName: "ลูกบ้านใหม่",
    roomNumber: "101",
    idToken: "e2e-id-token",
  });
  await page.getByRole("link", { name: "ดูบิลของฉัน" }).click();
  await expect(page.getByText("ลูกบ้านทดสอบ").first()).toBeVisible();
});
test("C25 upload failure allows retry without fake success", async ({
  page,
  state,
}) => {
  state.fail = "/payments/slip";
  await page.goto("/pay/due");
  await page
    .getByLabel("เลือกรูปสลิป")
    .setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("วันที่และเวลาที่โอน").fill("2026-09-06T10:00");
  await page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ทดสอบระบบขัดข้อง");
  await expect(
    page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "กำลังตรวจสอบสลิป" }),
  ).toHaveCount(0);
});
test("C26 oversized slip does not upload", async ({ page, state }) => {
  await page.goto("/pay/due");
  await page
    .getByLabel("เลือกรูปสลิป")
    .setInputFiles({
      name: "big.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
    });
  await page.getByLabel("วันที่และเวลาที่โอน").fill("2026-09-06T10:00");
  await page.getByRole("button", { name: "ส่งสลิปให้ตรวจสอบ" }).click();
  await expect(
    page.locator("[role=alert]:not(#__next-route-announcer__)"),
  ).toContainText("ไม่เกิน 8 MB");
  expect(
    state.requests.some((r) => r.path === "/miniapp/payments/slip"),
  ).toBeFalsy();
});
test("C27 customer dark mode persists", async ({ page }) => {
  await page.goto("/invoices");
  await page.getByRole("button", { name: "เปลี่ยนเป็นโหมดมืด" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("C28 legacy branch UUID opens branch registration", async ({ page }) => {
  await page.goto("/claim/11111111-1111-4111-8111-111111111111");
  await expect(page.getByLabel("เลขห้อง", { exact: true })).toBeVisible();
  await expect(page.getByText("สาขาทดสอบ", { exact: true })).toBeVisible();
});
