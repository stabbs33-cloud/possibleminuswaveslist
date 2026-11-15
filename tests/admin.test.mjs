import test from 'node:test';
import assert from 'node:assert/strict';
import { validDocument } from '../netlify/server/validation.mjs';
import handler from '../netlify/server/index.mjs';
const level = { name: 'New wave', points: 12.5, id: '123456', verifier: 'Fotca', url: 'https://youtu.be/example' };
test('level validation rejects duplicate names, unsafe links, invalid points and IDs', () => {
  assert.equal(validDocument('levels', { items: [level] }), true);
  for (const change of [{name:'hateful'}, {points:-1}, {points:Infinity}, {points:'12'}, {id:'<script>'}, {url:'javascript:alert(1)'}, {name:'__proto__'}]) {
    assert.equal(validDocument('levels', {items:[{...level,...change}]}), false);
  }
  assert.equal(validDocument('levels', {items:[level,level]}), false);
});
test('completions require known players, valid levels, and no duplicates', () => {
  assert.equal(validDocument('completions', {map:{Fotca:['Hateful']}}), true);
  assert.equal(validDocument('completions', {map:{Fotca:['New wave']}}, ['New wave']), true);
  assert.equal(validDocument('completions', {map:{Unknown:['Hateful']}}), false);
  assert.equal(validDocument('completions', {map:{Fotca:['Unknown']}}), false);
  assert.equal(validDocument('completions', {map:{Fotca:['Hateful','Hateful']}}), false);
});
test('anonymous visitors cannot save and session responses cannot be cached', async () => {
  const response=await handler(new Request('https://example.com/api/data',{method:'PUT'}));
  assert.equal(response.status,403);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  const session=await handler(new Request('https://example.com/api/session'));
  assert.deepEqual(await session.json(),{admin:false});
});
test('unsupported methods and routes are rejected before touching storage', async () => {
  assert.equal((await handler(new Request('https://example.com/api/data',{method:'DELETE'}))).status,405);
  assert.equal((await handler(new Request('https://example.com/api/unknown'))).status,404);
});

test('page initializes and added completions update profile totals without double counting verifications', async () => {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*?;$/m,'');
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id,{ value:'',textContent:'',innerHTML:'',hidden:false,style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(n){nodes.set(n.id,n)},querySelectorAll(){return []},remove(){nodes.delete(id)} });
    return nodes.get(id);
  };
  const context = vm.createContext({
    document:{getElementById:node,createElement:()=>({})},
    window:{scrollY:0,addEventListener(){},scrollTo(){}},
    fetch:async path=>({ok:true,json:async()=>path==='/api/session'?{admin:false}:{levels:{version:0,value:{items:[]}},completions:{version:0,value:{map:{}}},mods:{version:0,value:{names:[]}}}}),
    getUser:async()=>null,handleAuthCallback:async()=>null,
    console,
  });
  vm.runInContext(script,context);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(vm.runInContext('score(PLAYERS[0])',context),642.5);
  vm.runInContext('EXTRA={Fotca:["Hateful"]};renderLeaderboard();showPlayer(0)',context);
  assert.equal(vm.runInContext('score(PLAYERS[0])',context),692.5);
  assert.match(node('pPts').textContent,/692.5 points/);
  vm.runInContext('EXTRA={TheOmol:["Hateful"]}',context);
  assert.equal(vm.runInContext('score(PLAYERS[1])',context),534);
  assert.match(node('list').innerHTML,/Hateful/);
});
