import importlib.util
import json
from html.parser import HTMLParser
from pathlib import Path
import tempfile
import unittest
from urllib.parse import unquote, urlparse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build', ROOT / 'scripts/build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self.ids = []; self.h1 = 0
    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if 'id' in attr: self.ids.append(attr['id'])
        if tag == 'h1': self.h1 += 1
        for key in ['href', 'src']:
            if key in attr: self.links.append(attr[key])


class SiteTests(unittest.TestCase):
    def test_build_links_ids_and_public_asset_boundary(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'site'
            build.build(output)
            self.assertFalse((output / '.github').exists())
            self.assertFalse((output / 'site.config.json').exists())
            self.assertFalse((output / 'scripts').exists())
            documents = {}
            for path in output.rglob('*.html'):
                parser = Links(); parser.feed(path.read_text()); documents[path.resolve()] = parser
                self.assertEqual(parser.h1, 1, str(path))
                self.assertEqual(len(parser.ids), len(set(parser.ids)), str(path))
            for path, parser in documents.items():
                for link in parser.links:
                    parts = urlparse(link)
                    if parts.scheme or parts.netloc: continue
                    target = (output / unquote(parts.path).lstrip('/')) if parts.path.startswith('/') else path.parent / unquote(parts.path)
                    target = target.resolve() if parts.path else path
                    if target.is_dir(): target = target / 'index.html'
                    self.assertTrue(target.exists(), f'{path.name}: {link}')
                    if parts.fragment:
                        self.assertIn(unquote(parts.fragment), documents[target].ids, link)
            with zipfile.ZipFile(output / 'downloads/password-reset.zip') as archive:
                self.assertIn('password-reset/intent.md', archive.namelist())
                self.assertIn('status: draft', archive.read('password-reset/plan.md').decode())

    def test_invalid_destinations_are_rejected(self):
        base = json.loads((ROOT / 'site.config.json').read_text())
        for changes in [{'contactEmail': 'bad\naddress'}, {'sponsorUrl':'javascript:alert(1)'}, {'sponsorUrl':'https://github.com/other'},
                        {'checkoutUrl':'https://buy.example.com'}, {'bitcoinAddress':'bc1fake', 'bitcoinAddressVerified':True},
                        {'bitcoinAddressVerified':True}, {'commerceEnabled':'yes'}, {'checkoutUrl':'https://user:pass@example.com', 'commerceEnabled':True}]:
            with self.subTest(changes=changes):
                with self.assertRaises(ValueError): build.validate_config({**base, **changes})

    def test_bitcoin_checksum_requires_owner_verification(self):
        # BIP173 valid mainnet native SegWit test vector, never a real donation config.
        base = json.loads((ROOT / 'site.config.json').read_text())
        address = 'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4'
        with self.assertRaises(ValueError): build.validate_config({**base, 'bitcoinAddress':address})
        build.validate_config({**base, 'bitcoinAddress':address, 'bitcoinAddressVerified':True})
        with self.assertRaises(ValueError): build.validate_config({**base, 'bitcoinAddress':address[:-1]+'Q', 'bitcoinAddressVerified':True})

    def test_build_does_not_remove_arbitrary_existing_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            marker = Path(tmp) / 'keep.txt'; marker.write_text('user data')
            with self.assertRaises(ValueError): build.build(Path(tmp))
            self.assertEqual(marker.read_text(), 'user data')


if __name__ == '__main__': unittest.main()
