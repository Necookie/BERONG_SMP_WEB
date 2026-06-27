/**
 * Synthetic dataset seeder for BerongSMP dashboard.
 * Reads TURSO_URL + TURSO_TOKEN from ../.dev.vars (never committed).
 * Run: node apps/dashboard/scripts/seed-synthetic.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const devVars = readFileSync(resolve(__dir, "../.dev.vars"), "utf8");
const env = Object.fromEntries(
  devVars.split("\n").filter(l => l.includes("=")).map(l => l.split("=").map(s => s.trim()))
);
const TURSO_URL   = env.TURSO_URL;
const TURSO_TOKEN = env.TURSO_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Missing TURSO_URL or TURSO_TOKEN in .dev.vars"); process.exit(1);
}

async function pipeline(requests) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  for (const r of json.results ?? []) {
    if (r.type === "error") throw new Error(`Turso SQL error: ${r.error?.message ?? JSON.stringify(r)}`);
  }
  return json;
}

async function silentAlter(sql) {
  try { await pipeline([ex(sql)]); } catch { /* column may already exist */ }
}

const t  = v => ({ type: "text",    value: String(v) });
const i  = v => ({ type: "integer", value: String(Math.round(Number(v))) });
const f  = v => ({ type: "float",   value: Number(v) });
const ex = (sql, args = []) => ({ type: "execute", stmt: { sql, args } });

// ── Event helpers ─────────────────────────────────────────────────────────────

const ptick  = (ms,x,y,z,room,fd) => ({type:"PLAYER_TICK",tOffsetMs:ms,data:{x,y,z,room,nearest_fire_dist:fd}});
const dopen  = (ms,t,x,y,z,haz)   => ({type:"door_open",tOffsetMs:ms,data:{t,x,y:String(y),z,target:"dark_oak_door",hazard_distance:haz}});
const pinpull= (ms)                => ({type:"EXT_PIN_PULL",tOffsetMs:ms,data:{pulled:true}});
const spray  = (ms,hit,fd)         => ({type:"EXT_SPRAY",tOffsetMs:ms,data:{hit_fire:hit,distance_to_fire:fd,nearby_player_count:0}});
const co2    = (ms,hit)            => ({type:"extinguisher_use",tOffsetMs:ms,data:{hit_target:hit,nearby_player_count:0}});
const alarm  = (ms,t,x,y,z,haz)   => ({type:"fire_alarm_activate",tOffsetMs:ms,data:{t,x,y:String(y),z,hazard_distance:haz}});
const assem  = (ms,t,x,y,z)       => ({type:"assembly_area_reached",tOffsetMs:ms,data:{t,x,y:String(y),z,hazard_distance:99}});
const exit_  = (ms,t,x,y,z,haz,lbl)=>({type:"emergency_exit",tOffsetMs:ms,data:{t,x,y:String(y),z,hazard_distance:haz,exit:lbl}});
const sstart = (ms,st,mag,x,y,z)  => ({type:"SIM_START",tOffsetMs:ms,data:{sim_type:st,magnitude:mag,x,y,z}});
const send   = (ms,reason,score,passed,fires,spread,mag) => {
  const d={end_reason:reason,score,passed};
  if(fires!==undefined)  d.fires_extinguished=fires;
  if(spread!==undefined) d.fire_spread_count=spread;
  if(mag!==undefined)    d.magnitude=mag;
  return {type:"SIM_END",tOffsetMs:ms,data:d};
};

// ── Scenario builders ─────────────────────────────────────────────────────────

// fireHigh — Ana Dela Cruz (score 88): fast pin pull, alarm early, 7 accurate hits
const fireHighAna = () => [
  sstart(200,"FIRE",0,38,-32,91),
  ptick(1000,38,-32,91,"MAIN_HALL",14.2), ptick(2000,41,-32,93,"MAIN_HALL",11.8),
  pinpull(2400),
  ptick(3000,43,-32,95,"MAIN_HALL",9.4), spray(3600,false,9.4),
  ptick(4000,45,-32,97,"MAIN_HALL",7.2), spray(4800,true,6.8),
  ptick(5000,46,-32,98,"MAIN_HALL",6.0), spray(6000,true,5.1),
  alarm(6800,6.6,48.3,-32,99.8,4.5),
  ptick(7000,48,-32,100,"MAIN_HALL",4.5), spray(7200,true,4.2),
  ptick(8000,48,-32,101,"MAIN_HALL",4.8), spray(8400,true,3.9),
  ptick(9000,47,-32,101,"MAIN_HALL",4.1), spray(9600,true,3.7),
  ptick(10000,46,-32,99,"MAIN_HALL",5.2), ptick(11000,44,-32,96,"MAIN_HALL",7.4),
  ptick(12000,42,-32,93,"MAIN_HALL",9.1), dopen(12500,12.3,41.5,-32,92.8,9.8),
  ptick(13000,40,-32,90,"MAIN_HALL",11.6), dopen(14600,14.4,37.2,-32,86.4,14.1),
  ptick(15000,36,-32,84,"ENTRANCE",15.8), ptick(16000,35,-32,82,"ENTRANCE",17.2),
  ptick(17000,37,-32,79,"OUTSIDE",19.0), ptick(18000,40,-32,76,"OUTSIDE",21.4),
  ptick(19000,43,-32,74,"OUTSIDE",24.1), exit_(19800,19.6,44.2,-32,73.1,24.8,"main_exit"),
  ptick(20000,46,-32,72,"OUTSIDE",26.7), ptick(21000,49,-32,70,"OUTSIDE",29.3),
  ptick(22000,52,-32,68,"OUTSIDE",32.1), assem(22800,22.6,53.4,-32,66.8),
  send(22900,"assembly_reached",88,true,18,72),
];

