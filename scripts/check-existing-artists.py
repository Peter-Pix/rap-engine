import os, json

PROFILES = [
    "Separ", "Marpo", "Orion", "Ben Cristovao", "Gleb", "PTK", "Pil C",
    "Fobia Kid", "Fvck_kvlt", "Hellwana", "Mike Trafik", "Arleta", "Vercetti CG"
]

existing = set()
for d in os.listdir("content/entities"):
    if d.startswith("artist_"):
        try:
            meta = json.load(open(f"content/entities/{d}/meta.json"))
            existing.add(meta["title"].lower().replace(" ", "").replace("-",""))
        except: pass

for p in PROFILES:
    key = p.lower().replace(" ", "").replace("-","").replace("_","")
    exists = key in existing
    print(f"{'EXISTS' if exists else 'MISSING'}: {p}")
