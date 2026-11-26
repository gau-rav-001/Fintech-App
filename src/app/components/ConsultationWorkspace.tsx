import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch } from "../services/api";

type Role = "user" | "advisor";
type Section = "messages" | "appointments" | "guidance" | "notes";
type RecordItem = {
  id: string; title?: string; content?: string; summary?: string; status?: string; starts_at?: string;
  duration_minutes?: number; initiated_by?: string; sender_type?: string; is_read?: boolean;
  assumptions?: string; risk_disclosure?: string; follow_up?: string; follow_up_completed_at?: string;
  created_at: string;
};
export type AvailableSlot = { id: string; starts_at: string; ends_at: string };
const topics = ["Budget planning", "Expense management", "Emergency fund", "Debt repayment", "Financial goal planning", "Retirement planning", "Risk assessment", "Educational allocation scenario"];
const titles: Record<Section,string> = { messages: "Messages", appointments: "Consultations", guidance: "Planning guidance", notes: "Private notes" };
const panel = "rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-3 text-gray-900 dark:text-gray-100";
export const inputStyle = "w-full rounded-md border border-gray-400 bg-white dark:bg-neutral-800 dark:text-white px-3 py-2 text-sm";
export const actionStyle = "rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50";
export const localTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
export function SlotFields({ prefix = "", initialStart = "", initialDuration = "30" }: { prefix?: string; initialStart?: string; initialDuration?: string }) {
  return <div className="grid gap-2 sm:grid-cols-2">
    <label>Start ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input required type="datetime-local" name={prefix+"start"} defaultValue={initialStart} className={inputStyle}/></label>
    <label>Duration (minutes)<input required type="number" name={prefix+"duration"} min={15} max={120} step={1} defaultValue={initialDuration} className={inputStyle}/></label>
  </div>;
}
export function slotPayload(form: FormData) {
  const wall = String(form.get("start") || "");
  const date = new Date(wall);
  const normalized = new Date(date.getTime() - date.getTimezoneOffset()*60000);
  if (!Number.isFinite(date.getTime()) || normalized.toISOString().slice(0,16) !== wall || date <= new Date()) {
    throw new Error("Choose a valid future time in your local timezone.");
  }
  return { startsAt: date.toISOString(), duration: Number(form.get("duration")) };
}
function message(error: unknown) { return error instanceof Error ? error.message : "Request failed. Please retry."; }

