#!/usr/bin/env python3
"""Pure fetch+analyze for Competitor Radar. No workspace CLI dependency.
Input:  JSON on argv[1] = {"customers":[{"id","customer_name","competitor_name","competitor_domain"}], "prior_notes":[{customer_id,competitor_name,note_date,analyst,note}]}
Output: JSON on stdout = {"per_customer":[{customer_id,competitor_name,tracked:[{url,page_type}],
        extracts:[{page_type,url,content}], notes:[{analyst,note}], severity, brief}]}
Nimble + Claude only. The caller persists results via app db/api tools."""
import os, json, re, sys, urllib.request, datetime
NIMBLE=os.environ["NIMBLE_API_KEY"]
TODAY=datetime.date.today().isoformat()

def http(url,method="GET",body=None,headers=None,timeout=180):
    h={"Content-Type":"application/json"}; h.update(headers or {})
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(url,data=data,method=method,headers=h)
    with urllib.request.urlopen(req,timeout=timeout) as r: return json.loads(r.read().decode())
def nmap(u): return http("https://sdk.nimbleway.com/v1/map","POST",{"url":u},{"Authorization":f"Bearer {NIMBLE}"})
def nextract(u):
    for m in ({"render":True,"wait_for":3000},{"render":True,"wait_for":5000,"scroll":True},{"render":True,"wait_until":"networkidle"}):
        b={"url":u,"formats":["markdown"]}; b.update(m)
        try:
            d=http("https://sdk.nimbleway.com/v1/extract","POST",b,{"Authorization":f"Bearer {NIMBLE}"})
            md=((d.get("data") or {}).get("markdown") or "")
            if len(md)>200: return md[:18000]
        except Exception: continue
    return ""
ANTHROPIC_KEY=os.environ["ANTHROPIC_API_KEY"]
ANTHROPIC_MODEL=os.environ.get("ANTHROPIC_MODEL","claude-3-5-haiku-latest")
def claude(p,mt=1500):
    r=http("https://api.anthropic.com/v1/messages","POST",
        {"model":ANTHROPIC_MODEL,"max_tokens":mt,"messages":[{"role":"user","content":p}]},
        {"x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"})
    return "".join(b.get("text","") for b in r.get("content",[]))
def cls(u):
    p=u.lower()
    if re.search(r'/pricing|/plans?(/|$)',p): return 'pricing'
    if re.search(r'/careers?|/jobs?|/join-?us|greenhouse|lever\.co|/hiring',p): return 'careers'
    if re.search(r'/changelog|/release-?notes|/whats-?new',p): return 'changelog'
    if re.search(r'/blog|/news|/articles?|/glossary',p): return 'blog'
    return 'other'

SPECS=[("Pricing Analyst","pricing","List every pricing tier, price, and feature visible. Flag new tiers, price changes, or removed features."),
("Hiring Analyst","careers","List open roles and departments. Identify hiring clusters (multiple roles in one area = investment signal)."),
("Changelog Analyst","changelog","List concrete product changes. Separate real new features from bug fixes. Flag strategic direction."),
("Content Analyst","blog","Identify repeated themes and messaging. What is emphasized? Note positioning or messaging shifts.")]

def run(payload):
    prior=payload.get("prior_notes",[])
    out=[]
    for c in payload["customers"]:
        cid=c["id"]; cname=c["customer_name"]; comp=c["competitor_name"]; dom=c["competitor_domain"]
        links=[l["url"] for l in nmap(f"https://{dom}").get("links",[]) if isinstance(l,dict) and l.get("url")]
        picked={}
        for u in links:
            t=cls(u)
            if t in ("pricing","careers","changelog"): picked[u]=t
        for u in [x for x in links if cls(x)=="blog"][:4]: picked[u]="blog"
        extracts=[]
        for u,t in picked.items():
            md=nextract(u)
            if md: extracts.append({"page_type":t,"url":u,"content":md})
        notes=[]
        for analyst,ptype,instr in SPECS:
            ps=[e for e in extracts if e["page_type"]==ptype]
            if not ps: continue
            blob="\n\n---\n\n".join(f"URL: {p['url']}\n{p['content'][:6000]}" for p in ps[:4])
            note=claude(f"You are the {analyst} tracking {comp} for {cname}. {instr}\n\nBased ONLY on the content below, write a concise note (max 170 words). If nothing meaningful, say 'No signal.'\n\nPAGES:\n{blob}").strip()
            notes.append({"analyst":analyst,"note":note})
        sev=None; brief=None
        if notes:
            pv=[p for p in prior if p.get("competitor_name")==comp and str(p.get("customer_id"))==str(cid)]
            pv=sorted(pv,key=lambda x:x.get("note_date",""),reverse=True)[:16]
            pvtxt="\n\n".join(f"[{p['note_date']} {p['analyst']}] {p['note']}" for p in pv) or "(no prior notes)"
            tdy="\n\n".join(f"## {n['analyst']}\n{n['note']}" for n in notes)
            raw=re.sub(r'```(json)?','',claude(
                f"You are the Strategist for {cname}, tracking {comp}. Find patterns where signals line up "
                f"(hiring+pricing+content same direction) AND trends building over weeks. "
                f"Severity 1-5: 1-2 noise, 3 notable, 4-5 act today. STRICT JSON only, no fences: "
                f"{{\"severity\": <int>, \"brief\": \"<max 200 words, specific & actionable>\"}}.\n\nTODAY:\n{tdy}\n\nPRIOR 4 WEEKS:\n{pvtxt}")).replace('```','').strip()
            try: j=json.loads(raw); sev=int(j["severity"]); brief=j["brief"]
            except Exception: sev=3; brief=raw[:1500]
        out.append({"customer_id":cid,"customer_name":cname,"competitor_name":comp,
            "tracked":[{"url":u,"page_type":t} for u,t in picked.items()],
            "extracts":[{"page_type":e["page_type"],"url":e["url"],"content":e["content"]} for e in extracts],
            "notes":notes,"severity":sev,"brief":brief})
    print(json.dumps({"date":TODAY,"per_customer":out}))

if __name__=="__main__":
    run(json.loads(sys.argv[1]) if len(sys.argv)>1 else json.load(sys.stdin))
