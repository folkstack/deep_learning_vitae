var fs = require('fs')
//const argv = require('minimist')(process.argv)
const sql = require('better-sqlite3')

const db = new sql('../batch.db')
db.pragma('cache_size=24000');
const ticker_pragma = db.prepare('PRAGMA table_info(ticker)')
const tt = ticker_pragma.all()

let categories = ['symbol']
let features = [].concat(db.prepare('select distinct(reportingFacilityCode) from short').all()).concat(db.prepare('select distinct(marketParticipantName) from ast').all())
var count = db.prepare('select count(*) from ticker').get()
//console.log(count)
let groups = db.prepare('select distinct(symbol) from ticker').all().map(e => Object.values(e)[0])

var begin = db.prepare('select date from ticker order by date asc limit 1;').get()
begin = Object.values(begin)[0].split('T')[0]
var bms = new Date(begin).getTime() / (1000 * 3600 * 24)

features = features.map(e => {
  let f = Object.values(e)[0]
  if(f) return f.slice(0,8).replace(/\./g, 'x')
  else return false}).filter(Boolean)

let kreals = ['date', 'phase']
let reals = tt.filter(e => e.name == 'date' || e.name == 'phase' || e.name == 'marketParticipantName' || e.name == 'Market' || e.name == 'timestamp' ? false : true).map(e => e.name).concat(features)

//console.log(reals)
ureals = reals.reduce((a,e)=>{
  a[e] = 0
  return a
}, {})

let header = Object.assign(kreals.concat(features).concat(categories).reduce((a, e)=> {
  a[e]=0//'-'// what pytorch forecaster wants according to docs..?
  return a
},{}), ureals)

let meta = {unknownReals:reals, knownReals: kreals, features:features, categories:categories, groups: groups, header: header, begin: begin, beginS: bms}
fs.writeFileSync('./meta.json', JSON.stringify(meta), 'utf8')

