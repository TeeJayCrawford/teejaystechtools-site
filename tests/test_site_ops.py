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
        parser.feed('<title>Example</title><meta name="description" content="Useful page"><meta name="google-site-verification" content="verification-token"><link rel="canonical" href="https://example.com/"><h1>One</h1><a href="next.html">Next</a>')
        self.assertEqual(parser.title, "Example")
        self.assertEqual(parser.h1_count, 1)
        self.assertEqual(parser.links, ["next.html"])
        self.assertEqual(parser.google_site_verification, "verification-token")

    def test_public_discovery_files_are_present_and_bounded(self):
        root = Path(__file__).resolve().parents[1]
        robots = (root / "robots.txt").read_text(encoding="utf-8")
        llms = (root / "llms.txt").read_text(encoding="utf-8")
        self.assertIn("User-agent: *", robots)
        self.assertIn("Sitemap: https://teejaystechtools.com/sitemap.xml", robots)
        self.assertLessEqual(len(llms.encode("utf-8")), 4096)
        self.assertTrue(llms.startswith("# TeeJay's Tech Tools\n\n> "))
        self.assertIn("- [Free AI Search Visibility Audit](https://teejaystechtools.com/free-ai-search-audit.html):", llms)
        indexnow_keys = [path for path in root.glob("*.txt") if len(path.stem) == 32]
        self.assertEqual(len(indexnow_keys), 1)
        self.assertEqual(indexnow_keys[0].read_text(encoding="utf-8").strip(), indexnow_keys[0].stem)

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

    def test_homepage_leads_with_free_ai_audit_and_preserves_agent_network(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "index.html").read_text(encoding="utf-8")
        hero = source.split('<section class="hero-section">', 1)[1].split("</section>", 1)[0]

        self.assertIn("Will AI recommend your business—or your competitor?", hero)
        self.assertIn('href="free-ai-search-audit.html"', hero)
        self.assertIn('href="free-ai-search-audit.html#deliverables"', hero)
        self.assertIn('class="agent-network-hero"', hero)
        self.assertIn("read-only", hero)
        self.assertIn("prepare-only", hero)
        self.assertNotIn('class="ai-audit-promo"', source)

    def test_ai_audit_collects_market_query_and_optional_explicit_competitors(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "free-ai-search-audit.html").read_text(encoding="utf-8")
        self.assertIn('name="locations"', source)
        self.assertIn('name="problem"', source)
        self.assertIn('name="competitors"', source)
        self.assertIn("Up to 3 business names, separated by commas", source)


if __name__ == "__main__":
    unittest.main()