// fireHigh — Miguel Santos (score 82): slower pin pull, alarm at ~9s, 5 accurate hits
const fireHighMiguel = () => [
  sstart(200,"FIRE",0,37,-32,90),
  ptick(1000,37,-32,90,"MAIN_HALL",15.1), ptick(2000,39,-32,92,"MAIN_HALL",12.8),
  ptick(3000,41,-32,94,"MAIN_HALL",10.4), pinpull(3600),
  ptick(4000,43,-32,96,"MAIN_HALL",8.6),  spray(4400,false,8.6),
  ptick(5000,44,-32,97,"MAIN_HALL",7.8),  spray(5600,false,7.8),
  ptick(6000,45,-32,98,"MAIN_HALL",7.0),  spray(6800,true,6.4),
  ptick(7000,46,-32,99,"MAIN_HALL",6.1),  spray(7600,true,5.7),
  alarm(8200,8.0,47.5,-32,100.2,5.2),
  ptick(8000,46,-32,99,"MAIN_HALL",5.2),  spray(9000,true,4.9),
  ptick(9000,46,-32,99,"MAIN_HALL",4.9),  spray(9800,true,4.6),
  ptick(10000,45,-32,98,"MAIN_HALL",5.3), spray(10600,true,5.0),
  ptick(11000,44,-32,96,"MAIN_HALL",6.6), ptick(12000,43,-32,94,"MAIN_HALL",8.2),
  dopen(13000,12.8,42.4,-32,93.1,8.9),    ptick(13000,41,-32,91,"MAIN_HALL",10.5),
  ptick(14000,39,-32,88,"ENTRANCE",13.1), dopen(15200,15.0,37.8,-32,85.2,15.4),
  ptick(15000,36,-32,85,"ENTRANCE",15.9), ptick(16000,34,-32,82,"ENTRANCE",18.2),
  ptick(17000,36,-32,79,"OUTSIDE",20.4),  ptick(18000,39,-32,77,"OUTSIDE",22.8),
  exit_(18600,18.4,40.8,-32,76.1,23.5,"main_exit"),
  ptick(19000,42,-32,75,"OUTSIDE",25.1),  ptick(20000,46,-32,73,"OUTSIDE",27.9),
  ptick(21000,49,-32,71,"OUTSIDE",30.6),  ptick(22000,51,-32,69,"OUTSIDE",32.8),
  ptick(23000,53,-32,68,"OUTSIDE",34.7),  assem(24100,23.9,54.2,-32,67.1),
  send(24200,"assembly_reached",82,true,14,84),
];

// fireHigh — Ryan Mendoza (score 91): fastest response, alarm at 5.3s, 9 accurate hits
const fireHighRyan = () => [
  sstart(200,"FIRE",0,39,-32,92),
  ptick(1000,39,-32,92,"MAIN_HALL",13.6), pinpull(1800),
  ptick(2000,42,-32,95,"MAIN_HALL",10.9), spray(2600,false,10.9),
  ptick(3000,44,-32,97,"MAIN_HALL",8.4),  spray(3400,true,7.6),
  ptick(4000,46,-32,99,"MAIN_HALL",5.9),  spray(4200,true,5.2),
  alarm(4800,4.6,47.6,-32,100.4,4.8),
  ptick(5000,47,-32,100,"MAIN_HALL",4.8), spray(5400,true,4.3),
  ptick(6000,48,-32,101,"MAIN_HALL",3.9), spray(6200,true,3.6),
  ptick(7000,48,-32,101,"MAIN_HALL",3.9), spray(7000,true,3.8),
  ptick(8000,47,-32,100,"MAIN_HALL",4.2), spray(7800,true,4.0),
  ptick(9000,46,-32,98,"MAIN_HALL",5.1),  spray(8600,true,4.8),
  ptick(10000,45,-32,97,"MAIN_HALL",5.8), spray(9400,true,5.5),
  ptick(11000,43,-32,94,"MAIN_HALL",8.0), dopen(11400,11.2,42.1,-32,93.4,8.7),
  ptick(12000,40,-32,91,"MAIN_HALL",10.3),dopen(12900,12.7,37.4,-32,86.8,13.6),
  ptick(13000,37,-32,85,"ENTRANCE",14.2), ptick(14000,35,-32,82,"ENTRANCE",16.8),
  exit_(14600,14.4,34.2,-32,81.1,17.4,"main_exit"),
  ptick(15000,37,-32,79,"OUTSIDE",18.5),  ptick(16000,40,-32,77,"OUTSIDE",20.9),
  ptick(17000,44,-32,75,"OUTSIDE",23.6),  ptick(18000,47,-32,73,"OUTSIDE",26.2),
  ptick(19000,50,-32,71,"OUTSIDE",28.8),  assem(19800,19.6,52.1,-32,69.4),
  send(19900,"assembly_reached",91,true,22,68),
];

// fireMed — Maria Reyes (score 62): no alarm, moderate hits, average speed
const fireMed = () => [
  sstart(200,"FIRE",0,35,-32,89),
  ptick(1000,35,-32,89,"MAIN_HALL",16.4), ptick(2000,37,-32,91,"MAIN_HALL",13.8),
  ptick(3000,39,-32,93,"MAIN_HALL",11.2), ptick(4000,41,-32,95,"MAIN_HALL",9.0),
  ptick(5000,43,-32,97,"MAIN_HALL",7.4),  pinpull(5800),
  ptick(6000,44,-32,98,"MAIN_HALL",6.9),  spray(6600,false,6.9),
  ptick(7000,45,-32,99,"MAIN_HALL",6.0),  spray(7800,true,5.4),
  ptick(8000,46,-32,100,"MAIN_HALL",5.4), spray(9000,false,5.8),
  ptick(9000,46,-32,100,"MAIN_HALL",5.8), spray(10200,true,5.1),
  ptick(10000,45,-32,99,"MAIN_HALL",5.1), ptick(11000,44,-32,97,"MAIN_HALL",6.2),
  ptick(12000,42,-32,95,"MAIN_HALL",7.8), ptick(13000,40,-32,92,"MAIN_HALL",10.3),
  dopen(13500,13.3,39.7,-32,91.2,10.8),   ptick(14000,38,-32,89,"ENTRANCE",12.9),
  ptick(15000,36,-32,86,"ENTRANCE",15.1), ptick(16000,35,-32,83,"ENTRANCE",17.3),
  ptick(17000,37,-32,80,"OUTSIDE",19.5),  ptick(18000,40,-32,77,"OUTSIDE",22.1),
  dopen(18700,18.5,41.2,-32,75.8,23.4),   ptick(19000,43,-32,75,"OUTSIDE",24.6),
  ptick(20000,47,-32,73,"OUTSIDE",27.2),  ptick(21000,50,-32,71,"OUTSIDE",30.0),
  assem(21500,21.3,51.8,-32,69.4),
  send(21600,"assembly_reached",62,true,8,95),
];

