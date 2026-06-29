/**
 * Synthetic dataset seeder v2 — BerongSMP dashboard.
 *
 * All coordinates use real building layouts:
 *   Library : SIM_POS (30,-34,83), rooms Z:83-111, assembly zone Z:64-82.
 *   CCS     : CCS_POS (76,-34,4), upper-floor Y=-24, ground-floor Y=-31,
 *             evacuation heads south (Z increases) -> assembly zone Z:73-90.
 *
 * Run: node apps/dashboard/scripts/seed-synthetic.mjs
 * Needs: apps/dashboard/.dev.vars with TURSO_URL and TURSO_TOKEN.
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
if (!TURSO_URL || !TURSO_TOKEN) { console.error("Missing TURSO_URL or TURSO_TOKEN in .dev.vars"); process.exit(1); }

async function pipeline(requests) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  for (const r of json.results ?? [])
    if (r.type === "error") throw new Error(`Turso SQL error: ${r.error?.message ?? JSON.stringify(r)}`);
  return json;
}
async function silentAlter(sql) { try { await pipeline([ex(sql)]); } catch {} }

const t  = v => ({ type:"text",    value:String(v) });
const i  = v => ({ type:"integer", value:String(Math.round(Number(v))) });
const f  = v => ({ type:"float",   value:Number(v) });
const ex = (sql, args=[]) => ({ type:"execute", stmt:{sql,args} });

// ── Event helpers ─────────────────────────────────────────────────────────────
const ptick  = (ms,x,y,z,room,fd)    => ({type:"PLAYER_TICK",tOffsetMs:ms,data:{x,y,z,room,nearest_fire_dist:fd}});
const dopen  = (ms,tt,x,y,z,haz)     => ({type:"door_open",tOffsetMs:ms,data:{t:tt,x,y:String(y),z,target:"dark_oak_door",hazard_distance:haz}});
const pinpull= (ms)                   => ({type:"EXT_PIN_PULL",tOffsetMs:ms,data:{pulled:true}});
const spray  = (ms,hit,fd)            => ({type:"EXT_SPRAY",tOffsetMs:ms,data:{hit_fire:hit,distance_to_fire:fd,nearby_player_count:0}});
const co2    = (ms,hit)               => ({type:"extinguisher_use",tOffsetMs:ms,data:{hit_target:hit,nearby_player_count:0}});
const alarm  = (ms,tt,x,y,z,haz)     => ({type:"fire_alarm_activate",tOffsetMs:ms,data:{t:tt,x,y:String(y),z,hazard_distance:haz}});
const assem  = (ms,tt,x,y,z)         => ({type:"assembly_area_reached",tOffsetMs:ms,data:{t:tt,x,y:String(y),z,hazard_distance:99}});
const exit_  = (ms,tt,x,y,z,haz,lbl) => ({type:"emergency_exit",tOffsetMs:ms,data:{t:tt,x,y:String(y),z,hazard_distance:haz,exit:lbl}});
const sstart = (ms,st,mag,x,y,z)     => ({type:"SIM_START",tOffsetMs:ms,data:{sim_type:st,magnitude:mag,x,y,z}});
const send   = (ms,reason,score,passed,fires,spread,mag) => {
  const d={end_reason:reason,score,passed};
  if(fires!==undefined)  d.fires_extinguished=fires;
  if(spread!==undefined) d.fire_spread_count=spread;
  if(mag!==undefined)    d.magnitude=mag;
  return {type:"SIM_END",tOffsetMs:ms,data:d};
};

// ── LIBRARY rooms: Computer Lab X:30-42 Z:83-93, Main Hall X:30-50 Z:93-108,
//    Stairwell X:48-52 Z:88-95, main_exit AABB(50,-34,93,54,-30,96),
//    assembly AABB(30,-35,64,76,-28,82) north of building. ──────────────────

// FIRE HIGH — Ana (88): pin 2.2s, alarm Stairwell 8s, 7 hits
const fireHighAna = () => [
  sstart(200,"FIRE",0,36,-32,87),
  ptick(1000,36,-32,87,"Computer Lab",18.2),
  ptick(2000,38,-32,91,"Computer Lab",14.1), pinpull(2200),
  ptick(3000,40,-32,96,"Main Hall",10.4), spray(3400,false,10.4),
  ptick(4000,42,-32,99,"Main Hall",7.2),  spray(4400,true,6.8),
  ptick(5000,44,-32,102,"Main Hall",4.3), spray(5200,true,4.0),
  ptick(6000,44,-32,103,"Main Hall",3.7), spray(6200,true,3.5),
  ptick(7000,46,-32,102,"Main Hall",4.1), spray(7200,true,3.9),
  ptick(8000,49,-32,96,"Stairwell",9.0),
  alarm(8300,8.1,50.1,-32,95.4,7.6), spray(8800,true,5.2),
  ptick(9000,51,-32,94,"Stairwell",9.6), spray(9400,true,4.8),
  exit_(9700,9.5,51.2,-32,94.1,9.4,"main_exit"),
  dopen(10200,10.0,51.4,-32,93.8,9.8),
  ptick(11000,49,-32,90,"Stairwell",12.4),
  ptick(12000,45,-32,85,"Computer Lab",16.1),
  ptick(13000,40,-32,82,"Computer Lab",18.8),
  ptick(14000,40,-32,79,"outside",21.2),
  ptick(15000,42,-32,74,"outside",24.6),
  assem(15600,15.4,42.8,-32,73.5),
  send(15700,"assembly_reached",88,true,18,62),
];

// FIRE HIGH — Ryan (92): pin 1.8s, 9 hits, assembly in 12s
const fireHighRyan = () => [
  sstart(200,"FIRE",0,37,-32,88),
  ptick(1000,37,-32,88,"Computer Lab",17.8), pinpull(1800),
  ptick(2000,39,-32,93,"Main Hall",12.6), spray(2500,false,12.6),
  ptick(3000,41,-32,97,"Main Hall",8.1),  spray(3200,true,7.4),
  ptick(4000,43,-32,100,"Main Hall",5.0), spray(4100,true,4.6),
  ptick(5000,44,-32,102,"Main Hall",3.4), spray(5000,true,3.2),
  ptick(6000,44,-32,103,"Main Hall",3.1), spray(5800,true,2.9),
  alarm(6400,6.2,50.0,-32,95.2,6.8),
  ptick(7000,50,-32,95,"Stairwell",7.1), spray(7000,true,3.8), spray(7600,true,3.4),
  ptick(8000,51,-32,93,"Stairwell",8.6), spray(8300,true,4.1),
  exit_(8600,8.4,51.3,-32,93.4,8.4,"main_exit"),
  dopen(9000,8.8,51.2,-32,93.7,8.6),
  ptick(9000,50,-32,89,"Stairwell",11.8),
  ptick(10000,46,-32,84,"Computer Lab",15.3),
  ptick(11000,41,-32,80,"outside",18.9),
  ptick(12000,40,-32,75,"outside",22.4),
  assem(12400,12.2,40.3,-32,73.8),
  send(12500,"assembly_reached",92,true,22,54),
];

// FIRE HIGH — Miguel (81): alarm, 5 hits
const fireHighMiguel = () => [
  sstart(200,"FIRE",0,35,-32,86),
  ptick(1000,35,-32,86,"Computer Lab",19.3),
  ptick(2000,37,-32,90,"Computer Lab",15.4),
  ptick(3000,39,-32,94,"Main Hall",11.6), pinpull(3500),
  ptick(4000,41,-32,98,"Main Hall",8.2),  spray(4600,false,8.2),
  ptick(5000,43,-32,101,"Main Hall",5.8), spray(5600,true,5.2),
  ptick(6000,44,-32,103,"Main Hall",4.0), spray(6500,true,3.7),
  ptick(7000,45,-32,103,"Main Hall",4.1), spray(7400,true,3.8),
  ptick(8000,44,-32,101,"Main Hall",5.2), spray(8400,true,4.8),
  alarm(9000,8.8,50.4,-32,95.6,7.4),
  ptick(9000,50,-32,96,"Stairwell",7.6),
  exit_(9800,9.6,51.0,-32,94.3,9.2,"main_exit"),
  dopen(10200,10.0,50.8,-32,93.8,9.6),
  ptick(10000,51,-32,92,"Stairwell",11.4),
  ptick(11000,47,-32,87,"Stairwell",14.8),
  ptick(12000,43,-32,83,"Computer Lab",17.2),
  ptick(13000,40,-32,79,"outside",20.6),
  ptick(14000,42,-32,74,"outside",23.9),
  ptick(15000,43,-32,70,"outside",27.1),
  assem(15800,15.6,43.5,-32,68.4),
  send(15900,"assembly_reached",81,true,14,79),
];

// FIRE MED — Maria (62): no alarm, 4 hits
const fireMed = () => [
  sstart(200,"FIRE",0,35,-32,88),
  ptick(1000,35,-32,88,"Computer Lab",17.6),
  ptick(2000,37,-32,92,"Main Hall",13.8),
  ptick(3000,38,-32,96,"Main Hall",10.2),
  ptick(4000,40,-32,99,"Main Hall",7.4),
  ptick(5000,41,-32,101,"Main Hall",5.6), pinpull(5600),
  ptick(6000,42,-32,102,"Main Hall",4.8), spray(6400,false,4.8),
  ptick(7000,43,-32,102,"Main Hall",4.5), spray(7500,true,4.1),
  ptick(8000,43,-32,101,"Main Hall",4.6), spray(8600,true,4.4),
  ptick(9000,44,-32,100,"Main Hall",5.0), spray(9700,true,4.8),
  ptick(10000,44,-32,99,"Main Hall",5.3), spray(10800,false,5.3),
  ptick(11000,43,-32,97,"Main Hall",6.4),
  ptick(12000,41,-32,94,"Main Hall",9.1),
  dopen(12600,12.4,40.9,-32,93.2,9.6),
  ptick(13000,39,-32,91,"Computer Lab",12.1),
  ptick(14000,37,-32,87,"Computer Lab",14.8),
  ptick(15000,36,-32,83,"Computer Lab",17.4),
  ptick(16000,36,-32,79,"outside",20.2),
  ptick(17000,38,-32,74,"outside",23.8),
  ptick(18000,40,-32,70,"outside",27.3),
  assem(18600,18.4,40.7,-32,68.6),
  send(18700,"assembly_reached",62,true,8,102),
];

// FIRE MED — Jasmine (44): hesitant 8 blocks, 2 hits, no alarm
const fireMedJasmine = () => [
  sstart(200,"FIRE",0,34,-32,87),
  ptick(1000,34,-32,87,"Computer Lab",18.9),
  ptick(2000,36,-32,91,"Computer Lab",14.8),
  ptick(3000,37,-32,95,"Main Hall",10.4),
  ptick(4000,38,-32,97,"Main Hall",9.0),
  ptick(5000,39,-32,98,"Main Hall",8.2),
  ptick(6000,40,-32,98,"Main Hall",8.1), pinpull(6800),
  ptick(7000,41,-32,98,"Main Hall",7.8), spray(7500,false,7.8),
  ptick(8000,41,-32,97,"Main Hall",8.0), spray(8600,false,8.0),
  ptick(9000,42,-32,97,"Main Hall",7.6), spray(9700,true,7.2),
  ptick(10000,42,-32,97,"Main Hall",7.6),
  ptick(11000,41,-32,96,"Main Hall",8.2), spray(11800,true,7.8),
  ptick(12000,40,-32,95,"Main Hall",8.8),
  ptick(13000,39,-32,93,"Main Hall",10.4),
  dopen(13700,13.5,38.8,-32,92.6,10.9),
  ptick(14000,38,-32,91,"Computer Lab",12.8),
  ptick(15000,36,-32,87,"Computer Lab",15.4),
  ptick(16000,35,-32,83,"Computer Lab",17.9),
  ptick(17000,35,-32,79,"outside",21.0),
  ptick(18000,37,-32,75,"outside",24.2),
  ptick(19000,39,-32,71,"outside",27.8),
  ptick(20000,40,-32,68,"outside",30.4),
  assem(20500,20.3,40.5,-32,67.1),
  send(20600,"assembly_reached",44,true,4,118),
];

// FIRE LOW — Patrick (28): timeout
const fireLow1 = () => [
  sstart(200,"FIRE",0,35,-32,87),
  ptick(1000,35,-32,87,"Computer Lab",18.8),
  ptick(2000,37,-32,91,"Computer Lab",14.6), pinpull(3000),
  ptick(3000,38,-32,93,"Main Hall",11.4), spray(3800,false,11.4),
  ptick(5000,39,-32,94,"Main Hall",10.6), spray(6000,false,10.6),
  ptick(10000,38,-32,93,"Main Hall",11.2),
  ptick(20000,37,-32,91,"Computer Lab",13.6),
  ptick(40000,37,-32,91,"Computer Lab",14.0),
  ptick(80000,36,-32,89,"Computer Lab",15.2),
  send(120000,"timeout",28,false,2,186),
];

// FIRE LOW — Chloe (12): froze
const fireLow2 = () => [
  sstart(200,"FIRE",0,36,-32,87),
  ptick(1000,36,-32,87,"Computer Lab",18.5),
  ptick(2000,36,-32,88,"Computer Lab",17.8),
  ptick(5000,36,-32,88,"Computer Lab",18.1),
  ptick(10000,36,-32,88,"Computer Lab",19.4),
  ptick(20000,35,-32,87,"Computer Lab",19.8),
  ptick(40000,35,-32,87,"Computer Lab",20.2),
  ptick(80000,35,-32,87,"Computer Lab",21.0),
  send(120000,"timeout",12,false,0,204),
];

// ── LIBRARY EARTHQUAKE ────────────────────────────────────────────────────────
const quakeHighJoshua = (mag) => [
  sstart(200,"EARTHQUAKE",mag,36,-32,88),
  ...[2,4,6,8,10,12,14,16,18,20,25,30,35,40,45,50,55,60].map(s=>ptick(s*1000,36,-32,88,"Computer Lab",99)),
  dopen(62000,62.0,36.1,-32,88.4,99),
  ptick(63000,36,-32,86,"Computer Lab",99), ptick(64000,37,-32,84,"Computer Lab",99),
  ptick(65000,38,-32,82,"outside",99),      ptick(66000,39,-32,79,"outside",99),
  ptick(67000,40,-32,76,"outside",99),      ptick(68000,41,-32,73,"outside",99),
  assem(68800,68.6,41.4,-32,72.2),
  send(68900,"assembly_reached",86,true,undefined,undefined,mag),
];

const quakeHighKaren = (mag) => [
  sstart(200,"EARTHQUAKE",mag,38,-32,89),
  ...[2,4,6,8,10].map(s=>ptick(s*1000,38,-32,89,"Computer Lab",99)),
  ptick(12000,38,-32,89,"Computer Lab",99),
  ptick(20000,39,-32,90,"Computer Lab",99), ptick(25000,40,-32,91,"Main Hall",99),
  ptick(30000,39,-32,90,"Computer Lab",99), ptick(35000,38,-32,89,"Computer Lab",99),
  ...[40,45,50,55].map(s=>ptick(s*1000,38,-32,89,"Computer Lab",99)),
  dopen(57000,56.8,38.2,-32,88.6,99),
  ptick(58000,38,-32,86,"Computer Lab",99), ptick(59000,39,-32,83,"Computer Lab",99),
  ptick(60000,39,-32,80,"outside",99),      ptick(61000,40,-32,77,"outside",99),
  ptick(62000,41,-32,74,"outside",99),
  assem(62700,62.5,41.2,-32,72.4),
  send(62800,"assembly_reached",78,true,undefined,undefined,mag),
];

const quakeMedMark = (mag) => [
  sstart(200,"EARTHQUAKE",mag,37,-32,88),
  ptick(1000,37,-32,88,"Computer Lab",99),
  ptick(2000,39,-32,91,"Main Hall",99), ptick(3000,41,-32,94,"Main Hall",99),
  ptick(4000,43,-32,97,"Main Hall",99), ptick(5000,42,-32,95,"Main Hall",99),
  ...[6,8,10,15,20,25,30,35,40,45,50].map(s=>ptick(s*1000,41,-32,94,"Main Hall",99)),
  dopen(52000,51.8,40.6,-32,93.2,99),
  ptick(53000,40,-32,90,"Computer Lab",99), ptick(54000,39,-32,86,"Computer Lab",99),
  ptick(55000,38,-32,82,"outside",99),      ptick(56000,39,-32,79,"outside",99),
  ptick(57000,40,-32,75,"outside",99),
  assem(57800,57.6,40.4,-32,73.8),
  send(57900,"assembly_reached",55,true,undefined,undefined,mag),
];

const quakeMedDiego = (mag) => [
  sstart(200,"EARTHQUAKE",mag,38,-32,89),
  ptick(1000,38,-32,89,"Computer Lab",99), ptick(2000,39,-32,91,"Main Hall",99),
  ptick(3000,39,-32,91,"Main Hall",99),
  ...[4,5,6,8,10,15,20,25].map(s=>ptick(s*1000,39,-32,91,"Main Hall",99)),
  ptick(30000,40,-32,92,"Main Hall",99), ptick(32000,39,-32,91,"Main Hall",99),
  ...[35,40,45].map(s=>ptick(s*1000,39,-32,91,"Main Hall",99)),
  dopen(47000,46.8,38.8,-32,90.4,99),
  ptick(48000,38,-32,87,"Computer Lab",99), ptick(49000,37,-32,84,"Computer Lab",99),
  ptick(50000,37,-32,80,"outside",99),      ptick(51000,38,-32,76,"outside",99),
  assem(51800,51.6,38.4,-32,74.6),
  send(51900,"assembly_reached",61,true,undefined,undefined,mag),
];

const quakeLow = (mag) => [
  sstart(200,"EARTHQUAKE",mag,36,-32,88),
  ptick(2000,38,-32,90,"Computer Lab",99),  ptick(4000,41,-32,94,"Main Hall",99),
  ptick(6000,44,-32,98,"Main Hall",99),     ptick(8000,42,-32,95,"Main Hall",99),
  ptick(10000,38,-32,91,"Computer Lab",99), ptick(15000,42,-32,95,"Main Hall",99),
  ptick(20000,45,-32,99,"Main Hall",99),    ptick(30000,41,-32,95,"Main Hall",99),
  ptick(40000,38,-32,91,"Computer Lab",99), ptick(80000,39,-32,92,"Computer Lab",99),
  send(120000,"timeout",18,false,undefined,undefined,mag),
];


// ── CCS rooms: Computer Lab X:130-136 Z:24-31 Y=-24, MacLab X:130-136 Z:33-39 Y=-24,
//    ccs_main_exit AABB(95,-33,68,125,-29,74), assembly AABB(76,-35,73,136,-28,90). ──

// CCS FIRE HIGH — Trisha (86): alarm 1.4s, 5 CO2 hits, clean south evac
const ccsFireHigh1 = () => [
  sstart(200,"CCS_FIRE",0,133,-24,27),
  ptick(1000,133,-24,27,"Computer Lab",6.2),
  alarm(1600,1.4,133.2,-24,26.8,5.8), pinpull(2000),
  ptick(2000,133,-24,27,"Computer Lab",5.9), co2(2600,true),
  ptick(3000,132,-24,27,"Computer Lab",5.4), co2(4000,true),
  ptick(4000,131,-24,28,"Computer Lab",4.8), co2(5400,true),
  ptick(5000,131,-24,29,"Computer Lab",4.6), co2(6800,true),
  ptick(6000,132,-24,30,"Computer Lab",4.9), co2(8200,false),
  ptick(7000,133,-24,29,"Computer Lab",5.1), co2(9600,true),
  ptick(8000,133,-24,31,"Computer Lab",6.2),
  ptick(9000,133,-24,35,"MacLab",8.4),
  ptick(10000,131,-24,38,"MacLab",9.1),
  ptick(11000,120,-24,37,"corridor",14.8),
  ptick(12000,108,-27,36,"corridor",20.6),
  ptick(13000,103,-31,38,"corridor",24.2),
  ptick(14000,103,-31,50,"corridor",26.8),
  ptick(15000,105,-31,62,"corridor",29.1),
  ptick(16000,107,-31,68,"corridor",31.4),
  exit_(16600,16.4,107.1,-31,70.2,32.1,"ccs_main_exit"),
  dopen(17000,16.8,107.4,-31,71.2,32.6),
  ptick(17000,107,-31,72,"corridor",33.0),
  ptick(18000,108,-32,76,"outside",34.2),
  ptick(19000,110,-32,80,"outside",35.8),
  assem(19600,19.4,110.5,-32,81.2),
  send(19700,"assembly_reached",86,true,11,74),
];

// CCS FIRE HIGH — Luis (76): MacLab spawn, found fire, 4 hits
const ccsFireHigh2 = () => [
  sstart(200,"CCS_FIRE",0,133,-24,36),
  ptick(1000,133,-24,36,"MacLab",4.2),
  ptick(2000,133,-24,32,"MacLab",5.1),
  ptick(3000,133,-24,29,"Computer Lab",5.8),
  alarm(3400,3.2,133.1,-24,28.8,5.6), pinpull(3800),
  ptick(4000,132,-24,27,"Computer Lab",5.4), co2(4800,true),
  ptick(5000,131,-24,27,"Computer Lab",5.1), co2(6200,false),
  ptick(6000,131,-24,28,"Computer Lab",4.9), co2(7600,true),
  ptick(7000,132,-24,29,"Computer Lab",5.0), co2(9000,true),
  ptick(8000,133,-24,30,"Computer Lab",5.3), co2(10400,false),
  ptick(9000,133,-24,31,"Computer Lab",5.8), co2(11800,true),
  ptick(10000,133,-24,35,"MacLab",7.9),
  ptick(11000,132,-24,39,"MacLab",9.6),
  ptick(12000,121,-24,39,"corridor",16.1),
  ptick(13000,110,-27,38,"corridor",22.4),
  ptick(14000,104,-31,40,"corridor",26.3),
  ptick(15000,104,-31,52,"corridor",28.0),
  ptick(16000,104,-31,64,"corridor",30.2),
  exit_(16800,16.6,104.3,-31,70.6,31.4,"ccs_main_exit"),
  dopen(17100,16.9,104.6,-31,71.4,31.9),
  ptick(17000,104,-31,72,"corridor",32.8),
  ptick(18000,105,-32,77,"outside",34.4),
  ptick(19000,107,-32,82,"outside",36.1),
  assem(19700,19.5,107.5,-32,83.4),
  send(19800,"assembly_reached",76,true,8,88),
];

// CCS FIRE MED — Kevin (52): no alarm, 3 hits, slow
const ccsFireMed1 = () => [
  sstart(200,"CCS_FIRE",0,132,-24,28),
  ptick(1000,132,-24,28,"Computer Lab",5.6),
  ptick(2000,131,-24,27,"Computer Lab",5.3), pinpull(2800),
  ptick(3000,131,-24,27,"Computer Lab",5.1), co2(3600,false),
  ptick(4000,131,-24,27,"Computer Lab",5.1), co2(5000,true),
  ptick(5000,132,-24,28,"Computer Lab",5.3), co2(6400,true),
  ptick(6000,133,-24,29,"Computer Lab",5.8), co2(7800,false),
  ptick(7000,133,-24,29,"Computer Lab",5.8), co2(9200,true),
  ptick(8000,134,-24,30,"Computer Lab",6.1),
  ptick(10000,134,-24,31,"Computer Lab",6.4),
  ptick(12000,133,-24,35,"MacLab",8.2),
  ptick(15000,131,-24,38,"MacLab",9.8),
  dopen(17000,16.8,119.4,-25,37.4,14.2),
  ptick(18000,117,-26,38,"corridor",18.4),
  ptick(20000,105,-31,40,"corridor",24.6),
  ptick(25000,104,-31,54,"corridor",27.2),
  ptick(30000,104,-31,66,"corridor",30.4),
  exit_(31000,30.8,104.1,-31,70.4,31.2,"ccs_main_exit"),
  dopen(31400,31.2,104.3,-31,71.2,31.8),
  ptick(32000,103,-31,73,"corridor",32.6),
  ptick(34000,103,-32,78,"outside",34.1),
  ptick(36000,104,-32,83,"outside",35.8),
  assem(36800,36.6,104.3,-32,84.6),
  send(36900,"assembly_reached",52,true,6,121),
];

// CCS FIRE MED — Nina (40): 2 hits, slow
const ccsFireMed2 = () => [
  sstart(200,"CCS_FIRE",0,134,-24,26),
  ptick(1000,134,-24,26,"Computer Lab",6.4),
  ptick(2000,133,-24,27,"Computer Lab",5.9),
  ptick(3000,132,-24,27,"Computer Lab",5.4), pinpull(3800),
  ptick(4000,132,-24,27,"Computer Lab",5.4), co2(4800,false),
  ptick(5000,132,-24,27,"Computer Lab",5.4), co2(6200,false),
  ptick(6000,131,-24,28,"Computer Lab",5.1), co2(7600,true),
  ptick(7000,131,-24,28,"Computer Lab",5.1), co2(9000,false),
  ptick(8000,132,-24,29,"Computer Lab",5.3), co2(10400,true),
  ptick(9000,133,-24,29,"Computer Lab",5.7),
  ptick(12000,133,-24,30,"Computer Lab",6.0),
  ptick(15000,133,-24,34,"MacLab",8.1),
  ptick(20000,130,-24,38,"MacLab",10.4),
  ptick(25000,117,-27,38,"corridor",18.6),
  ptick(30000,105,-31,42,"corridor",24.8),
  ptick(35000,104,-31,56,"corridor",28.4),
  ptick(40000,103,-31,67,"corridor",30.8),
  exit_(41500,41.3,103.4,-31,70.8,31.6,"ccs_main_exit"),
  ptick(42000,103,-31,73,"corridor",32.4),
  ptick(44000,103,-32,78,"outside",34.2),
  ptick(46000,104,-32,83,"outside",35.9),
  ptick(48000,105,-32,86,"outside",37.6),
  assem(49000,48.8,105.4,-32,87.2),
  send(49100,"assembly_reached",40,true,3,148),
];

// CCS FIRE LOW — Aira (14): timeout
const ccsFireLow = () => [
  sstart(200,"CCS_FIRE",0,133,-24,27),
  ptick(1000,133,-24,27,"Computer Lab",6.1),
  ptick(2000,133,-24,27,"Computer Lab",6.1), pinpull(2400),
  co2(3000,false),
  ptick(3000,133,-24,27,"Computer Lab",6.1),
  ptick(5000,132,-24,28,"Computer Lab",5.8), co2(6000,false),
  ptick(10000,132,-24,28,"Computer Lab",6.0),
  ptick(20000,133,-24,27,"Computer Lab",6.2),
  ptick(40000,133,-24,27,"Computer Lab",6.4),
  ptick(80000,134,-24,26,"Computer Lab",6.6),
  send(120000,"timeout",14,false,0,163),
];

// ── CCS EARTHQUAKE ────────────────────────────────────────────────────────────
const ccsQuakeHigh = (mag) => [
  sstart(200,"CCS_EARTHQUAKE",mag,132,-24,28),
  ...[2,4,6,8,10,15,20,25,30,35,40,45,50].map(s=>ptick(s*1000,132,-24,28,"Computer Lab",99)),
  ptick(52000,132,-24,31,"Computer Lab",99), ptick(53000,131,-24,36,"MacLab",99),
  ptick(54000,119,-26,37,"corridor",99),     ptick(55000,106,-31,40,"corridor",99),
  ptick(56000,105,-31,54,"corridor",99),     ptick(57000,105,-31,66,"corridor",99),
  exit_(57600,57.4,105.2,-31,70.6,99,"ccs_main_exit"),
  ptick(58000,105,-31,73,"corridor",99),     ptick(59000,106,-32,78,"outside",99),
  assem(59600,59.4,106.2,-32,79.4),
  send(59700,"assembly_reached",83,true,undefined,undefined,mag),
];

const ccsQuakeMed = (mag) => [
  sstart(200,"CCS_EARTHQUAKE",mag,133,-24,27),
  ...[2,4,6,8,10].map(s=>ptick(s*1000,133,-24,27,"Computer Lab",99)),
  ptick(12000,134,-24,29,"Computer Lab",99),
  ptick(15000,135,-24,31,"Computer Lab",99),
  ptick(20000,133,-24,29,"Computer Lab",99),
  ...[25,30,35,40].map(s=>ptick(s*1000,133,-24,28,"Computer Lab",99)),
  ptick(42000,133,-24,31,"Computer Lab",99), ptick(43000,132,-24,36,"MacLab",99),
  ptick(44000,120,-26,37,"corridor",99),     ptick(45000,108,-31,40,"corridor",99),
  ptick(46000,106,-31,55,"corridor",99),     ptick(47000,105,-31,67,"corridor",99),
  exit_(47600,47.4,105.1,-31,70.8,99,"ccs_main_exit"),
  ptick(48000,105,-31,73,"corridor",99),     ptick(49000,106,-32,79,"outside",99),
  ptick(50000,107,-32,83,"outside",99),
  assem(50700,50.5,107.3,-32,84.6),
  send(50800,"assembly_reached",57,true,undefined,undefined,mag),
];

const ccsQuakeLow = (mag) => [
  sstart(200,"CCS_EARTHQUAKE",mag,132,-24,27),
  ptick(2000,134,-24,30,"Computer Lab",99),  ptick(4000,130,-24,33,"MacLab",99),
  ptick(6000,132,-24,36,"MacLab",99),        ptick(8000,131,-24,38,"MacLab",99),
  ptick(10000,133,-24,35,"MacLab",99),       ptick(15000,132,-24,30,"Computer Lab",99),
  ptick(20000,134,-24,27,"Computer Lab",99), ptick(30000,131,-24,34,"MacLab",99),
  ptick(40000,133,-24,28,"Computer Lab",99), ptick(80000,132,-24,27,"Computer Lab",99),
  send(120000,"timeout",16,false,undefined,undefined,mag),
];

// ── 10 Hz CSV builder ─────────────────────────────────────────────────────────
const CSV_HEADER = 'player_id,session_id,scenario_type,timestamp,event_type,x,y,z,hazard_distance,interaction_target,nearby_player_count';

function buildMoveCsv(events, sessionId, playerId, scenarioType) {
  const rows = [CSV_HEADER];
  const keyframes = events
    .filter(e=>e.type==='SIM_START'||e.type==='PLAYER_TICK')
    .sort((a,b)=>a.tOffsetMs-b.tOffsetMs)
    .map(e=>({tMs:e.tOffsetMs,x:Number(e.data.x),y:Number(e.data.y),z:Number(e.data.z),hd:Number(e.type==='SIM_START'?99:(e.data.nearest_fire_dist??99))}));
  const simStart=events.find(e=>e.type==='SIM_START');
  const simEnd=events.find(e=>e.type==='SIM_END');
  const endMs=simEnd?simEnd.tOffsetMs:(keyframes.at(-1)?.tMs??0);
  if(simStart) rows.push(`${playerId},${sessionId},${scenarioType},0.0,session_start,${simStart.data.x},${simStart.data.y},${simStart.data.z},99.0,,`);
  if(keyframes.length>=2){
    let kfIdx=0;
    const n=()=>(Math.random()-0.5)*0.12;
    for(let tMs=keyframes[0].tMs;tMs<endMs;tMs+=100){
      while(kfIdx<keyframes.length-2&&keyframes[kfIdx+1].tMs<=tMs) kfIdx++;
      const kf0=keyframes[kfIdx];
      const kf1=keyframes[Math.min(kfIdx+1,keyframes.length-1)];
      let x,y,z,hd;
      if(kf1.tMs<=kf0.tMs){x=kf0.x;y=kf0.y;z=kf0.z;hd=kf0.hd;}
      else{const frac=Math.min(1,(tMs-kf0.tMs)/(kf1.tMs-kf0.tMs));x=kf0.x+frac*(kf1.x-kf0.x);y=kf0.y+frac*(kf1.y-kf0.y);z=kf0.z+frac*(kf1.z-kf0.z);hd=kf0.hd+frac*(kf1.hd-kf0.hd);}
      const tSec=(tMs/1000).toFixed(1);
      rows.push(`${playerId},${sessionId},${scenarioType},${tSec},move_tick,${(x+n()).toFixed(2)},${y.toFixed(0)},${(z+n()).toFixed(2)},${Math.max(0,hd).toFixed(1)},,`);
    }
  }
  const ACTION=new Set(['door_open','fire_alarm_activate','EXT_SPRAY','extinguisher_use','emergency_exit','assembly_area_reached']);
  for(const e of events.filter(e=>ACTION.has(e.type)).sort((a,b)=>a.tOffsetMs-b.tOffsetMs)){
    const tSec=(e.tOffsetMs/1000).toFixed(1);
    const ex=e.data.x??'',ey=e.data.y??'',ez=e.data.z??'';
    const hd=e.data.hazard_distance??e.data.distance_to_fire??99;
    let evType=e.type,target='',nearby='';
    if(e.type==='EXT_SPRAY'){evType='extinguisher_use';target=e.data.hit_fire?'fire_block':'';nearby='0';}
    else if(e.type==='extinguisher_use'){target=e.data.hit_target?'computer':'';nearby='0';}
    else if(e.type==='door_open'){target=e.data.target??'dark_oak_door';}
    else if(e.type==='emergency_exit'){target=e.data.exit??'';}
    rows.push(`${playerId},${sessionId},${scenarioType},${tSec},${evType},${ex},${ey},${ez},${hd},${target},${nearby}`);
  }
  if(simEnd){
    const tSec=(simEnd.tOffsetMs/1000).toFixed(1);
    const lk=keyframes.at(-1)??{x:'',y:'',z:''};
    rows.push(`${playerId},${sessionId},${scenarioType},${tSec},session_end,${lk.x},${lk.y},${lk.z},99,,`);
  }
  const hdr=rows.shift();
  rows.sort((a,b)=>parseFloat(a.split(',')[3])-parseFloat(b.split(',')[3]));
  rows.unshift(hdr);
  return rows.join('\n');
}

// ── Sessions ──────────────────────────────────────────────────────────────────
const ts=(d,h,m)=>`${d}T${h}:${m}:00.000Z`;
const sessions=[
  // LIBRARY FIRE (7)
  {name:"Ana Dela Cruz",    id:"2024-00101",section:"BSCS3A",simType:"FIRE",           score:88,passed:1,prep:"HIGH",    conf:4.8,notes:"Excellent. Pin 2.2s, alarm 8s, 7 hits.",                                  start:ts("2026-06-20","07","05"),end:ts("2026-06-20","07","07"),log:fireHighAna()},
  {name:"Ryan Mendoza",     id:"2024-00102",section:"BSIT3B",simType:"FIRE",           score:92,passed:1,prep:"HIGH",    conf:5.0,notes:"Outstanding. Pin 1.8s, alarm 6.4s, 9 hits. Assembly 12s.",               start:ts("2026-06-20","07","12"),end:ts("2026-06-20","07","14"),log:fireHighRyan()},
  {name:"Miguel Santos",    id:"2024-00103",section:"BSCS3A",simType:"FIRE",           score:81,passed:1,prep:"HIGH",    conf:4.5,notes:"Good PASS. Alarm before evacuation.",                                     start:ts("2026-06-20","08","30"),end:ts("2026-06-20","08","32"),log:fireHighMiguel()},
  {name:"Maria Reyes",      id:"2024-00104",section:"BSIT3A",simType:"FIRE",           score:62,passed:1,prep:"MODERATE",conf:3.2,notes:"Skipped alarm. 4 accurate hits.",                                         start:ts("2026-06-21","09","10"),end:ts("2026-06-21","09","12"),log:fireMed()},
  {name:"Jasmine Lim",      id:"2024-00105",section:"BSCS3B",simType:"FIRE",           score:44,passed:1,prep:"MODERATE",conf:2.8,notes:"Hesitated 8 blocks. 2 hits. No alarm.",                                   start:ts("2026-06-21","10","05"),end:ts("2026-06-21","10","08"),log:fireMedJasmine()},
  {name:"Patrick Tan",      id:"2024-00106",section:"BSCS3B",simType:"FIRE",           score:28,passed:0,prep:"LOW",     conf:1.8,notes:"No alarm, 2 misses, no evacuation. Timeout.",                            start:ts("2026-06-22","11","00"),end:ts("2026-06-22","11","02"),log:fireLow1()},
  {name:"Chloe Garcia",     id:"2024-00107",section:"BSCS2A",simType:"FIRE",           score:12,passed:0,prep:"LOW",     conf:1.5,notes:"Froze completely. No actions. Timeout.",                                  start:ts("2026-06-23","08","00"),end:ts("2026-06-23","08","02"),log:fireLow2()},
  // LIBRARY EARTHQUAKE (5)
  {name:"Joshua Hernandez", id:"2024-00108",section:"BSCS3A",simType:"EARTHQUAKE",     score:86,passed:1,prep:"HIGH",    conf:4.6,notes:"Textbook drop-cover-hold-on. Zero movement 60s.",                        start:ts("2026-06-20","13","10"),end:ts("2026-06-20","13","12"),log:quakeHighJoshua(7.2)},
  {name:"Karen Villanueva", id:"2024-00109",section:"BSIT3A",simType:"EARTHQUAKE",     score:78,passed:1,prep:"HIGH",    conf:4.2,notes:"Good cover. Slight drift aftershock, self-corrected 5s.",                start:ts("2026-06-21","13","30"),end:ts("2026-06-21","13","32"),log:quakeHighKaren(6.5)},
  {name:"Mark Flores",      id:"2024-00110",section:"BSCS3B",simType:"EARTHQUAKE",     score:55,passed:1,prep:"MODERATE",conf:3.0,notes:"Moved 4s before cover. Evacuated after shaking.",                         start:ts("2026-06-22","13","15"),end:ts("2026-06-22","13","15"),log:quakeMedMark(6.8)},
  {name:"Diego Aquino",     id:"2024-00111",section:"BSIT3A",simType:"EARTHQUAKE",     score:61,passed:1,prep:"MODERATE",conf:3.3,notes:"Settled faster. Small drift at 30s, re-covered.",                        start:ts("2026-06-25","10","20"),end:ts("2026-06-25","10","22"),log:quakeMedDiego(7.0)},
  {name:"Lily Torres",      id:"2024-00112",section:"BSIT3B",simType:"EARTHQUAKE",     score:18,passed:0,prep:"LOW",     conf:1.9,notes:"Ran continuously. No cover. Timeout.",                                   start:ts("2026-06-23","14","00"),end:ts("2026-06-23","14","02"),log:quakeLow(7.5)},
  // CCS FIRE (5)
  {name:"Trisha Pascual",   id:"2024-00113",section:"BSCS3A",simType:"CCS_FIRE",       score:86,passed:1,prep:"HIGH",    conf:4.4,notes:"CCS: Alarm 1.4s, 5 CO2 hits. Textbook Class C. Assembly south.",         start:ts("2026-06-25","13","00"),end:ts("2026-06-25","13","01"),log:ccsFireHigh1()},
  {name:"Luis Bautista",    id:"2024-00114",section:"BSIT3B",simType:"CCS_FIRE",       score:76,passed:1,prep:"HIGH",    conf:4.1,notes:"CCS: MacLab start, found fire, alarm, 4 CO2 hits.",                      start:ts("2026-06-27","07","30"),end:ts("2026-06-27","07","31"),log:ccsFireHigh2()},
  {name:"Kevin Morales",    id:"2024-00115",section:"BSIT3A",simType:"CCS_FIRE",       score:52,passed:1,prep:"MODERATE",conf:3.0,notes:"CCS: No alarm. 3 CO2 hits/5. Slow evac.",                                start:ts("2026-06-26","08","00"),end:ts("2026-06-26","08","02"),log:ccsFireMed1()},
  {name:"Nina Ramos",       id:"2024-00116",section:"BSCS2A",simType:"CCS_FIRE",       score:40,passed:1,prep:"MODERATE",conf:2.8,notes:"CCS: 2 CO2 hits, 3 misses. No alarm. Very slow evacuation.",             start:ts("2026-06-27","08","15"),end:ts("2026-06-27","08","17"),log:ccsFireMed2()},
  {name:"Aira Santos",      id:"2024-00117",section:"BSCS3B",simType:"CCS_FIRE",       score:14,passed:0,prep:"LOW",     conf:1.7,notes:"CCS: Confused. No alarm, no hits, no evacuation. Timeout.",              start:ts("2026-06-26","09","30"),end:ts("2026-06-26","09","32"),log:ccsFireLow()},
  // CCS EARTHQUAKE (3)
  {name:"Bernard Cruz",     id:"2024-00118",section:"BSCS3A",simType:"CCS_EARTHQUAKE", score:83,passed:1,prep:"HIGH",    conf:4.6,notes:"CCS: Drop-cover Computer Lab 50s. Clean south evac to assembly.",       start:ts("2026-06-28","09","00"),end:ts("2026-06-28","09","01"),log:ccsQuakeHigh(7.4)},
  {name:"Carla Navarro",    id:"2024-00119",section:"BSIT3A",simType:"CCS_EARTHQUAKE", score:57,passed:1,prep:"MODERATE",conf:3.2,notes:"CCS: Drifted aftershock 20s, recovered. Evacuated promptly.",           start:ts("2026-06-28","10","10"),end:ts("2026-06-28","10","12"),log:ccsQuakeMed(7.0)},
  {name:"Edward Lim",       id:"2024-00120",section:"BSCS2A",simType:"CCS_EARTHQUAKE", score:16,passed:0,prep:"LOW",     conf:1.6,notes:"CCS: Ran upper floor. No cover. Timeout.",                              start:ts("2026-06-29","09","30"),end:ts("2026-06-29","09","32"),log:ccsQuakeLow(8.0)},
];

const INSERT=`INSERT INTO sessions (student_name,station_account,account_uuid,student_id,section,start_time,end_time,status,tutorial_completed,tutorial_duration_s,simulation_type,simulation_score,passed,event_log,prep_level,confidence,bfp_notes,move_log_csv) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

async function seed(){
  console.log("Ensuring move_log_csv column exists...");
  await silentAlter("ALTER TABLE sessions ADD COLUMN move_log_csv TEXT");
  console.log("Clearing sessions and audit_logs...");
  await pipeline([ex("DELETE FROM audit_logs"),ex("DELETE FROM sessions")]);
  console.log("Cleared.\n");
  for(const s of sessions){
    const moveCsv=buildMoveCsv(s.log,`synth-${s.id}`,`stu-${s.id}`,s.simType.toLowerCase());
    await pipeline([ex(INSERT,[
      t(s.name),t("station_demo"),t(`synth-${s.id}`),t(s.id),t(s.section),
      t(s.start),t(s.end),t("completed"),i(1),i(90),
      t(s.simType),i(s.score),i(s.passed),
      t(JSON.stringify(s.log)),t(s.prep),f(s.conf),t(s.notes),
      t(moveCsv),
    ])]);
    const csvRows=moveCsv.split('\n').length-1;
    console.log(`OK ${s.name.padEnd(22)} ${s.simType.padEnd(16)} ${s.prep.padEnd(8)} score=${String(s.score).padEnd(4)} csv=${csvRows} rows`);
  }
  console.log(`\nDone - ${sessions.length} sessions inserted.`);
}
seed().catch(e=>{console.error(e);process.exit(1);});
