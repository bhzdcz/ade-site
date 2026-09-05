#!/usr/bin/env python3
"""Build public assets from an explicit allowlist. No private source checkout."""
import argparse
import json
from pathlib import Path
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def validate_config(config):
    expected = {'contactEmail', 'checkoutUrl', 'sponsorUrl', 'bitcoinAddress', 'bitcoinAddressVerified', 'commerceEnabled'}
    if set(config) != expected:
        raise ValueError('Config fields do not match the documented schema')
    if not isinstance(config['commerceEnabled'], bool) or not isinstance(config['bitcoinAddressVerified'], bool):
        raise ValueError('Configuration flags must be booleans')
    if not isinstance(config['contactEmail'], str) or not re.fullmatch(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', config['contactEmail']):
        raise ValueError('A valid public contact email is required')
    from urllib.parse import urlparse
    for key in ['checkoutUrl', 'sponsorUrl']:
        value = config[key]
        if not isinstance(value, str):
            raise ValueError(f'{key} must be a string')
        if value:
            url = urlparse(value)
            if url.scheme != 'https' or not url.hostname or url.username or url.password or any(c.isspace() for c in value) or any(c in value for c in '<>"\\'):
                raise ValueError(f'{key} requires a valid HTTPS destination')
            if key == 'sponsorUrl' and (url.hostname != 'github.com' or not re.fullmatch(r'/sponsors/[A-Za-z0-9-]+/?', url.path)):
                raise ValueError('sponsorUrl must identify a GitHub Sponsors profile')
    address = config['bitcoinAddress']
    if not isinstance(address, str):
        raise ValueError('Bitcoin address must be a string')
    if address:
        # Native SegWit only. Validate witness program and BIP173/BIP350 checksum.
        if address.lower() != address and address.upper() != address:
            raise ValueError('Mixed-case Bitcoin address')
        address = address.lower()
        if not address.startswith('bc1') or len(address) > 90:
            raise ValueError('Use a Bitcoin mainnet native SegWit address (bc1)')
        alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
        if any(c not in alphabet for c in address[3:]) or len(address) < 14:
            raise ValueError('Invalid Bitcoin address alphabet or length')
        values = [alphabet.index(c) for c in address[3:]]
        checksum = 1
        for value in [3, 3, 0, 2, 3] + values:
            top = checksum >> 25
            checksum = ((checksum & 0x1ffffff) << 5) ^ value
            for i, generator in enumerate([0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]):
                if (top >> i) & 1:
                    checksum ^= generator
        version = values[0]
        if version > 16 or checksum != (1 if version == 0 else 0x2bc830a3):
            raise ValueError('Invalid Bitcoin address checksum')
        bits = ''.join(f'{v:05b}' for v in values[1:-6])
        size, remainder = divmod(len(bits), 8)
        if remainder >= 5 or (remainder and int(bits[-remainder:], 2)) or not 2 <= size <= 40 or (version == 0 and size not in [20, 32]):
            raise ValueError('Invalid Bitcoin witness program')
        if not config['bitcoinAddressVerified']:
            raise ValueError('Owner must verify the address in their own wallet before enabling donations')
    elif config['bitcoinAddressVerified']:
        raise ValueError('Cannot verify an empty Bitcoin address')
    if config['checkoutUrl'] and not config['commerceEnabled']:
        raise ValueError('Enable commerce only after confirming hosting and offer terms')
    return config


def build(output):
    output = output.resolve()
    if output == ROOT or ROOT.is_relative_to(output) or output.is_symlink():
        raise ValueError('Choose a dedicated build directory')
    config = validate_config(json.loads((ROOT / 'site.config.json').read_text()))
    # Only remove the known generated directory, never an arbitrary --output path.
    if output.exists():
        if output != ROOT / 'dist':
            raise ValueError('Output exists; choose a new directory')
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for name in ['index.html', '404.html', 'styles.css', 'main.js', 'robots.txt', 'sitemap.xml', 'CNAME', 'assets', 'docs', 'privacy', 'support', 'downloads']:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, output / name)
        else:
            shutil.copy2(src, output / name)
    # Configuration changes propagate through static mailto links, including no-JS use.
    for path in output.rglob('*.html'):
        content = path.read_text().replace('behzad@airoweb.com', config['contactEmail'])
        if config['checkoutUrl'] or config['sponsorUrl'] or config['bitcoinAddress']:
            content = content.replace('No checkout or donation destination is currently configured.', 'Configured payment and donation links, if shown, are listed on the support page.')
        path.write_text(content)
    data = json.dumps(config).replace('<', '\\u003c').replace('>', '\\u003e')
    (output / 'config.js').write_text('window.ADE_CONFIG = Object.freeze(' + data + ');\n')
    # Example is authored public content, not extracted from the private product repo.
    with zipfile.ZipFile(output / 'downloads/password-reset.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted((ROOT / 'downloads/password-reset').iterdir()):
            info = zipfile.ZipInfo('password-reset/' + path.name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())
    print('Built public site: ' + str(output))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default=str(ROOT / 'dist'))
    args = parser.parse_args()
    try:
        build(Path(args.output))
    except (ValueError, OSError) as exc:
        parser.exit(1, f'Build failed: {exc}\n')