// fireMed — Jasmine Lim (score 45): no alarm, few hits, hesitant near fire, late assembly
const fireMedJasmine = () => [
  sstart(200,"FIRE",0,34,-32,88),
  ptick(1000,34,-32,88,"MAIN_HALL",17.8), ptick(2000,36,-32,90,"MAIN_HALL",15.2),
  ptick(3000,38,-32,92,"MAIN_HALL",13.0), ptick(4000,40,-32,93,"MAIN_HALL",11.6),
  ptick(5000,41,-32,94,"MAIN_HALL",10.9), ptick(6000,42,-32,95,"MAIN_HALL",10.1),
  pinpull(6800),
  ptick(7000,43,-32,96,"MAIN_HALL",9.4),  spray(7400,false,9.4),
  ptick(8000,43,-32,96,"MAIN_HALL",9.4),  spray(8800,false,9.4),
  ptick(9000,44,-32,97,"MAIN_HALL",8.7),  spray(9600,true,8.2),
  ptick(10000,44,-32,97,"MAIN_HALL",8.7), ptick(11000,43,-32,96,"MAIN_HALL",9.0),
  ptick(12000,42,-32,95,"MAIN_HALL",9.8), ptick(13000,41,-32,93,"MAIN_HALL",11.4),
  ptick(14000,40,-32,91,"MAIN_HALL",12.8),spray(14400,true,12.1),
  ptick(15000,39,-32,89,"MAIN_HALL",13.5),
  dopen(15800,15.6,38.2,-32,88.4,14.2),   ptick(16000,37,-32,86,"ENTRANCE",15.8),
  ptick(17000,35,-32,83,"ENTRANCE",18.2),  ptick(18000,33,-32,81,"ENTRANCE",20.1),
  ptick(19000,35,-32,78,"OUTSIDE",22.4),   ptick(20000,38,-32,76,"OUTSIDE",24.8),
  ptick(21000,41,-32,74,"OUTSIDE",27.3),   ptick(22000,44,-32,72,"OUTSIDE",29.9),
  dopen(22600,22.4,44.9,-32,71.3,30.6),    ptick(23000,47,-32,71,"OUTSIDE",32.4),
  ptick(24000,49,-32,70,"OUTSIDE",33.8),   assem(24900,24.7,50.6,-32,69.6),
  send(25000,"assembly_reached",45,true,4,108),
];

// fireMed — Sofia Aguilar (score 58): no alarm, moderate hits, uses side door early
const fireMedSofia = () => [
  sstart(200,"FIRE",0,36,-32,90),
  ptick(1000,36,-32,90,"MAIN_HALL",15.9), ptick(2000,38,-32,92,"MAIN_HALL",13.6),
  ptick(3000,40,-32,94,"MAIN_HALL",11.3), pinpull(3800),
  ptick(4000,42,-32,96,"MAIN_HALL",9.5),  spray(4600,true,8.8),
  ptick(5000,43,-32,97,"MAIN_HALL",8.6),  spray(5800,true,7.4),
  ptick(6000,44,-32,98,"MAIN_HALL",7.5),  spray(7000,false,7.5),
  ptick(7000,45,-32,99,"MAIN_HALL",6.8),  spray(7800,true,6.1),
  ptick(8000,45,-32,99,"MAIN_HALL",6.1),  spray(8600,false,6.1),
  ptick(9000,44,-32,97,"MAIN_HALL",7.0),  spray(9600,true,6.5),
  ptick(10000,43,-32,95,"MAIN_HALL",8.3), ptick(11000,41,-32,93,"MAIN_HALL",10.0),
  ptick(12000,39,-32,90,"MAIN_HALL",12.1),
  dopen(12400,12.2,38.6,-32,89.4,12.6),   ptick(13000,37,-32,87,"ENTRANCE",14.3),
  ptick(14000,35,-32,84,"ENTRANCE",16.7),  ptick(15000,36,-32,81,"OUTSIDE",19.1),
  ptick(16000,38,-32,79,"OUTSIDE",21.0),   exit_(16800,16.6,39.4,-32,77.8,22.3,"main_exit"),
  ptick(17000,41,-32,77,"OUTSIDE",23.4),   ptick(18000,44,-32,75,"OUTSIDE",25.9),
  dopen(18500,18.3,44.8,-32,74.2,26.5),    ptick(19000,47,-32,73,"OUTSIDE",28.3),
  ptick(20000,49,-32,72,"OUTSIDE",30.1),   assem(20900,20.7,51.2,-32,70.4),
  send(21000,"assembly_reached",58,true,6,88),
];

// fireMed variant that includes a fire alarm activation — for students who activated alarm
// but had weak extinguisher technique (decision_delay shorter; rubric F2 credited)
const fireMedWithAlarm = () => [
  sstart(200,"FIRE",0,36,-32,90),
  ptick(1000,36,-32,90,"MAIN_HALL",15.8), ptick(2000,38,-32,92,"MAIN_HALL",13.4),
  ptick(3000,40,-32,94,"MAIN_HALL",11.1), ptick(4000,42,-32,96,"MAIN_HALL",9.3),
  pinpull(4600),
  ptick(5000,43,-32,97,"MAIN_HALL",8.5),  spray(5400,false,8.5),
  ptick(6000,44,-32,98,"MAIN_HALL",7.6),  spray(6800,true,6.8),
  alarm(7200,7.0,45.1,-32,98.8,6.4),
  ptick(7000,45,-32,99,"MAIN_HALL",6.4),  spray(8000,false,6.4),
  ptick(8000,45,-32,99,"MAIN_HALL",6.4),  spray(9200,true,5.9),
  ptick(9000,44,-32,97,"MAIN_HALL",7.1),
  ptick(10000,43,-32,96,"MAIN_HALL",8.0), ptick(11000,42,-32,94,"MAIN_HALL",9.2),
  ptick(12000,41,-32,92,"MAIN_HALL",10.8),
  dopen(12800,12.6,40.3,-32,91.5,11.4),   ptick(13000,38,-32,89,"ENTRANCE",13.2),
  ptick(14000,36,-32,86,"ENTRANCE",15.4), ptick(15000,34,-32,83,"ENTRANCE",17.8),
  ptick(16000,36,-32,80,"OUTSIDE",20.2),  ptick(17000,39,-32,77,"OUTSIDE",23.4),
  dopen(17800,17.6,40.6,-32,76.1,24.0),   ptick(18000,42,-32,75,"OUTSIDE",25.1),
  ptick(19000,46,-32,73,"OUTSIDE",28.4),  ptick(20000,49,-32,71,"OUTSIDE",31.3),
  ptick(21000,51,-32,70,"OUTSIDE",33.6),
  assem(22000,21.8,52.4,-32,69.8),
  send(22100,"assembly_reached",54,true,5,102),
];

