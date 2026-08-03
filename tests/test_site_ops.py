import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "ops" / "site_ops.py"
SPEC = importlib.util.spec_from_file_location("site_ops", MODULE_PATH)
site_ops = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(site_ops)


class SiteOpsTests(unittest.TestCase):
    def test_live_tree_passes_audit(self):
        self.assertEqual(site_ops.audit(Path(__file__).resolve().parents[1]), [])

    def test_parser_collects_page_requirements(self):
        parser = site_ops.PageParser()
        parser.feed('<title>Example</title><meta name="description" content="Useful page"><link rel="canonical" href="https://example.com/"><h1>One</h1><a href="next.html">Next</a>')
        self.assertEqual(parser.title, "Example")
        self.assertEqual(parser.h1_count, 1)
        self.assertEqual(parser.links, ["next.html"])

    def test_agent_config_has_one_executive_owner_and_five_agents(self):
        config = json.loads(site_ops.CONFIG_PATH.read_text(encoding="utf-8"))
        self.assertEqual(config["executive_owner"], "TeeJay Crawford, Founder & CEO")
        self.assertTrue(config["public_actions_require_executive_authorization"])
        self.assertEqual(len(config["agents"]), 5)

    def test_every_html_page_uses_consent_runtime_without_hardcoded_google_tag(self):
        root = Path(__file__).resolve().parents[1]
        html_pages = list(root.rglob("*.html"))
        self.assertGreater(len(html_pages), 0)
        for page in html_pages:
            source = page.read_text(encoding="utf-8")
            self.assertIn("privacy.js", source, page)
            self.assertNotIn("googletagmanager.com/gtag/js", source, page)
            self.assertNotIn("gtag('config'", source, page)

    def test_privacy_runtime_defaults_to_denied_and_honors_gpc(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "privacy.js").read_text(encoding="utf-8")
        self.assertIn("navigator.globalPrivacyControl === true", source)
        self.assertIn("analytics_storage: 'denied'", source)
        self.assertIn("ad_storage: 'denied'", source)
        self.assertIn("advertising: Boolean(requested.advertising) && !gpcEnabled", source)
        self.assertIn("if (effective.analytics)", source)

    def test_privacy_runtime_matches_reference_preference_flow(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "privacy.js").read_text(encoding="utf-8")
        self.assertIn("Choose how TeeJay\\'s Tech Tools uses cookies.", source)
        self.assertIn("Control optional cookies", source)
        self.assertIn("Reject non-essential", source)
        self.assertIn("Manage choices", source)
        self.assertIn("Booking &amp; payment tools", source)
        for asset in (
            "privacy-shield-check.svg",
            "privacy-cookie.svg",
            "privacy-close.svg",
            "privacy-chevron-right.svg",
        ):
            self.assertTrue((root / "assets" / asset).exists(), asset)

    def test_every_mobile_menu_uses_the_shared_visible_label(self):
        root = Path(__file__).resolve().parents[1]
        menu_pages = []
        for page in root.rglob("*.html"):
            source = page.read_text(encoding="utf-8")
            if 'class="menu-button"' not in source:
                continue
            menu_pages.append(page)
            self.assertIn('class="menu-label" data-menu-label>Menu</span>', source, page)
            self.assertIn('aria-label="Open navigation menu"', source, page)
        self.assertGreater(len(menu_pages), 0)

        runtime = (root / "site.js").read_text(encoding="utf-8")
        self.assertIn("updateMenuLabel(open ? 'Close' : 'Menu');", runtime)

    def test_free_audit_route_uses_the_guarded_intake(self):
        root = Path(__file__).resolve().parents[1]
        audit = (root / "free-ai-audit.html").read_text(encoding="utf-8")
        home = (root / "index.html").read_text(encoding="utf-8")

        self.assertIn('data-intake-form', audit)
        self.assertIn('name="serviceCode" value="free-website-ai-audit"', audit)
        self.assertIn('name="sourcePage" value="free-ai-audit.html"', audit)
        self.assertIn('name="website"', audit)
        self.assertIn('href="free-ai-audit.html"', home)


if __name__ == "__main__":
    unittest.main()
