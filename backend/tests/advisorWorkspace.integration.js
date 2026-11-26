"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

test("advisor and client workspace through HTTP and PostgreSQL", async t => {
  if (process.env.DB_HOST !== "127.0.0.1" || !/^advisor_suite_[a-z0-9_]+$/.test(process.env.DB_NAME || "")) {
    t.skip("Set DB_HOST=127.0.0.1 and DB_NAME=advisor_suite_<name> before running this live DB suite");
    return;
  }
  process.env.NODE_ENV = "test";
  process.env.EMAIL_MODE = "mock";
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  const express = require("express");
  const db = require("../config/db");
  t.after(() => db.pool.end());
  await require("../db/run").migrateDatabase(db);
  await require("../db/run").migrateDatabase(db);
  const app = express();
  app.use(express.json());
  app.use("/api/advisor", require("../routes/advisorRoutes"));
  app.use("/api/user", require("../routes/userRoutes"));
  app.use(require("../middleware/errorHandler").errorHandler);
  const server = await new Promise(resolve => { const http = app.listen(0,"127.0.0.1",()=>resolve(http)); });
  t.after(async () => {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const base = "http://127.0.0.1:"+server.address().port+"/api";
  const signing = require("../utils/jwt").signToken;
  const nonce = crypto.randomUUID();
  const fixture = async (query,args) => (await db.query(query,args)).rows[0].id;
  const advisor = await fixture("INSERT INTO advisors(full_name,email,password_hash,firm_name,license_number,is_email_verified,approval_status) VALUES('Test Advisor',$1,'unused','Test Firm','synthetic',true,'approved') RETURNING id", [nonce+"@advisor.invalid"]);
  const owner = await fixture("INSERT INTO users(full_name,email) VALUES('Test Owner',$1) RETURNING id", [nonce+"@owner.invalid"]);
  const other = await fixture("INSERT INTO users(full_name,email) VALUES('Test Client',$1) RETURNING id", [nonce+"@other.invalid"]);
  const relation = await fixture("INSERT INTO advisor_client_relationships(advisor_id,user_id,client_email,status) VALUES($1,$2,$3,'active') RETURNING id",[advisor,owner,nonce+"@owner.invalid"]);
  const advisorToken=signing({role:"advisor",id:advisor});
  const ownerToken=signing({role:"user",id:owner});
  const outsiderToken=signing({role:"user",id:other});
  const clientPath="/user/advisor/workspace/"+relation;
  const advisorPath="/advisor/workspace/"+relation;
  async function request(path, token, method="GET", data) {
    const res=await fetch(base+path,{method, headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});
    const result=await res.json();
    return {status:res.status,...result};
  }
  function check(response,status) {assert.equal(response.status,status,response.message);return response.data;}
  check(await request(clientPath+"/messages",null),401);
  check(await request(clientPath+"/messages",outsiderToken),403);
  check(await request(advisorPath+"/messages",ownerToken),403);
  check(await request(clientPath+"/messages",ownerToken,"POST",{content:"empty",advisorId:other}),422);
  const sent=check(await request(clientPath+"/messages",ownerToken,"POST",{content:"My question"}),201);
  assert.equal(check(await request(advisorPath+"/messages",advisorToken),200).items[0].content,"My question");
  check(await request(advisorPath+"/messages/read",advisorToken,"PATCH",{ids:[sent.id]}),200);
  assert.equal(check(await request(clientPath+"/messages",ownerToken),200).items[0].is_read,true);
  check(await request(advisorPath+"/notes",advisorToken,"POST",{title:"Review",content:"Private note"}),201);
  check(await request(clientPath+"/notes",ownerToken),404);
  const slot=new Date(Date.now()+86400000); slot.setUTCSeconds(0,0);
  const time={startsAt:slot.toISOString(),duration:45};
  check(await request("/advisor/practice/availability",advisorToken,"POST",time),201);
  assert.equal(check(await request(clientPath+"/availability",ownerToken),200).length,1);
  const concurrent=await Promise.all([1,2].map(()=>request(clientPath+"/appointments",ownerToken,"POST",{title:"Budget check",...time})));
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
  const appointment=concurrent.find(r=>r.status===201).data.id;
  const action=advisorPath+"/appointments/"+appointment;
  check(await request(clientPath+"/appointments/"+appointment,ownerToken,"PATCH",{action:"confirm"}),409);
  check(await request(action,advisorToken,"PATCH",{action:"confirm"}),200);
  check(await request(action,advisorToken,"PATCH",{action:"complete"}),409);
  const next={startsAt:new Date(slot.getTime()+3600000).toISOString(),duration:30};
  check(await request(action,advisorToken,"PATCH",{action:"reschedule",...next}),200);
  check(await request(clientPath+"/appointments/"+appointment,ownerToken,"PATCH",{action:"confirm"}),200);
  const guidance=check(await request(advisorPath+"/guidance",advisorToken,"POST",{topic:"Budget planning",summary:"Review fixed bills.",assumptions:"Recorded income",risks:"Irregular expenses",followUp:"Review next month"}),201);
  check(await request(clientPath+"/guidance/"+guidance.id+"/acknowledge",ownerToken,"PATCH",{}),200);
  check(await request(advisorPath+"/guidance/"+guidance.id+"/follow-up",advisorToken,"PATCH",{}),200);
  const activity=check(await request("/advisor/practice/activity",advisorToken),200);
  assert.equal(activity.upcoming,1);assert.equal(activity.unread,0);assert.equal(activity.followups,0);
  check(await request(action,advisorToken,"PATCH",{action:"cancel"}),200);
  check(await request("/advisor/practice/profile",advisorToken,"PATCH",{bio:"Qualified",experienceYears:5,specializations:["Budgeting"]}),200);
  check(await request("/advisor/practice/profile",advisorToken,"PATCH",{approvalStatus:"approved"}),422);
  assert.ok((await db.query("SELECT 1 FROM notifications WHERE recipient_id=$1",[owner])).rowCount>0);
  await db.query("UPDATE advisor_client_relationships SET status='terminated' WHERE id=$1",[relation]);
  check(await request(clientPath+"/appointments",ownerToken),403);
  check(await request(advisorPath+"/messages",advisorToken),403);
});