const fireLow = (fires=1) => [
  sstart(200,"FIRE",0,36,-32,90),
  ptick(1000,36,-32,90,"MAIN_HALL",18.0), ptick(2000,38,-32,92,"MAIN_HALL",15.6),
  pinpull(3000), ptick(3000,40,-32,94,"MAIN_HALL",13.2), spray(4000,false,13.2),
  ptick(4000,40,-32,94,"MAIN_HALL",13.2), spray(6000,false,12.8),
  ptick(6000,41,-32,95,"MAIN_HALL",12.8), ptick(10000,40,-32,94,"MAIN_HALL",13.4),
  ptick(20000,38,-32,92,"MAIN_HALL",15.1), ptick(40000,38,-32,92,"MAIN_HALL",15.1),
  ptick(80000,37,-32,91,"MAIN_HALL",16.2),
  send(120000,"timeout",fires===2?28:15,false,fires,180),
];

// quakeHigh — Joshua Hernandez (7.2, score 85): perfect drop-cover, no movement during shaking
const quakeHighJoshua = (mag) => [
  sstart(200,"EARTHQUAKE",mag,38,-32,91),
  ...[1,2,3,4,5,6,7,8,9,10,15,20,25,30,35,40,45,50,55,60].map(s=>
    ptick(s*1000,38,-32,91,"MAIN_HALL",99)),
  dopen(62000,62.0,37.8,-32,90.2,99), ptick(63000,36,-32,88,"ENTRANCE",99),
  ptick(64000,34,-32,85,"ENTRANCE",99), exit_(65000,65.0,33.2,-32,83.4,99,"main_exit"),
  ptick(66000,32,-32,82,"OUTSIDE",99), ptick(67000,35,-32,79,"OUTSIDE",99),
  ptick(68000,39,-32,76,"OUTSIDE",99), assem(69000,69.0,43.1,-32,74.2),
  send(69100,"assembly_reached",85,true,undefined,undefined,mag),
];

// quakeHigh — Karen Villanueva (6.5, score 79): minor movement during aftershock, self-corrected
const quakeHighKaren = (mag) => [
  sstart(200,"EARTHQUAKE",mag,40,-32,93),
  ...[1,2,3,4,5,6,7,8,9,10].map(s=>ptick(s*1000,40,-32,93,"MAIN_HALL",99)),
  ptick(11000,40,-32,93,"MAIN_HALL",99), ptick(12000,40,-32,93,"MAIN_HALL",99),
  // slight drift during aftershock phase then corrects
  ptick(15000,41,-32,94,"MAIN_HALL",99), ptick(20000,42,-32,95,"MAIN_HALL",99),
  ptick(25000,41,-32,94,"MAIN_HALL",99), ptick(30000,40,-32,93,"MAIN_HALL",99),
  ptick(35000,40,-32,93,"MAIN_HALL",99), ptick(40000,40,-32,93,"MAIN_HALL",99),
  ptick(45000,40,-32,93,"MAIN_HALL",99), ptick(50000,40,-32,93,"MAIN_HALL",99),
  ptick(55000,40,-32,93,"MAIN_HALL",99),
  dopen(57000,56.8,39.5,-32,92.1,99), ptick(58000,37,-32,89,"ENTRANCE",99),
  ptick(59000,35,-32,86,"ENTRANCE",99), exit_(60000,59.8,34.0,-32,84.2,99,"main_exit"),
  ptick(61000,33,-32,82,"OUTSIDE",99), ptick(62000,36,-32,79,"OUTSIDE",99),
  ptick(63000,40,-32,77,"OUTSIDE",99), assem(64000,63.8,42.4,-32,75.1),
  send(64100,"assembly_reached",79,true,undefined,undefined,mag),
];

// quakeMed — Mark Flores (6.8, score 55): moved too much initially, covered eventually
const quakeMedMark = (mag) => [
  sstart(200,"EARTHQUAKE",mag,40,-32,93),
  ptick(1000,40,-32,93,"MAIN_HALL",99),   ptick(2000,42,-32,95,"MAIN_HALL",99),
  ptick(3000,44,-32,97,"MAIN_HALL",99),   ptick(4000,46,-32,99,"COMPUTER_LAB",99),
  ...[5,6,7,8,9,10,15,20,25,30,35,40,45,50,55].map(s=>
    ptick(s*1000,43,-32,96,"MAIN_HALL",99)),
  dopen(56000,56.0,41.5,-32,94.2,99), ptick(57000,40,-32,92,"ENTRANCE",99),
  ptick(58000,38,-32,89,"ENTRANCE",99),   ptick(59000,36,-32,86,"OUTSIDE",99),
  assem(61000,61.0,40.4,-32,80.1),
  send(61100,"assembly_reached",55,true,undefined,undefined,mag),
];

// quakeMed — Diego Aquino (7.0, score 60): slightly quicker to shelter, evacuated at moderate pace
const quakeMedDiego = (mag) => [
  sstart(200,"EARTHQUAKE",mag,41,-32,94),
  ptick(1000,41,-32,94,"MAIN_HALL",99),  ptick(2000,43,-32,96,"MAIN_HALL",99),
  ptick(3000,43,-32,96,"MAIN_HALL",99),  // settled faster than Mark
  ...[4,5,6,7,8,9,10,15,20,25,30,35,40,45].map(s=>
    ptick(s*1000,43,-32,96,"MAIN_HALL",99)),
  // some drift after main shock before re-covering
  ptick(46000,44,-32,97,"MAIN_HALL",99), ptick(47000,43,-32,96,"MAIN_HALL",99),
  ptick(48000,43,-32,96,"MAIN_HALL",99), ptick(50000,43,-32,96,"MAIN_HALL",99),
  dopen(51000,50.8,42.2,-32,95.1,99),    ptick(52000,40,-32,92,"ENTRANCE",99),
  ptick(53000,38,-32,89,"ENTRANCE",99),  ptick(54000,37,-32,86,"OUTSIDE",99),
  ptick(55000,38,-32,83,"OUTSIDE",99),
  assem(57000,56.8,40.8,-32,80.6),
  send(57100,"assembly_reached",60,true,undefined,undefined,mag),
];