export function ConsultationWorkspace({ role, relationshipId }: { role: Role; relationshipId: string }) {
  const base = role === "advisor" ? "/advisor/workspace/" : "/user/advisor/workspace/";
  const path = base + encodeURIComponent(relationshipId);
  const [section,setSection] = useState<Section>("messages");
  const [page,setPage] = useState(1);
  const [records,setRecords] = useState<RecordItem[]>([]);
  const [more,setMore] = useState(false);
  const [slots,setSlots] = useState<AvailableSlot[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [refresh,setRefresh] = useState(0);
  const [edit,setEdit] = useState("");
  const [selectedSlot,setSelectedSlot] = useState("");
  const [topic,setTopic] = useState(topics[0]);
  const saving = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    const options = { signal: abort.signal };
    setLoading(true); setError(""); setRecords([]); setSlots([]); setMore(false);
    (async () => {
      const [result, windowList] = await Promise.all([
        apiFetch<{ items: RecordItem[]; hasMore: boolean }>(path+"/"+section+"?page="+page, options),
        section === "appointments" ? apiFetch<AvailableSlot[]>(path+"/availability", options) : Promise.resolve({ data: [] }),
      ]);
      if (abort.signal.aborted) return;
      setRecords(result.data.items); setMore(result.data.hasMore); setSlots(windowList.data);
      if (section === "messages") {
        const ids = result.data.items.filter(row => row.sender_type !== role && !row.is_read).map(row => row.id);
        if (ids.length) await apiFetch(path+"/messages/read", { ...options, method:"PATCH",body:JSON.stringify({ids}) });
      }
    })().catch(err => { if (!abort.signal.aborted) setError(message(err)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [path, role, section, page, refresh]);

  async function mutate(url:string, method:string, payload:object, form?:HTMLFormElement) {
    if (saving.current) return;
    saving.current=true; setBusy(true); setError(""); setNotice("");
    try {
      await apiFetch(path + "/" + url, {method, body:JSON.stringify(payload)});
      form?.reset(); setEdit(""); setSelectedSlot(""); setNotice("Saved."); setPage(1); setRefresh(n=>n+1);
    } catch(err) { setError(message(err)); }
    finally { saving.current=false; setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>, recordId?: string) {
    event.preventDefault();
    const form=event.currentTarget;
    const data=new FormData(form);
    try {
      if (section==="appointments") {
        const chosen = slots.find(s => s.id === selectedSlot);
        const time = !recordId && chosen ? {startsAt:new Date(chosen.starts_at).toISOString(), duration:(Date.parse(chosen.ends_at)-Date.parse(chosen.starts_at))/60000} : slotPayload(data);
        return void mutate(recordId ? section+"/"+recordId : section, recordId?"PATCH":"POST",
          recordId ? {action:"reschedule",...time} : {title:data.get("title"),...time}, form);
      }
      const body = Object.fromEntries(data);
      void mutate(section, "POST", body, form);
    } catch(err) { setError(message(err)); }
  }
  return <section className={panel} aria-label="Advisory workspace">
    <h3 className="font-semibold text-lg">Advisory workspace</h3>
    <nav aria-label="Workspace sections" className="flex flex-wrap gap-1">
      {(Object.keys(titles) as Section[]).filter(key=>key!=="notes"||role==="advisor").map(key=>
        <button key={key} type="button" aria-pressed={section===key} disabled={busy} className={"rounded-md px-3 py-2 text-sm "+(section===key?"bg-emerald-800 text-white":"border")}
          onClick={()=>{setSection(key);setPage(1);setEdit("");setNotice("");setSelectedSlot("");}}>{titles[key]}</button>)}
    </nav>
    {error&&<p role="alert" className="text-red-700 dark:text-red-300">{error} <button type="button" className="underline" onClick={()=>setRefresh(n=>n+1)}>Refresh</button></p>}
    {notice&&<p role="status">{notice}</p>}
    {(section!=="guidance" || role==="advisor") && <form key={section} className="space-y-2 text-sm" onSubmit={e=>submit(e)}>
      {(section==="appointments"||section==="notes") && <label className="block">Title<input name="title" className={inputStyle} required maxLength={150}/></label>}
      {section==="appointments" && <>
        {slots.length>0 && <label className="block">Available times<select className={inputStyle} value={selectedSlot} onChange={e=>setSelectedSlot(e.target.value)}><option value="">Propose another time</option>{slots.map(s=><option key={s.id} value={s.id}>{localTime(s.starts_at)} · {(Date.parse(s.ends_at)-Date.parse(s.starts_at))/60000} min</option>)}</select></label>}
        {!selectedSlot && <SlotFields/>}
      </>}
      {(section==="messages"||section==="notes")&&<label className="block">{section==="notes"?"Private consultation note":"Message"}<textarea required name="content" className={inputStyle} maxLength={5000} rows={3}/></label>}
      {section==="guidance"&&<>
        <label className="block">Planning topic<select name="topic" className={inputStyle} value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(t=><option key={t}>{t}</option>)}</select></label>
        {topic===topics[7]?<p>This sends a fixed educational example of dividing ₹1,000 equally across two asset categories.</p>:
          [["summary","Planning guidance",2000],["assumptions","Assumptions",1000],["risks","Risks and limitations",1000],["followUp","Follow-up task",500]].map(([name,label,max])=><label className="block" key={name}>{label}<textarea name={String(name)} required maxLength={Number(max)} className={inputStyle}/></label>)}
      </>}
      <button disabled={busy||loading} className={actionStyle}>{busy?"Saving…":{messages:"Send message",appointments:"Request consultation",notes:"Save private note",guidance:"Share guidance"}[section]}</button>
    </form>}
    {loading ? <p role="status">Loading {titles[section].toLowerCase()}…</p> : records.length===0 && !error ? <p>No {titles[section].toLowerCase()} yet.</p> : null}
    <ul className="space-y-2">{records.map(row=><li key={row.id} className="border-t pt-3 space-y-1 text-sm">
      <strong>{row.title || (row.sender_type===role?"You":role==="advisor"?"Client":"Advisor")}</strong>
      <div>{localTime(row.starts_at||row.created_at)} {row.duration_minutes && " · "+row.duration_minutes+" min"} {row.status && " · "+row.status} {row.sender_type===role&&row.is_read&&" · Read"}</div>
      {(row.content||row.summary)&&<p className="whitespace-pre-wrap break-words">{row.content||row.summary}</p>}
      {row.assumptions&&<p>Assumptions: {row.assumptions}</p>}{row.risk_disclosure&&<p>Risks: {row.risk_disclosure}</p>}{row.follow_up&&<p>Follow-up: {row.follow_up} {row.follow_up_completed_at&&" · Completed"}</p>}
      {section==="guidance" && role==="user" && row.status==="submitted" && <button className={actionStyle} disabled={busy} onClick={()=>mutate("guidance/"+row.id+"/acknowledge","PATCH",{})}>Acknowledge</button>}
      {section==="guidance" && role==="advisor" && row.follow_up && !row.follow_up_completed_at && <button className={actionStyle} disabled={busy} onClick={()=>mutate("guidance/"+row.id+"/follow-up","PATCH",{})}>Complete follow-up</button>}
      {section==="appointments" && ["requested","rescheduled","confirmed"].includes(row.status||"") && <div className="flex flex-wrap gap-2">
        {row.status!=="confirmed" && row.initiated_by!==(role==="user"?"client":"advisor") && Date.parse(row.starts_at!)>Date.now() && <button disabled={busy} className={actionStyle} onClick={()=>mutate("appointments/"+row.id,"PATCH",{action:"confirm"})}>Accept</button>}
        <button disabled={busy} className="underline" onClick={()=>setEdit(edit===row.id?"":row.id)}>Reschedule</button>
        <button disabled={busy} className="underline" onClick={()=>{if(window.confirm("Cancel this consultation for both participants?"))void mutate("appointments/"+row.id,"PATCH",{action:"cancel"});}}>Decline or cancel</button>
        {role==="advisor"&&row.status==="confirmed"&&Date.parse(row.starts_at!)+(row.duration_minutes||0)*60000<=Date.now()&&<button disabled={busy} className="underline" onClick={()=>mutate("appointments/"+row.id,"PATCH",{action:"complete"})}>Mark completed</button>}
        {edit===row.id&&<form className="w-full space-y-2" onSubmit={e=>submit(e,row.id)}><SlotFields/><button disabled={busy} className={actionStyle}>Propose new time</button></form>}
      </div>}
    </li>)}</ul>
    <div className="flex justify-between">{page>1&&<button type="button" disabled={busy} onClick={()=>setPage(p=>p-1)}>Newer</button>}{more&&<button type="button" disabled={busy} onClick={()=>setPage(p=>p+1)}>Older</button>}</div>
  </section>;
}
