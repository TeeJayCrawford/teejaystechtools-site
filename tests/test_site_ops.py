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

    def test_homepage_leads_with_inventory_first_websites_and_google_ads(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "index.html").read_text(encoding="utf-8")
        hero = source.split('<section class="hero-section">', 1)[1].split("</section>", 1)[0]

        self.assertIn("Dealer websites built around your inventory. Google Ads built to sell it.", hero)
        self.assertIn('href="contact.html?service=marketing-spend-truth-pack"', hero)
        self.assertIn("Talk with TeeJay", hero)
        self.assertEqual(hero.count('class="button '), 1)
        self.assertIn("Promote what is in stock", hero)
        self.assertIn('class="agent-network-hero"', hero)
        self.assertEqual(hero.count('class="network-agent '), 7)
        self.assertIn("plain English", hero)
        self.assertNotIn("prepare-only", hero)
        self.assertNotIn("read-only", hero)
        self.assertNotIn('class="ai-audit-promo"', source)

    def test_homepage_presents_complete_dealer_stack_and_attributed_results(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "index.html").read_text(encoding="utf-8")
        stack = source.split('id="dealer-growth-stack"', 1)[1].split("</section>", 1)[0]

        for capability in (
            "All-in-One Dealer Website",
            "Live Inventory Foundation",
            "Google Ads for In-Stock Inventory",
            "Search &amp; Local Discovery",
            "Useful Inventory Merchandising",
            "Calls, Forms &amp; Clear Reporting",
            "Ongoing Dealer Improvements",
        ):
            self.assertIn(capability, stack)
        stack_list = stack.split('class="homepage-stack-list"', 1)[1].split('class="homepage-stack-actions"', 1)[0]
        self.assertEqual(stack_list.count('<a href="'), 7)
        self.assertIn("Born in a franchise store. Built for independents.", source)
        self.assertIn("Every build is scoped to the dealer's inventory, sources, market, and implementation priorities.", source)
        self.assertIn('"@type": "Organization"', source)
        self.assertNotIn('"@type": "ProfessionalService"', source)
        self.assertEqual(source.count("Request this plan"), 3)
        self.assertIn("utm_content=foundation", source)
        self.assertIn("utm_content=inventory-engine", source)
        self.assertIn("utm_content=dealer-growth-stack", source)

    def test_homepage_places_named_live_dealership_proof_before_packages(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "index.html").read_text(encoding="utf-8")
        proof_start = source.index('class="homepage-websites live-builds"')
        packages_start = source.index('id="website-packages"')

        self.assertLess(proof_start, packages_start)
        proof = source[proof_start:packages_start]
        for name, url in (
            ("Get More For Your Trade", "https://getmoreforyourtrade.com/"),
            ("Pettus Trailers", "https://www.pettustrailers.com/"),
            ("APG Customs", "https://apgcustoms.com/"),
        ):
            self.assertIn(name, proof)
            self.assertIn(url, proof)
        self.assertEqual(proof.count("LIVE SITE"), 3)
        self.assertIn("SELECTED LIVE DEALERSHIP WORK", proof)
        self.assertNotIn("Three live builds", proof)
        self.assertIn("pettus-trailers-clean-720.webp", proof)
        self.assertIn("apg-customs-clean-540.webp", proof)
        self.assertNotIn("trailer-storefront-preview", proof)
        self.assertNotIn("custom-vehicle-preview", proof)
        self.assertIn("Map my dealership plan", proof)
        self.assertIn('href="#website-packages"', proof)

    def test_public_site_copy_contains_no_em_dashes(self):
        root = Path(__file__).resolve().parents[1]
        public_suffixes = {".html", ".js", ".md", ".txt"}

        for path in root.rglob("*"):
            if not path.is_file() or path.suffix not in public_suffixes:
                continue
            if ".git" in path.parts or "release-candidates" in path.parts:
                continue
            self.assertNotIn("\u2014", path.read_text(encoding="utf-8"), str(path.relative_to(root)))

    def test_homepage_preserves_accessibility_and_first_paint_guards(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "index.html").read_text(encoding="utf-8")
        styles = (root / "styles.css").read_text(encoding="utf-8")
        runtime = (root / "site.js").read_text(encoding="utf-8")

        self.assertIn('style data-home-critical', source)
        self.assertIn('rel="stylesheet" href="styles.css?', source)
        self.assertIn('media="print" onload="this.media=\'all\'"', source)
        self.assertIn('<noscript><link rel="stylesheet" href="styles.css?', source)
        self.assertIn('body class="site-home motion-booting"', source)
        self.assertIn('alt="TeeJay Crawford seated in a race car" loading="lazy" decoding="async"', source)
        self.assertIn("content-visibility: auto", styles)
        self.assertIn(".site-footer > p a", styles)
        self.assertIn("text-decoration: underline", styles)
        self.assertIn("animation: none", styles)
        self.assertIn("networkField.pauseAnimations", runtime)
        self.assertIn("networkField.unpauseAnimations", runtime)
        self.assertIn("window.setTimeout(startCinematicMotion, 5000)", runtime)

    def test_ai_audit_collects_market_query_and_optional_explicit_competitors(self):
        root = Path(__file__).resolve().parents[1]
        source = (root / "free-ai-search-audit.html").read_text(encoding="utf-8")
        self.assertIn('name="locations"', source)
        self.assertIn('name="problem"', source)
        self.assertIn('name="competitors"', source)
        self.assertIn("Up to 3 business names, separated by commas", source)


if __name__ == "__main__":
    unittest.main()