const quakeLow = (mag) => [
  sstart(200,"EARTHQUAKE",mag,37,-32,90),
  ptick(1000,37,-32,90,"MAIN_HALL",99),  ptick(2000,40,-32,93,"MAIN_HALL",99),
  ptick(3000,43,-32,96,"MAIN_HALL",99),  ptick(4000,46,-32,99,"COMPUTER_LAB",99),
  ptick(5000,49,-32,102,"COMPUTER_LAB",99), ptick(6000,46,-32,99,"COMPUTER_LAB",99),
  ptick(7000,42,-32,95,"MAIN_HALL",99),  ptick(8000,38,-32,91,"MAIN_HALL",99),
  ptick(9000,35,-32,88,"ENTRANCE",99),   ptick(10000,38,-32,91,"MAIN_HALL",99),
  ptick(20000,42,-32,95,"MAIN_HALL",99), ptick(40000,40,-32,93,"MAIN_HALL",99),
  ptick(80000,40,-32,93,"MAIN_HALL",99),
  send(120000,"timeout",mag>=7?20:15,false,undefined,undefined,mag),
];

// ccsHigh — Trisha Pascual (score 80): alarm first, 7 confirmed CO2 hits, textbook protocol
const ccsHighTrisha = () => [
  sstart(200,"CCS_FIRE",0,125,-32,20),
  ptick(1000,125,-32,20,"CCS_GROUND_FLOOR",8.4), ptick(2000,122,-32,18,"CCS_GROUND_FLOOR",6.2),
  alarm(2600,2.4,120.8,-32,17.4,5.8),
  pinpull(2900),
  ptick(3000,120,-32,16,"CCS_GROUND_FLOOR",5.1), co2(3800,true),
  ptick(4000,119,-32,15,"CCS_GROUND_FLOOR",4.3), co2(5000,true),
  ptick(5000,118,-32,14,"CCS_GROUND_FLOOR",3.9), co2(6200,true),
  ptick(6000,118,-32,14,"CCS_GROUND_FLOOR",3.9), co2(7400,true),
  ptick(7000,119,-32,15,"CCS_GROUND_FLOOR",4.1), ptick(8000,120,-32,16,"CCS_GROUND_FLOOR",5.0),
  co2(8600,false), ptick(9000,121,-32,17,"CCS_GROUND_FLOOR",5.8),
  dopen(9500,9.3,121.5,-32,17.8,6.2), ptick(10000,122,-32,18,"CCS_GROUND_FLOOR",6.5),
  ptick(11000,118,-32,13,"CCS_GROUND_FLOOR",4.2), co2(11800,true),
  ptick(12000,116,-32,11,"CCS_GROUND_FLOOR",3.6), co2(13000,true),
  ptick(13000,114,-32,9,"CCS_GROUND_FLOOR",5.1), dopen(13800,13.6,113.2,-32,8.4,5.8),
  ptick(14000,112,-32,10,"CCS_GROUND_FLOOR",6.4), ptick(15000,107,-32,18,"CCS_GROUND_FLOOR",9.1),
  ptick(16000,101,-32,28,"OUTSIDE",14.8), ptick(17000,94,-32,38,"OUTSIDE",22.3),
  ptick(18000,87,-32,48,"OUTSIDE",30.5),  ptick(19000,80,-32,56,"OUTSIDE",37.1),
  ptick(20000,73,-32,62,"OUTSIDE",41.8),  ptick(21000,67,-32,67,"OUTSIDE",45.2),
  ptick(22000,61,-32,70,"OUTSIDE",48.4),  assem(22600,22.4,57.2,-32,70.6),
  send(22700,"assembly_reached",80,true,13,89),
];

// ccsHigh — Luis Bautista (score 75): fewer CO2 hits than Trisha, slightly slower
const ccsHighLuis = () => [
  sstart(200,"CCS_FIRE",0,126,-32,22),
  ptick(1000,126,-32,22,"CCS_GROUND_FLOOR",9.8),  ptick(2000,123,-32,19,"CCS_GROUND_FLOOR",7.1),
  alarm(2700,2.5,121.4,-32,18.1,6.4),
  pinpull(3100),
  ptick(3000,121,-32,17,"CCS_GROUND_FLOOR",5.8),  co2(4200,true),
  ptick(4000,120,-32,16,"CCS_GROUND_FLOOR",5.1),  co2(5400,true),
  ptick(5000,119,-32,15,"CCS_GROUND_FLOOR",4.6),  co2(6800,false),
  ptick(6000,119,-32,15,"CCS_GROUND_FLOOR",4.6),  co2(8000,true),
  ptick(7000,120,-32,16,"CCS_GROUND_FLOOR",5.0),
  co2(9200,false),  ptick(8000,121,-32,17,"CCS_GROUND_FLOOR",5.7),
  dopen(9900,9.7,121.8,-32,18.2,6.3),  ptick(9000,122,-32,18,"CCS_GROUND_FLOOR",6.2),
  ptick(10000,119,-32,14,"CCS_GROUND_FLOOR",4.8), co2(10800,true),
  ptick(11000,117,-32,12,"CCS_GROUND_FLOOR",3.9), co2(12200,true),
  ptick(12000,115,-32,10,"CCS_GROUND_FLOOR",5.4), dopen(13000,12.8,114.1,-32,9.2,5.9),
  ptick(13000,113,-32,9,"CCS_GROUND_FLOOR",6.8),  ptick(14000,109,-32,11,"CCS_GROUND_FLOOR",9.1),
  ptick(15000,104,-32,20,"OUTSIDE",14.6),  ptick(16000,98,-32,30,"OUTSIDE",21.3),
  ptick(17000,91,-32,40,"OUTSIDE",28.8),   ptick(18000,84,-32,50,"OUTSIDE",36.4),
  ptick(19000,77,-32,58,"OUTSIDE",42.1),   ptick(20000,70,-32,64,"OUTSIDE",46.8),
  ptick(21000,64,-32,68,"OUTSIDE",49.7),   assem(21800,21.6,60.1,-32,69.2),
  send(21900,"assembly_reached",75,true,8,103),
];

