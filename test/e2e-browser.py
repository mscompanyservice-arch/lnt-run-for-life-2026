"""End-to-end browser test of the real UI at phone size. Run: python3 e2e.py"""
import re, struct, zlib, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3100"
OUT = "/home/claude/e2e/shots"
errors = []

def png_bytes():
    raw = b"".join(b"\x00" + b"\x40\xa0\x60" * 40 for _ in range(40))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 40, 40, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")

open("/home/claude/e2e/proof.png", "wb").write(png_bytes())

def watch(page):
    page.on("console", lambda m: m.type in ("error", "warning") and errors.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

def pick_dob(page, member, y, m, d):
    page.select_option(f'select[data-dob="{member}"][data-part="d"]', d)
    page.select_option(f'select[data-dob="{member}"][data-part="m"]', m)
    page.select_option(f'select[data-dob="{member}"][data-part="y"]', y)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="lo-LA")
    page = ctx.new_page(); watch(page)

    page.goto(BASE + "/"); page.wait_for_selector(".cat-card")
    page.screenshot(path=f"{OUT}/01-landing.png", full_page=True)
    assert "380,000 ກີບ" in page.content() and "880,000 ກີບ" in page.content()

    # --- senior age rule (47 years on event day) is caught in the browser ---
    page.goto(BASE + "/register"); page.wait_for_selector('input[name="category"]')
    page.check('input[name="category"][value="senior"]')
    page.fill('[data-k="contactName"]', "ທ້າວ ທົດສອບ ອາຍຸ")
    page.check('input[data-k="members.0.gender"][value="male"]')
    pick_dob(page, 0, "1978", "12", "27")
    assert "ບໍ່ເຖິງ 48 ປີ" in page.content(), "senior age warning shown"
    pick_dob(page, 0, "1978", "12", "26")
    assert "ບໍ່ເຖິງ 48 ປີ" not in page.content()
    page.evaluate("sessionStorage.clear()")

    # --- family registration with 4 members ---
    page.goto(BASE + "/register"); page.wait_for_selector('input[name="category"]')
    page.check('input[name="category"][value="family"]')
    page.click("#toReview")  # empty submit -> validation messages
    assert page.locator(".field-error").count() > 3
    page.fill('[data-k="teamName"]', "ຄອບຄົວ ນ້ຳທາ")
    page.fill('[data-k="contactName"]', "ນາງ ມະນີ ພອນສະຫວັນ")
    page.fill('[data-k="contactPhone"]', "020 5512 3456")
    people = [("ທ້າວ ສົມພອນ ພອນສະຫວັນ", "male", "1980", "03", "15", "L"), ("ນາງ ມະນີ ພອນສະຫວັນ", "female", "1983", "07", "02", "M"),
              ("ດ.ຊ ໂຊກໄຊ", "male", "2014", "11", "20", "S"), ("ດ.ຍ ນ້ອຍ", "female", "2017", "01", "09", "XS")]
    page.click("#addMember")
    for i, (n, g, y, m, d, s) in enumerate(people):
        page.fill(f'[data-k="members.{i}.fullName"]', n)
        page.check(f'input[data-k="members.{i}.gender"][value="{g}"]')
        pick_dob(page, i, y, m, d)
        page.select_option(f'select[data-k="members.{i}.shirtSize"]', s)
    page.check('[data-k="consent"]')
    assert "1,179,000 ກີບ" in page.inner_text("#feebar")
    page.screenshot(path=f"{OUT}/02-family-form.png", full_page=True)
    # reload keeps the draft (simulates accidental refresh)
    page.reload(); page.wait_for_selector('[data-k="teamName"]')
    assert page.input_value('[data-k="teamName"]') == "ຄອບຄົວ ນ້ຳທາ"
    page.click("#toReview"); page.wait_for_selector("#submitBtn")
    page.screenshot(path=f"{OUT}/03-review.png", full_page=True)
    page.dblclick("#submitBtn")  # double click must not create two registrations
    page.wait_for_url(re.compile(r".*/status#r=.*"))
    page.wait_for_selector(".codebox")
    ref = page.locator(".codebox").nth(0).inner_text(); code = page.locator(".codebox").nth(1).inner_text()
    assert "ຍັງບໍ່ໄດ້ຈ່າຍເງິນ" in page.content()
    page.screenshot(path=f"{OUT}/04-saved-unpaid.png", full_page=True)

    # --- upload proof ---
    page.set_input_files("#proofFile", "/home/claude/e2e/proof.png")
    page.click("#upBtn")
    page.wait_for_selector("text=ລໍຖ້າພະນັກງານກວດສອບ")
    page.screenshot(path=f"{OUT}/05-awaiting-review.png", full_page=True)

    # --- lookup with ref+code on a clean page ---
    p2 = ctx.new_page(); watch(p2)
    p2.goto(BASE + "/status"); p2.fill("#lr", ref); p2.fill("#lc", "WRONG-CODE-1234"); p2.click("button[type=submit]")
    p2.wait_for_selector(".alert.err")
    p2.fill("#lc", code); p2.click("button[type=submit]"); p2.wait_for_selector("text=ສະຖານະການລົງທະບຽນ")
    p2.close()

    # --- admin ---
    a = ctx.new_page(); watch(a)
    a.goto(BASE + "/admin"); a.fill("#u", "owner"); a.fill("#p", "e2e-owner-pass-123"); a.click("button[type=submit]")
    a.wait_for_selector(".stats")
    a.screenshot(path=f"{OUT}/06-admin-dashboard.png", full_page=True)
    dash = a.inner_text(".stats")
    assert "4" in dash
    a.goto(BASE + "/admin#/payments"); a.wait_for_selector(".row-link")
    a.click(".row-link"); a.wait_for_selector('[data-act="confirmPay"]')
    a.click('[data-act="confirmPay"]'); a.fill("#askIn", "BCEL OnePay ທົດສອບ"); a.click('[data-a="ok"]')
    a.wait_for_selector('text=ຢືນຢັນ 1,179,000 ກີບ')
    for i in range(2):
        a.locator('[data-act="autoBib"]').nth(i).click(); a.wait_for_timeout(500)
    a.locator('[data-act="kit"]').nth(0).check(); a.wait_for_timeout(500)
    a.screenshot(path=f"{OUT}/07-admin-registration.png", full_page=True)
    a.goto(BASE + "/admin#/reports"); a.wait_for_selector("text=ຈຳນວນເສື້ອຕາມຂະໜາດ")
    a.screenshot(path=f"{OUT}/08-admin-reports.png", full_page=True)

    page.reload(); page.wait_for_selector(".codebox")
    assert "ຢືນຢັນການຈ່າຍເງິນແລ້ວ" in page.content()
    txt = page.content()
    assert "5001" in txt and "5002" in txt
    page.screenshot(path=f"{OUT}/09-confirmed-participant-view.png", full_page=True)

    # desktop width check
    d = b.new_page(viewport={"width": 1280, "height": 900}); watch(d)
    d.goto(BASE + "/"); d.wait_for_selector(".cat-card"); d.screenshot(path=f"{OUT}/10-landing-desktop.png", full_page=True)
    # horizontal overflow check at phone width
    for path in ["/", "/register", "/status"]:
        page.goto(BASE + path); page.wait_for_timeout(400)
        over = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        assert over <= 0, f"horizontal overflow on {path}: {over}px"
    b.close()

print("REF", ref)
print("console errors:", errors if errors else "none")
sys.exit(1 if errors else 0)
