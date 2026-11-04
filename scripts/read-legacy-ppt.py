"""Extract actual legacy PowerPoint text atoms without opening or running the deck."""
import json
import struct
import sys

def records(data):
    offset=0
    while offset+8<=len(data):
        options,kind,size=struct.unpack_from('<HHI',data,offset);offset+=8
        if size>len(data)-offset:break
        body=data[offset:offset+size];offset+=size
        yield options,kind,body

def read_slides(data):
    pages=[]
    def visit(data):
        for options,kind,body in records(data):
            if kind==4080 and options>>4==0:
                text=[]
                for _,atom,payload in records(body):
                    if atom==1011:
                        if text:pages.append('\n'.join(text));text=[]
                    elif atom in (4000,4008):
                        value=payload.decode('utf-16-le' if atom==4000 else 'cp1252',errors='replace').replace('\r','\n').replace('\x0b','\n').strip('\0\n')
                        if value:text.append(value)
                if text:pages.append('\n'.join(text))
            elif options&15==15:visit(body)
    visit(data)
    return {'text':'\n\f\n'.join(pages),'pages':[{'number':i+1,'text':text,'extraction':'text','label':f'Slide {i+1}'} for i,text in enumerate(pages)]}

if __name__=='__main__':
    import olefile
    with olefile.OleFileIO(sys.argv[1]) as deck:result=read_slides(deck.openstream('PowerPoint Document').read())
    print(json.dumps(result,ensure_ascii=False))