// ccsMed — Kevin Morales (score 52): missed alarm, moderate CO2, slow evacuation
const ccsMedKevin = () => [
  sstart(200,"CCS_FIRE",0,128,-32,22),
  ptick(1000,128,-32,22,"CCS_GROUND_FLOOR",10.2), ptick(2000,126,-32,20,"CCS_GROUND_FLOOR",8.4),
  pinpull(2800),
  ptick(3000,124,-32,18,"CCS_GROUND_FLOOR",6.8),  co2(3600,false),
  ptick(4000,122,-32,16,"CCS_GROUND_FLOOR",5.4),  co2(4800,true),
  ptick(5000,121,-32,15,"CCS_GROUND_FLOOR",4.8),  co2(6000,true),
  ptick(6000,120,-32,14,"CCS_GROUND_FLOOR",4.2),  co2(7200,false),
  ptick(7000,121,-32,15,"CCS_GROUND_FLOOR",4.8),  ptick(8000,122,-32,16,"CCS_GROUND_FLOOR",5.6),
  ptick(9000,124,-32,18,"CCS_GROUND_FLOOR",7.1),  dopen(9800,9.6,124.8,-32,18.8,7.6),
  ptick(10000,126,-32,20,"CCS_GROUND_FLOOR",8.8), ptick(15000,120,-32,14,"CCS_GROUND_FLOOR",5.2),
  co2(15800,false), ptick(20000,118,-32,12,"CCS_GROUND_FLOOR",4.9),
  ptick(25000,116,-32,10,"CCS_GROUND_FLOOR",5.8), dopen(26000,25.8,115.4,-32,9.6,6.4),
  ptick(30000,112,-32,10,"CCS_GROUND_FLOOR",9.3), ptick(35000,104,-32,22,"OUTSIDE",18.1),
  ptick(40000,95,-32,36,"OUTSIDE",26.4),  ptick(45000,86,-32,49,"OUTSIDE",34.7),
  ptick(50000,76,-32,60,"OUTSIDE",41.2),  ptick(55000,68,-32,66,"OUTSIDE",45.8),
  assem(56000,55.8,64.1,-32,66.4),
  send(56100,"assembly_reached",52,true,6,134),
];

// ccsMed — Nina Ramos (score 45): fewer CO2 hits, missed many, slow path north-west
const ccsMedNina = () => [
  sstart(200,"CCS_FIRE",0,131,-32,24),
  ptick(1000,131,-32,24,"CCS_GROUND_FLOOR",11.8), ptick(2000,129,-32,22,"CCS_GROUND_FLOOR",9.6),
  pinpull(3200),
  ptick(3000,127,-32,20,"CCS_GROUND_FLOOR",7.8),  co2(4000,false),
  ptick(4000,125,-32,18,"CCS_GROUND_FLOOR",6.4),  co2(5200,false),
  ptick(5000,124,-32,17,"CCS_GROUND_FLOOR",5.9),  co2(6400,true),
  ptick(6000,124,-32,17,"CCS_GROUND_FLOOR",5.9),  co2(8000,false),
  ptick(7000,125,-32,18,"CCS_GROUND_FLOOR",6.3),  co2(9600,true),
  ptick(8000,126,-32,19,"CCS_GROUND_FLOOR",7.0),
  dopen(10200,10.0,126.5,-32,19.6,7.3),
  ptick(9000,127,-32,20,"CCS_GROUND_FLOOR",7.5),  ptick(12000,124,-32,17,"CCS_GROUND_FLOOR",6.1),
  co2(13400,false), ptick(15000,122,-32,15,"CCS_GROUND_FLOOR",5.4),
  ptick(20000,120,-32,13,"CCS_GROUND_FLOOR",6.0),
  dopen(22000,21.8,119.4,-32,12.3,6.4),
  ptick(25000,116,-32,11,"CCS_GROUND_FLOOR",7.4),
  ptick(30000,112,-32,12,"CCS_GROUND_FLOOR",10.1),
  ptick(35000,105,-32,22,"OUTSIDE",17.4),  ptick(40000,97,-32,35,"OUTSIDE",25.9),
  ptick(45000,88,-32,48,"OUTSIDE",34.6),   ptick(50000,79,-32,58,"OUTSIDE",41.1),
  ptick(55000,71,-32,64,"OUTSIDE",45.8),   ptick(60000,65,-32,67,"OUTSIDE",48.4),
  assem(61500,61.3,62.8,-32,67.1),
  send(61600,"assembly_reached",45,true,3,118),
];

const ccsLow = () => [
  sstart(200,"CCS_FIRE",0,130,-32,25),
  ptick(1000,130,-32,25,"CCS_GROUND_FLOOR",12.4), ptick(2000,130,-32,25,"CCS_GROUND_FLOOR",12.4),
  pinpull(2600), co2(3000,false), ptick(3000,130,-32,25,"CCS_GROUND_FLOOR",12.4),
  ptick(4000,128,-32,23,"CCS_GROUND_FLOOR",10.8), co2(5000,false),
  ptick(5000,128,-32,23,"CCS_GROUND_FLOOR",10.8), ptick(10000,128,-32,23,"CCS_GROUND_FLOOR",10.8),
  ptick(20000,128,-32,23,"CCS_GROUND_FLOOR",11.2), ptick(40000,130,-32,25,"CCS_GROUND_FLOOR",12.0),
  ptick(80000,130,-32,25,"CCS_GROUND_FLOOR",12.4),
  send(120000,"timeout",18,false,0,147),
];

// ── 10 Hz CSV builder ─────────────────────────────────────────────────────────

const CSV_HEADER = 'player_id,session_id,scenario_type,timestamp,event_type,x,y,z,hazard_distance,interaction_target,nearby_player_count';

