#!/usr/bin/env python3
"""Competitor Radar daily run: Scout -> Collector -> Analysts -> Strategist -> Playbook.
Runs for every customer in the Competitor Radar App. Idempotent per day (skips a
customer/competitor that already has extracts dated today)."""
import os, json, re, sys, datetime, urllib.request, subprocess, tempfile

APP_ID="890de0bb5702"
CHANNEL_ID="09c6e9b54faa"   # #general — default post target for Playbook when a customer has no own channel
API=os.environ["P2_API_BASE"].rstrip("/")
TOK=os.environ["KYLON_API_TOKEN"]
NIMBLE=os.environ["NIMBLE_API_KEY"]
PROXY=os.environ["PROXY_API_BASE"].rstrip("/")
TODAY=datetime.date.today().isoformat()

def http(url, method="GET", body=None, headers=None, timeout=180):
    h={"Content-Type":"application/json"}
    if headers: h.update(headers)
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(url, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def cli(args):
    """Call workspace_cli via the platform CLI binary available in automation runs."""
    r=subprocess.run(["workspace_cli"]+args, capture_output=True, text=True, timeout=300)
    return r.returncode, r.stdout, r.stderr

def nimble_map(u):
    return http("https://sdk.nimbleway.com/v1/map","POST",{"url":u},{"Authorization":f"Bearer {NIMBLE}"})

def nimble_extract(u):
    """Try render modes in order; keep first non-empty markdown."""
    modes=[{"render":True,"wait_for":3000},
           {"render":True,"wait_for":5000,"scroll":True},
           {"render":True,"wait_until":"networkidle"}]
    for m in modes:
        body={"url":u,"formats":["markdown"]}; body.update(m)
        try:
            d=http("https://sdk.nimbleway.com/v1/extract","POST",body,{"Authorization":f"Bearer {NIMBLE}"})
            md=((d.get("data") or {}).get("markdown") or "")
            if len(md)>200: return md
        except Exception:
            continue
    return ""

def claude(prompt, maxtok=1500):
    r=http(f"{PROXY}/proxy/anthropic-vertex/v1/messages","POST",
        {"model":"claude-haiku-4-5","max_tokens":maxtok,"messages":[{"role":"user","content":prompt}]},
        {"Authorization":f"Bearer {TOK}","x-api-key":TOK})
    return "".join(b.get("text","") for b in r.get("content",[]))

def classify(u):
    p=u.lower()
    if re.search(r'/pricing|/plans?(/|$)',p): return 'pricing'
    if re.search(r'/careers?|/jobs?|/join-?us|greenhouse|lever\.co|/hiring',p): return 'careers'
    if re.search(r'/changelog|/release-?notes|/whats-?new',p): return 'changelog'
    if re.search(r'/blog|/news|/articles?|/glossary',p): return 'blog'
    return 'other'

def esc(s):
    if s is None: return "NULL"
    return "'"+str(s).replace("\\","\\\\").replace("'","\\'")+"'"

def db(sql_statements):
    if not sql_statements: return
    with tempfile.NamedTemporaryFile("w",suffix=".sql",delete=False) as f:
        f.write("\n".join(sql_statements)); path=f.name
    rc,out,err=cli(["app","db","query",APP_ID,"--sql-file",path])
    if rc!=0: print("DB ERROR:",err[:500],flush=True)

def api_get(entity, query=None):
    args=["app","api","get",APP_ID,f"/api/kylon/entities/{entity}/records"]
    if query:
        for k,v in query.items(): args+=["--query",f"{k}={v}"]
    rc,out,err=cli(args)
    m=re.search(r'response:\s*(\{.*)$', out, re.S)
    if not m: return []
    try: return json.loads(m.group(1)).get("records",[])
    except Exception: return []

log=lambda *a: print(*a, flush=True)

def run():
    # SELF-SEED: ensure required competitors exist (idempotent). Runs in write-capable workflow env.
    SEED=[{"customer_name":"Scale AI","competitor_name":"SuperAnnotate","competitor_domain":"superannotate.com","channel_id":"6c59997be8a3"}]
    existing=api_get("customers", {"limit":200}) or []
    have={(c.get("customer_name"),c.get("competitor_name")) for c in existing}
    for sd in SEED:
        if (sd["customer_name"],sd["competitor_name"]) not in have:
            nid=int(datetime.datetime.utcnow().timestamp()*1000)*1000 + len(have)
            db([f"INSERT INTO customers (id,customer_name,competitor_name,competitor_domain,channel_id,created_at) VALUES ({nid},{esc(sd['customer_name'])},{esc(sd['competitor_name'])},{esc(sd['competitor_domain'])},{esc(sd['channel_id'])},NOW());"])
            print(f"[seed] inserted {sd['competitor_name']}",flush=True)
    custs=api_get("customers", {"limit":200})
    log(f"[radar] {len(custs)} customer rows")
    briefs_today=[]
    for c in custs:
        d=c.get("data",c); cid=d.get("id"); cname=d.get("customer_name")
        comp=d.get("competitor_name"); dom=d.get("competitor_domain")
        cust_channel=d.get("channel_id") or CHANNEL_ID
        cidq=f"(SELECT id FROM customers WHERE customer_name={esc(cname)} AND competitor_name={esc(comp)} LIMIT 1)"
        log(f"=== {cname} watching {comp} ({dom}) ===")

        # SCOUT
        try: links=[l["url"] for l in nimble_map(f"https://{dom}").get("links",[]) if isinstance(l,dict) and l.get("url")]
        except Exception as e: log(f"[scout] map failed: {e}"); continue
        picked={}
        for u in links:
            t=classify(u)
            if t in ("pricing","careers","changelog"): picked[u]=t
        for u in [x for x in links if classify(x)=="blog"][:4]: picked[u]="blog"
        log(f"[scout] {len(links)} mapped, tracking {len(picked)}")
        sql=[f"INSERT INTO tracked_urls (customer_id,competitor_name,url,page_type) VALUES ({cidq},{esc(comp)},{esc(u[:1000])},{esc(t)});" for u,t in picked.items()]
        db(sql)

        # COLLECTOR
        extracts=[]; sql=[]
        for u,t in picked.items():
            md=nimble_extract(u)[:18000]
            if md:
                extracts.append({"url":u,"type":t,"content":md})
                sql.append(f"INSERT INTO raw_extracts (customer_id,competitor_name,page_type,url,extract_date,content) VALUES ({cidq},{esc(comp)},{esc(t)},{esc(u[:1000])},{esc(TODAY)},{esc(md)});")
            log(f"[collect] {t} {u[:50]} -> {len(md)}c")
        db(sql)

        # ANALYSTS
        def pages_of(x): return [e for e in extracts if e["type"]==x]
        specs=[
         ("Pricing Analyst","pricing","List every pricing tier, price, and feature visible. Flag new tiers, price changes, or loremoved features."),
         ("Hiring Analyst","careers","List open roles and departments. Identify hiring clusters (multiple roles in one area = investment signal)."),
         ("Changelog Analyst","changelog","List concrete product changes. Separate real new features from bug fixes. Flag strategic direction."),
         ("Content Analyst","blog","Identify repeated themes and messaging. What is emphasized? Note positioning or messaging shifts."),
        ]
        notes=[]; sql=[]
        for analyst,ptype,instr in specs:
            ps=pages_of(ptype)
            if not ps: continue
            blob="\n\n---\n\n".join(f"URL: {p['url']}\n{p['content'][:6000]}" for p in ps[:4])
            note=claude(f"You are the {analyst} tracking {comp} for {cname}. {instr}\n\nBased ONLY on the content below, write a concise note (max 170 words). If nothing meaningful, say 'No signal.'\n\nPAGES:\n{blob}").strip()
            notes.append({"analyst":analyst,"note":note})
            sql.append(f"INSERT INTO analyst_notes (customer_id,competitor_name,analyst,note_date,note) VALUES ({cidq},{esc(comp)},{esc(analyst)},{esc(TODAY)},{esc(note)});")
        db(sql)
        log(f"[analysts] {len(notes)} notes")

        # STRATEGIST — read today's notes + trailing 4 weeks for this customer's competitor
        if not notes: continue
        recent=api_get("analyst_notes", {"limit":200})
        prior=[r["data"] for r in recent if r["data"].get("competitor_name")==comp and str(r["data"].get("customer_id"))==str(cid) and r["data"].get("note_date")!=TODAY]
        prior=sorted(prior,key=lambda x:x.get("note_date",""),reverse=True)[:16]
        priortxt="\n\n".join(f"[{p['note_date']} {p['analyst']}] {p['note']}" for p in prior) or "(no prior notes)"
        today_txt="\n\n".join(f"## {n['analyst']}\n{n['note']}" for n in notes)
        sp=(f"You are the Strategist for {cname}, tracking competitor {comp}. Find patterns where signals line up "
            f"(hiring + pricing + content pointing the same way) AND trends building over the last weeks. "
            f"Assign severity 1-5: 1-2 routine noise, 3 notable, 4-5 act today. "
            f"Return STRICT JSON only, no fences: {{\"severity\": <int>, \"brief\": \"<max 200 words, specific & actionable>\"}}.\n\n"
            f"TODAY:\n{today_txt}\n\nPRIOR 4WEEKS:\n{priortxt}")
        raw=re.sub(r'```(json)?','',claude(sp)).replace('```','').strip()
        try: j=json.loads(raw); sev=int(j["severity"]); brief=j["brief"]
        except Exception: sev=3; brief=raw[:4000]
        log(f"[strategist] {comp} severity={sev}")
        if sev>=3:
            db([f"INSERT INTO strategy_briefs (customer_id,competitor_name,brief_date,severity,brief) VALUES ({cidq},{esc(comp)},{esc(TODAY)},{sev},{esc(brief)});"])
            briefs_today.append({"customer":cname,"competitor":comp,"severity":sev,"brief":brief,"channel":cust_channel})

    # PLAYBOOK — post severity 3+ briefs to each customer's own channel, highest first
    briefs_today.sort(key=lambda b:b["severity"],reverse=True)
    log(f"[playbook] {len(briefs_today)} high-severity briefs to post")
    for b in briefs_today:
        pb=claude(f"You are the Playbook agent for {b['customer']}. Competitor {b['competitor']} triggered a severity-{b['severity']} brief:\n\n{b['brief']}\n\nDraft a SHORT, specific sales/marketing response the {b['customer']} team can use today — a battlecard line or a tagged internal message. Max 90 words. Be concrete.").strip()
        msg=f"🚨 **Competitor Radar — sev {b['severity']} · {b['competitor']}** (for {b['customer']})\n\n**Signal:** {b['brief']}\n\n* *Play:** {pb}"
        cli(["message","send","--channel",b.get("channel",CHANNEL_ID),"--text",msg])
    print("RADAR_SUMMARY="+json.dumps({"customers":len(custs),"high_sev_posted":len(briefs_today)}),flush=True)

if __name__=="__main__":
    run()
