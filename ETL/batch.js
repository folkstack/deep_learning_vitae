var argv = require('minimist')(process.argv.slice(2))
const fs = require('fs')
var spawn = argv.n || 3

if(argv.f>0){
  const sql = require('better-sqlite3')
  const db = new sql(`./.dummy${argv.f}.db`)
  db.prepare(`attach database "./batch.db" as batch`).run()

  process.on('message', m => {
    let tickers = m.data
    let bms = m.begin
    let header = m.header
    tickers.forEach(e => {
      console.log('starting %s', e)
      let group = []


      try{
        db.prepare(`attach database "data/${e}/${e}.db" as sym`).run()
        const short_sel = db.prepare('select * from sym.short where tradeReportDate=date(?)')
        const ast_sel = db.prepare('select * from sym.ast where weekStartDate=date(?)')
        const ticker_sel = db.prepare('select * from sym.ticker limit ? offset ?' )
        var lorenz = db.prepare(`select * from batch.lorenz where symbol=?`).all(e)
        var count = db.prepare('select count(*) from sym.ticker').get()
        var Batch = function*(limit=1){
          var res = []
          for(let i = 0; i < Object.values(count)[0]/limit; i++){
            //console.log(i * limit)
            res = ticker_sel.all(limit, i*limit)
            yield res
          }
          console.log('end ticker %s on dummy %d', e, argv.f)
          process.send({ticker: e, table: group})
      }
        var _batch = Batch(32)
        var write = res => {
          res.map(e => Object.assign({...header}, e)).forEach(e => {
            var ds = e.date //= e.date.split('T')[0]
            e.date = e.date.split('T')[0]
            var bgs = new Date(e.date).getTime() / (1000 * 3600 * 24)
            e.date = bgs - bms
            try{
            var entry = ast_sel.all(e.date)

            if(entry && entry.length > 0){ 
              entry.forEach(n => {
                e[n['marketParticipantName'].slice(0, 8).replace(/\./g, 'x')] = n.totalWeeklyShareQuantity
              })  
            }
            entry = short_sel.all(e.date)
            if(entry && entry.length > 0) {
              entry.forEach(n => {
                e[n.reportingFacilityCode] = n['shortParQuantity']
              })
            }
            } catch(err) {console.log(err)}

            var l_entry = lorenz.filter(l => l.date == ds)[0]
            e.percentile = l_entry.percentile
            //e = Object.assign({...e}, l_entry)
            
            delete e.Market
            delete e.marketParticipantName
            delete e.timestamp
            //console.log(e.date, e.symbol)
            group.push(e)
            //return e
            })
        }

        for(var xx of _batch) write(xx)
      } catch(err){
        //console.log(err) 
        process.send({ticker: e, err: err, table: null})
      }
      db.prepare(`detach database sym`).run()
    })
  })
} else{// main thread
  console.log(argv)
  var fork = require('child_process').fork
  var meta = require('./meta.json')
  var tickers = meta.groups.slice(4)
  var jobs = tickers.reduce((a, e, i) => {
    //console.log(i%7, e, a[i%7].length)
    a[i%spawn].push(e)
    return a
  },new Array(spawn).fill(0).map(e => []))


//console.log(jobs[1])
//process.exit()

  var procs = Array(spawn).fill(0).map((e,i) => fork(__filename, ['-f', i+1]))
  
  //process.on('exit', e => procs.forEach(e => e.exit()))
  const csv = require('fast-csv')
  let d = csv.format({headers: true})
  d.pipe(fs.createWriteStream('./batch-test.csv'))
  procs.forEach((e,i) => e.on('message', data => {
    jobs[i] = jobs[i].filter(e => e == data.ticker ? false : true)
    if(data.err) console.log(err)
    else if(data.table && data.table.length){
      data.table.forEach(e=>d.write(e)) //write(data.table)
      console.log('write ticker %s', data.ticker)
    }
    if(jobs.flat().length == 0) {
      d.end()
      d.on('close', e => {
        procs.forEach(e => e.kill('SIGINT'))
        process.exit()
      })
    } else console.log(jobs.flat().length)
  }))

  procs.forEach((e,i) => e.send({data: jobs[i], header: meta.header, begin: meta.beginS}))

}
//process.exit()
/*
let batch = ticker_sel.all().map(e => Object.assign({...header}, e)).map(e => {
  console.log(e)
  var entry = ast_sel.all(e.date, e.symbol)

  if(entry && entry.length > 0){ 
    entry.forEach(n => {
      e[n['marketParticipantName'].slice(0, 5)] = n.totalWeeklyShareQuantity
      //e.aphase = n.aphase

    })  
  }
  entry = short_sel.all(e.date, e.symbol)
  if(entry && entry.length > 0) {
    entry.forEach(n => {
      e[n.reportingFacilityCode] = n['shortParQuantity']
    })
  }
  delete e.Market
  delete e.marketParticipantName
  delete e.timestamp
  d.write(e)
  return e
})
d.end()
*/

//batch = batch.concat(astbatch)

/*
batch = batch.map(e => { 
  delete e['Trade Facility']
  delete e.MPID
  delete e['Short Volume']
  delete e['Total Volume']
  delete e.totalWeeklyShareQuantity
  delete e.totalWeeklyTradeCount
  for(n in e) if(e[n].length == 0) e[n] = 0
  //console.log(e)
  delete e.Market
  delete e.marketParticipantName
  delete e.timestamp
  return e
  // need to go over features list and reverse one hot
  //console.log(entry)
})

*/
//batch = batch.sort((a,b) => a.date < b.date)
/*
batch = batch.slice(1).map((e,i) => {
  e = {...e}
//  console.log(e.date, batch[i].date, e.high, batch[i].high)

  e.high = e.high - batch[i].high
  e.low = e.low - batch[i].low
  e.open = e.open - batch[i].open
  e.close = e.close - batch[i].close
  return e
})
*/
//console.log(batch.map(e => e.high))

//batch.forEach(dashify)
function nullify(x) { for(a in x) if (x[a] && x[a].length == 0) x[a] = null }
function dashify(x) { for(a in x) if (x[a] == null) x[a] = '-' }
function zero(x) { for(a in x) if (x[a] && x[a] == null) x[a] = 0 }
// select from short and ast, map to select from ticker same date
// query ast and shorts for string features, and add them to the header, then one hot them

//const features = tp.map(e => /feature/.test(e.name) ? e.name : false).filter(Boolean)
//const t_eras = db.prepare('select distinct(era) from train').all().map(e => e.era)//.sort()
//process.exit()
//var valids = db.prepare('select count(distinct(id)) from compete where data_type="validation"').get()['count(distinct(id))']