function buildMoveCsv(events, sessionId, playerId, scenarioType) {
  const rows = [CSV_HEADER];

  // Keyframes from SIM_START + PLAYER_TICK (1 Hz summary)
  const keyframes = events
    .filter(e => e.type === 'SIM_START' || e.type === 'PLAYER_TICK')
    .sort((a, b) => a.tOffsetMs - b.tOffsetMs)
    .map(e => ({
      tMs: e.tOffsetMs,
      x:   Number(e.data.x),
      y:   Number(e.data.y),
      z:   Number(e.data.z),
      hd:  Number(e.type === 'SIM_START' ? 99 : (e.data.nearest_fire_dist ?? 99)),
    }));

  const simStart = events.find(e => e.type === 'SIM_START');
  const simEnd   = events.find(e => e.type === 'SIM_END');
  const endMs    = simEnd ? simEnd.tOffsetMs : (keyframes.at(-1)?.tMs ?? 0);

  // session_start row
  if (simStart) {
    rows.push(`${playerId},${sessionId},${scenarioType},0.0,session_start,${simStart.data.x},${simStart.data.y},${simStart.data.z},99.0,,`);
  }

  // Generate move_tick at 0.1 s resolution by interpolating between keyframes
  if (keyframes.length >= 2) {
    let kfIdx = 0;
    const n = () => (Math.random() - 0.5) * 0.1; // tiny ±0.05 block jitter
    for (let tMs = keyframes[0].tMs; tMs < endMs; tMs += 100) {
      while (kfIdx < keyframes.length - 2 && keyframes[kfIdx + 1].tMs <= tMs) kfIdx++;
      const kf0 = keyframes[kfIdx];
      const kf1 = keyframes[Math.min(kfIdx + 1, keyframes.length - 1)];
      let x, z, hd;
      if (kf1.tMs <= kf0.tMs) {
        x = kf0.x; z = kf0.z; hd = kf0.hd;
      } else {
        const frac = Math.min(1, (tMs - kf0.tMs) / (kf1.tMs - kf0.tMs));
        x   = kf0.x   + frac * (kf1.x   - kf0.x);
        z   = kf0.z   + frac * (kf1.z   - kf0.z);
        hd  = kf0.hd  + frac * (kf1.hd  - kf0.hd);
      }
      const tSec = (tMs / 1000).toFixed(1);
      rows.push(`${playerId},${sessionId},${scenarioType},${tSec},move_tick,${(x+n()).toFixed(2)},${kf0.y},${(z+n()).toFixed(2)},${Math.max(0,hd).toFixed(1)},,`);
    }
  }

  // Action events
  const ACTION = new Set(['door_open','fire_alarm_activate','EXT_SPRAY','extinguisher_use','emergency_exit','assembly_area_reached']);
  for (const e of events.filter(e => ACTION.has(e.type)).sort((a,b) => a.tOffsetMs - b.tOffsetMs)) {
    const tSec  = (e.tOffsetMs / 1000).toFixed(1);
    const ex    = e.data.x ?? '', ey = e.data.y ?? '', ez = e.data.z ?? '';
    const hd    = e.data.hazard_distance ?? e.data.distance_to_fire ?? 99;
    let evType = e.type, target = '', nearby = '';
    if (e.type === 'EXT_SPRAY') {
      evType = 'extinguisher_use'; target = e.data.hit_fire   ? 'fire_block' : ''; nearby = String(e.data.nearby_player_count ?? 0);
    } else if (e.type === 'extinguisher_use') {
      target = e.data.hit_target ? 'computer'   : ''; nearby = String(e.data.nearby_player_count ?? 0);
    } else if (e.type === 'door_open') {
      target = e.data.target ?? 'dark_oak_door';
    } else if (e.type === 'emergency_exit') {
      target = e.data.exit ?? '';
    }
    rows.push(`${playerId},${sessionId},${scenarioType},${tSec},${evType},${ex},${ey},${ez},${hd},${target},${nearby}`);
  }

  // session_end row
  if (simEnd) {
    const tSec = (simEnd.tOffsetMs / 1000).toFixed(1);
    const lk = keyframes.at(-1) ?? { x:'', y:'', z:'' };
    rows.push(`${playerId},${sessionId},${scenarioType},${tSec},session_end,${lk.x},${lk.y},${lk.z},99,,`);
  }

  // Sort data rows by timestamp (header stays first)
  const hdr = rows.shift();
  rows.sort((a, b) => parseFloat(a.split(',')[3]) - parseFloat(b.split(',')[3]));
  rows.unshift(hdr);
  return rows.join('\n');
}

// ── Session definitions ───────────────────────────────────────────────────────

const ts = (d,t) => `${d}T${t}.000Z`;

