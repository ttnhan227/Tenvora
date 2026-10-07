"""Validate the upload packet without requiring Android or Flutter tooling."""
from pathlib import Path
import hashlib,json,struct,zlib
ROOT=Path(__file__).resolve().parent

def png(path):
    data=path.read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n',f'{path}: PNG signature'
    offset=8
    while offset<len(data):
        length=struct.unpack('>I',data[offset:offset+4])[0]
        block=data[offset+4:offset+8+length]
        crc=struct.unpack('>I',data[offset+8+length:offset+12+length])[0]
        assert zlib.crc32(block)&0xffffffff==crc,f'{path}: corrupt PNG chunk'
        offset+=12+length
    width,height,depth,color=struct.unpack('>IIBB',data[16:26])
    assert depth==8,f'{path}: 8-bit channels required'
    return {'file':str(path.relative_to(ROOT)).replace('\\','/'),'width':width,'height':height,'color_type':color,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}

def main():
    icon=png(ROOT/'app-icon.png'); graphic=png(ROOT/'feature-graphic.png')
    assert (icon['width'],icon['height'],icon['color_type'])==(512,512,6)
    assert icon['bytes']<=1024*1024
    assert (graphic['width'],graphic['height'],graphic['color_type'])==(1024,500,2)
    captures=[]
    for language in ['en-US']:
        files=sorted((ROOT/'screenshots'/language).glob('*.png'))
        assert 4<=len(files)<=8,f'{language}: expected 4–8 phone screenshots'
        for path in files:
            info=png(path)
            assert (info['width'],info['height'],info['color_type'])==(1080,1920,2),f'{path}: expected opaque 1080x1920 capture'
            captures.append(info)
    for folder in [ROOT,ROOT/'vi-VN']:
        assert len((folder/'short-description.txt').read_text(encoding='utf-8-sig').strip())<=80
        assert len((folder/'full-description.txt').read_text(encoding='utf-8-sig'))<=4000
        assert len((folder/'release-notes.txt').read_text(encoding='utf-8-sig'))<=500
    print(json.dumps({'icon':icon,'feature_graphic':graphic,'screenshots':captures},indent=2))

if __name__=='__main__': main()
