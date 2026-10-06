"""Verify release metadata, permissions, and 64-bit ELF alignment in a Play bundle."""
import argparse
import hashlib
import json
import re
import struct
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('bundle', type=Path)
parser.add_argument('--manifest', type=Path, required=True)
parser.add_argument('--config', type=Path, required=True)
parser.add_argument('--certificate-report', type=Path, required=True)
parser.add_argument('--expected-certificate', type=Path, required=True)
args = parser.parse_args()
android = '{http://schemas.android.com/apk/res/android}'
root = ET.fromstring(args.manifest.read_text(encoding='utf-8'))
assert root.get('package') == 'com.tenvora.app', 'Unexpected application ID'
assert root.get(android+'versionName') == '1.0.0', 'Unexpected release version'
assert int(root.get(android+'versionCode', '0')) > 0
assert int(root.find('uses-sdk').get(android+'targetSdkVersion', '0')) >= 36
app = root.find('application')
assert app.get(android+'debuggable', 'false') == 'false'
assert app.get(android+'testOnly', 'false') == 'false'
assert app.get(android+'allowBackup') == 'false', 'Credential backup must be disabled'
assert app.get(android+'usesCleartextTraffic') == 'false', 'Production traffic must use HTTPS'
permissions = {p.get(android+'name') for p in root.findall('uses-permission')}
assert not permissions.intersection({
    'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_CONTACTS', 'android.permission.RECORD_AUDIO',
    'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.QUERY_ALL_PACKAGES', 'com.google.android.gms.permission.AD_ID',
}), f'Unexpected sensitive permission: {permissions}'
assert 'PAGE_ALIGNMENT_16K' in args.config.read_text(encoding='utf-8'), 'Bundle must request 16 KB page alignment'
expected = args.expected_certificate.read_text().strip().lower()
report = args.certificate_report.read_text(encoding='utf-8')
fingerprints = re.findall(r'SHA256:\s*([A-Fa-f0-9:]+)', report)
assert expected in [f.replace(':','').lower() for f in fingerprints], 'Bundle signing key differs from the distribution key'
checked = []
with zipfile.ZipFile(args.bundle) as archive:
    for name in archive.namelist():
        if not name.endswith('.so') or not any(f'/lib/{abi}/' in name for abi in ['arm64-v8a','x86_64']):
            continue
        elf = archive.read(name)
        assert elf[:4] == b'\x7fELF' and elf[4] == 2 and elf[5] == 1, name
        offset = struct.unpack_from('<Q', elf, 32)[0]
        width, count = struct.unpack_from('<HH', elf, 54)
        for index in range(count):
            pos = offset + index*width
            if struct.unpack_from('<I',elf,pos)[0] != 1: continue
            file_offset, virtual_address = struct.unpack_from('<QQ',elf,pos+8)
            alignment = struct.unpack_from('<Q',elf,pos+48)[0]
            assert alignment >= 16384 and file_offset % 16384 == virtual_address % 16384, f'{name}: incompatible ELF segment'
        checked.append(name)
assert checked, 'No 64-bit native libraries found'
sha = hashlib.file_digest(args.bundle.open('rb'),'sha256').hexdigest()
receipt = {'version':'1.0.0','version_code':int(root.get(android+'versionCode')), 'package':'com.tenvora.app', 'target_sdk':int(root.find('uses-sdk').get(android+'targetSdkVersion')), 'signing_certificate_verified':True, 'native_libraries_16kb_verified':checked, 'permissions':sorted(permissions), 'sha256':sha, 'bytes':args.bundle.stat().st_size}
args.bundle.with_suffix('.verification.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
args.bundle.with_suffix('.aab.sha256').write_text(sha+'  '+args.bundle.name+'\n',encoding='ascii')
print(json.dumps(receipt))