const sessions = [
  // FIRE — Library
  { name:"Ana Dela Cruz",    id:"2024-00101", section:"BSCS3A", simType:"FIRE", score:88, passed:1, prep:"HIGH",     conf:4.8, notes:"Excellent. Pulled pin immediately, alarm in 7s, clean evacuation.",  start:ts("2026-06-20","07:05:10"), end:ts("2026-06-20","07:07:33"), log:fireHighAna() },
  { name:"Miguel Santos",    id:"2024-00102", section:"BSCS3A", simType:"FIRE", score:82, passed:1, prep:"HIGH",     conf:4.5, notes:"Good PASS technique. Alarm before evacuation. Slightly slower pin pull.", start:ts("2026-06-20","07:12:40"), end:ts("2026-06-20","07:14:58"), log:fireHighMiguel() },
  { name:"Maria Reyes",      id:"2024-00103", section:"BSIT3A", simType:"FIRE", score:62, passed:1, prep:"MODERATE", conf:3.2, notes:"Skipped alarm. Extinguished some fires but evacuated too early.",     start:ts("2026-06-20","08:30:15"), end:ts("2026-06-20","08:32:46"), log:fireMed() },
  { name:"Carlo Dela Cruz",  id:"2024-00104", section:"BSIT3A", simType:"FIRE", score:54, passed:1, prep:"MODERATE", conf:3.0, notes:"Activated alarm before evacuating — good COMMUNICATE step. Extinguisher technique inconsistent; several missed sprays.",                 start:ts("2026-06-21","09:10:00"), end:ts("2026-06-21","09:12:22"), log:fireMedWithAlarm() },
  { name:"Jasmine Lim",      id:"2024-00105", section:"BSCS3B", simType:"FIRE", score:45, passed:1, prep:"MODERATE", conf:2.8, notes:"Forgot alarm. Hesitated near fire — stood at 9 block distance instead of approaching. Only 4 accurate hits.",          start:ts("2026-06-21","10:05:30"), end:ts("2026-06-21","10:07:52"), log:fireMedJasmine() },
  { name:"Patrick Tan",      id:"2024-00106", section:"BSCS3B", simType:"FIRE", score:28, passed:0, prep:"LOW",      conf:1.8, notes:"No alarm, minimal extinguisher use, did not reach assembly.",         start:ts("2026-06-21","11:00:00"), end:ts("2026-06-21","11:03:00"), log:fireLow(2) },
  { name:"Ryan Mendoza",     id:"2024-00107", section:"BSIT3B", simType:"FIRE", score:91, passed:1, prep:"HIGH",     conf:5.0, notes:"Outstanding. Fastest alarm activation recorded (4.6s). Near-perfect PASS — 9 accurate hits. Assembly in under 20s.",  start:ts("2026-06-22","07:08:00"), end:ts("2026-06-22","07:10:23"), log:fireHighRyan() },
  { name:"Sofia Aguilar",    id:"2024-00108", section:"BSCS3A", simType:"FIRE", score:58, passed:1, prep:"MODERATE", conf:3.1, notes:"Skipped alarm. 6 accurate hits but 2 misses at close range. Used side door exit. Moderate performance.",              start:ts("2026-06-22","09:45:00"), end:ts("2026-06-22","09:47:20"), log:fireMedSofia() },
  { name:"Chloe Garcia",     id:"2024-00109", section:"BSCS2A", simType:"FIRE", score:12, passed:0, prep:"LOW",      conf:1.5, notes:"Froze after entry. No extinguisher or alarm attempt.",                start:ts("2026-06-23","08:00:00"), end:ts("2026-06-23","08:02:00"), log:fireLow(1) },
  // EARTHQUAKE
  { name:"Joshua Hernandez", id:"2024-00110", section:"BSCS3A", simType:"EARTHQUAKE", score:85, passed:1, prep:"HIGH",     conf:4.6, notes:"Excellent drop-cover-hold-on. Zero movement for 60 seconds during shaking. Textbook evacuation after.",  start:ts("2026-06-20","13:10:00"), end:ts("2026-06-20","13:11:09"), log:quakeHighJoshua(7.2) },
  { name:"Karen Villanueva", id:"2024-00111", section:"BSIT3A", simType:"EARTHQUAKE", score:79, passed:1, prep:"HIGH",     conf:4.2, notes:"Good drop-cover response. Slight drift during aftershock phase but self-corrected within 5 seconds.", start:ts("2026-06-21","13:30:00"), end:ts("2026-06-21","13:31:09"), log:quakeHighKaren(6.5) },
  { name:"Mark Flores",      id:"2024-00112", section:"BSCS3B", simType:"EARTHQUAKE", score:55, passed:1, prep:"MODERATE", conf:3.0, notes:"Moved around for 4 seconds before settling into cover. Evacuated successfully after shaking stopped.",             start:ts("2026-06-22","13:15:00"), end:ts("2026-06-22","13:14:01"), log:quakeMedMark(6.8) },
  { name:"Lily Torres",      id:"2024-00113", section:"BSIT3B", simType:"EARTHQUAKE", score:20, passed:0, prep:"LOW",      conf:1.9, notes:"Ran during shaking instead of dropping. No cover found.",         start:ts("2026-06-23","14:00:00"), end:ts("2026-06-23","14:02:00"), log:quakeLow(7.5) },
  { name:"Jerome Castillo",  id:"2024-00114", section:"BSCS3A", simType:"EARTHQUAKE", score:15, passed:0, prep:"LOW",      conf:1.6, notes:"Panicked, moved continuously. No drop-cover attempt.",             start:ts("2026-06-24","09:00:00"), end:ts("2026-06-24","09:02:00"), log:quakeLow(8.1) },
  { name:"Diego Aquino",     id:"2024-00115", section:"BSIT3A", simType:"EARTHQUAKE", score:60, passed:1, prep:"MODERATE", conf:3.3, notes:"Settled into cover faster than most. Slight drift mid-shaking then re-covered. Evacuated promptly after shaking stopped.",       start:ts("2026-06-25","10:20:00"), end:ts("2026-06-25","10:21:01"), log:quakeMedDiego(7.0) },
  // CCS_FIRE
  { name:"Trisha Pascual",   id:"2024-00116", section:"BSCS3A", simType:"FIRE", score:80, passed:1, prep:"HIGH",     conf:4.4, notes:"CCS: Alarm first, CO2 on burning computers. Clear Class C protocol.",  start:ts("2026-06-25","13:00:00"), end:ts("2026-06-25","13:00:23"), log:ccsHighTrisha() },
  { name:"Kevin Morales",    id:"2024-00117", section:"BSIT3A", simType:"FIRE", score:52, passed:1, prep:"MODERATE", conf:3.0, notes:"CCS: Used CO2 but skipped alarm. Good instinct on no-water rule. 4 confirmed hits out of 7 attempts.",     start:ts("2026-06-26","08:00:00"), end:ts("2026-06-26","08:00:52"), log:ccsMedKevin() },
  { name:"Aira Santos",      id:"2024-00118", section:"BSCS3B", simType:"FIRE", score:18, passed:0, prep:"LOW",      conf:1.7, notes:"CCS: Confused by electrical fire. No alarm, no evacuation.",           start:ts("2026-06-26","09:30:00"), end:ts("2026-06-26","09:32:00"), log:ccsLow() },
  { name:"Luis Bautista",    id:"2024-00119", section:"BSIT3B", simType:"FIRE", score:75, passed:1, prep:"HIGH",     conf:4.1, notes:"CCS: Activated alarm, used CO2 on 6 confirmed computers. Two missed sprays before locating source.",           start:ts("2026-06-27","07:30:00"), end:ts("2026-06-27","07:30:23"), log:ccsHighLuis() },
  { name:"Nina Ramos",       id:"2024-00120", section:"BSCS2A", simType:"FIRE", score:45, passed:1, prep:"MODERATE", conf:2.8, notes:"CCS: 3 confirmed CO2 hits, 3 misses. Missed alarm. Slow evacuation path but reached assembly zone.",    start:ts("2026-06-27","08:15:00"), end:ts("2026-06-27","08:15:52"), log:ccsMedNina() },
];

const INSERT = `INSERT INTO sessions (student_name,station_account,account_uuid,student_id,section,start_time,end_time,status,tutorial_completed,tutorial_duration_s,simulation_type,simulation_score,passed,event_log,prep_level,confidence,bfp_notes,move_log_csv) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

async function seed() {
  console.log("Ensuring move_log_csv column exists...");
  await silentAlter("ALTER TABLE sessions ADD COLUMN move_log_csv TEXT");

  console.log("Clearing sessions and audit_logs...");
  await pipeline([ex("DELETE FROM audit_logs"), ex("DELETE FROM sessions")]);
  console.log("Cleared.\n");

  for (const s of sessions) {
    const moveCsv = buildMoveCsv(s.log, `synth-${s.id}`, `stu-${s.id}`, s.simType.toLowerCase());
    await pipeline([ex(INSERT, [
      t(s.name), t("station_demo"), t(`synth-${s.id}`), t(s.id), t(s.section),
      t(s.start), t(s.end), t("completed"), i(1), i(90),
      t(s.simType), i(s.score), i(s.passed),
      t(JSON.stringify(s.log)), t(s.prep), f(s.conf), t(s.notes),
      t(moveCsv),
    ])]);
    const csvRows = moveCsv.split('\n').length - 1; // exclude header
    console.log(`✓ ${s.name.padEnd(20)} ${s.prep.padEnd(8)} score=${s.score}  csv=${csvRows} rows`);
  }
  console.log(`\nDone — ${sessions.length} sessions inserted.`);
}

seed().catch(e => { console.error(e); process.exit(1); });
