import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, type AdvisorProfile } from "../services/api";
import { actionStyle, inputStyle, localTime, SlotFields, slotPayload, type AvailableSlot } from "./ConsultationWorkspace";

type Activity = { pending:number; upcoming:number; unread:number; followups:number; activity:{label:string;created_at:string}[] };
const panel = "rounded-2xl border bg-white dark:bg-neutral-900 dark:text-white p-5 space-y-3";
const reason = (err:unknown) => err instanceof Error ? err.message : "Request failed.";

export function PracticeActivity() {
  const [data,setData]=useState<Activity|null>(null);
  const [error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const abort=new AbortController();
    setError(""); setData(null);
    apiFetch<Activity>("/advisor/practice/activity",{signal:abort.signal}).then(r=>{if(!abort.signal.aborted)setData(r.data);})
      .catch(err=>{if(!abort.signal.aborted)setError(reason(err));});
    return ()=>abort.abort();
  },[revision]);
  return <section className={panel}>
    <div className="flex items-center justify-between"><h3 className="font-semibold">Consultation activity</h3><button type="button" className="underline text-sm" onClick={()=>setRevision(x=>x+1)}>Refresh</button></div>
    {error?<p role="alert">{error}</p>:!data?<p role="status">Loading activity…</p>:<>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">{Object.entries({pending:"Awaiting confirmation",upcoming:"Upcoming appointments",unread:"Unread messages",followups:"Open follow-ups"}).map(([key,label])=><div key={key}><dt className="text-sm">{label}</dt><dd className="font-semibold text-xl">{data[key as keyof Omit<Activity,"activity">]}</dd></div>)}</dl>
      {data.activity.length?<ul className="space-y-1">{data.activity.map((item,i)=><li key={i} className="text-sm">{item.label} · {localTime(item.created_at)}</li>)}</ul>:<p>No recent consultation activity.</p>}
    </>}
  </section>;
}

export function PracticeProfile({ advisor,onSaved }: { advisor:AdvisorProfile; onSaved:(p:AdvisorProfile)=>void }) {
  const [slots,setSlots]=useState<AvailableSlot[]>([]);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const abort=new AbortController(); setLoading(true); setError("");
    apiFetch<AvailableSlot[]>("/advisor/practice/availability",{signal:abort.signal})
      .then(r=>{if(!abort.signal.aborted)setSlots(r.data);})
      .catch(err=>{if(!abort.signal.aborted)setError(reason(err));})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[revision]);
  async function save(kind:"profile"|"slot"|"close",form?:HTMLFormElement,slotId?:string) {
    if(busy)return; setBusy(true);setNotice("");setError("");
    try {
      const data=new FormData(form);
      if(kind==="profile") {
        const payload={ bio:data.get("bio"),experienceYears:Number(data.get("years")),specializations:String(data.get("specialties")||"").split(",").map(s=>s.trim()).filter(Boolean) };
        const result=await apiFetch<AdvisorProfile>("/advisor/practice/profile",{method:"PATCH",body:JSON.stringify(payload)});
        onSaved(result.data);
      } else {
        const closing=kind==="close";
        const url="/advisor/practice/availability"+(closing?"/"+slotId+"/close":"");
        await apiFetch(url,{method:closing?"PATCH":"POST",body:JSON.stringify(closing?{}:slotPayload(data))});
        form?.reset();setRevision(n=>n+1);
      }
      setNotice("Changes saved.");
    } catch(err) {setError(reason(err));} finally{setBusy(false);}
  }
  function submit(event:FormEvent<HTMLFormElement>, kind:"profile"|"slot"){event.preventDefault();void save(kind,event.currentTarget);}
  return <div className="space-y-3">
    <form onSubmit={e=>submit(e,"profile")} className={panel}>
      <h3 className="font-semibold">Professional profile</h3>
      <label className="block">Qualifications and professional bio<textarea className={inputStyle} name="bio" maxLength={2000} defaultValue={advisor.bio}/></label>
      <label className="block">Specialties (comma separated)<input className={inputStyle} name="specialties" maxLength={970} defaultValue={advisor.specializations.join(", ")}/></label>
      <label className="block">Years of experience<input className={inputStyle} type="number" min={0} max={70} required name="years" defaultValue={advisor.experienceYears}/></label>
      <button disabled={busy} className={actionStyle}>Save professional profile</button>
    </form>
    <section className={panel}><h3 className="font-semibold">Consultation availability</h3>
      <form className="space-y-2" onSubmit={e=>submit(e,"slot")}><SlotFields/><button className={actionStyle} disabled={busy}>Publish available time</button></form>
      {loading?<p role="status">Loading availability…</p>:slots.length?<ul>{slots.map(s=><li key={s.id} className="flex flex-wrap items-center gap-3">{localTime(s.starts_at)} – {localTime(s.ends_at)}<button disabled={busy} className="underline" onClick={()=>{if(window.confirm("Withdraw this available time?"))void save("close",undefined,s.id);}}>Withdraw</button></li>)}</ul>:!error&&<p>No open times published.</p>}
    </section>
    {error&&<p role="alert" className="text-red-700">{error} <button type="button" className="underline" onClick={()=>setRevision(n=>n+1)}>Refresh availability</button></p>}
    {notice&&<p role="status">{notice}</p>}
  </div>;
}
