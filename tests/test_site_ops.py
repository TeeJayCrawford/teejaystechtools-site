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

    def test_agent_config_has_one_human_gate_and_five_agents(self):
        config = json.loads(site_ops.CONFIG_PATH.read_text(encoding="utf-8"))
        self.assertEqual(config["human_gate"], "TeeJay Crawford")
        self.assertTrue(config["public_actions_require_approval"])
        self.assertEqual(len(config["agents"]), 5)


if __name__ == "__main__":
    unittest.main()
