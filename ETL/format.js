var walk = require('walker')
var files = []
var fs = require('fs')
var csv = []
var path = require('path')
var csv = require('fast-csv')
var headers = {}
//var ticker = require('./AAPL.json')
//var shorts = fs.readFileSync('./shorts.csv')
var ats = []
var shorts = []
var cwd = process.cwd()
var phase = require('lunar-phase')
    var day = 60 * 60 * 24 * 1000
    var begin = new Date('2020-03-30').getTime() //+ 9*day 
walk('./data/', (dir, stat)=>{
  
}).on('file', (file, stat)=>{
  console.log(file)
  if(file.slice(-5) == '.json'){
    files.push(file)
  }
}).on('end', e=> {
  files.forEach(e => {
    try{
    let loc = e
    let symbol = path.parse(loc).dir.split('/').pop()
    let ticker = require('./'+loc)
    let cs = csv.format({headers:true})
    if(ticker.row_data && ticker.row_data.length > 0){
      var xxx
      cs.pipe(xxx = fs.createWriteStream(path.parse(loc).dir + '/ticker.csv'))
      ticker.row_data.forEach(e=>cs.write(colate(e, symbol))) 
      cs.end()
//      xxx.close()
    }
    } catch(err){
      console.log(err)
    }
    function colate(row, s){
      let entry = {...row}
      if(row.date) {
        entry.date = row.date// new Date(row.date).getTime()
        //entry.Market = 'P'
        //entry.marketParticipantName = 'Public'
        entry.phase = phase.cycle(new Date(entry.date).getTime())
      }
      if(row.tradeReportDate) {
        entry.date = new Date(row.tradeReportDate).getTime()
        entry.phase = phase.cycle(entry.date+day)
//        entry.volume = row["Short Volume"]
      }
      if(row.weekStartDate) {
        entry.date = new Date(row.weekStartDate).getTime()
        entry.phase = phase.cycle(entry.date-14*day)
//        entry.volume = row.totalWeeklyShareQuantity
      }
//      console.log(entry.date, begin)
      entry.idx = (new Date(entry.date).getTime() - begin) / day
      entry.symbol = s
      return entry
    }
  })
})

/*
.on('end', e => {
  ats = ats.reduce((a,e) => a.concat(require(path.resolve(cwd, e))), [])
  ats = ats.flat()
  header = Object.keys(ticker.row_data[0])
  header.push(Object.keys(ats[0]))
  header = header.flat()
  fs.createReadStream('./shorts.csv', 'utf8').pipe(csv.parse({headers:true})).on('data', row =>{
    shorts.push(row)
  }).on('end', rowCount => {
    //console.log(rowCount)
    header.push(Object.keys(shorts[0]))
    header = header.flat().reduce((a, e)=> {
      a[e]=null
      return a
    },{})

    // no symbol featurespace b/c only training on one 
    // if goto multi ticker training, add feature space
    // no, add now, so later can reeuse weights
    header = ['volume', 'phase', 'aphase', 'sphase', 'symbol', 'date', 'open', 'high', 'low', 'close',, 'marketParticipantName', 'totalWeeklyShareQuantity', 'totalWeeklyTradeCount', 'MPID', 'Short Volume', 'Total Volume', 'Trade Facility', 'Market', 'Trade Facility', 'totalWeeklyShareQuantity'].reduce((a, e)=> {
      a[e]=null//'-'// what pytorch forecaster wants according to docs..?
      return a
    },{})

    let cs = csv.format({headers:true})
    cs.pipe(fs.createWriteStream('aaplTicker.csv'))
    let bs = csv.format({headers:true})
    bs.pipe(fs.createWriteStream('aaplShort.csv'))
    let ds = csv.format({headers:true})
    ds.pipe(fs.createWriteStream('aaplAST.csv'))
    ticker.row_data.forEach(e => cs.write(colate(e)))//cs.write(Object.assign({...header}, e)))
    console.log(ticker.row_data.length)
    ats.forEach(e => ds.write(colate(e)))//cs.write(Object.assign({...header}, e)))
    shorts.forEach(e => bs.write(colate(e)))//cs.write(Object.assign({...header}, e)))
    //ats.forEach(e => cs.write(Object.assign({...header}, e)))
    //shorts.forEach(e => cs.write(Object.assign({...header}, e)))

    // finally to "tokenize" the stringy features

    cs.end() 
     
    console.log(begin, day)
    function colate(row){
      let entry = {}
      for(head in header) {
        entry[head] = row[head]
        if(!isNaN(entry[head])) entry[head] = Number(entry[head])  
      }
      if(row.date) {
        entry.date = new Date(row.date).getTime()
        entry.Market = 'P'
        entry.marketParticipantName = 'Public'
      }
      entry.phase = phase.cycle(entry.date)
      if(row.Date) {
        entry.date = new Date(row.Date).getTime()
        entry.sphase = phase.cycle(entry.date+day)
//        entry.volume = row["Short Volume"]
      }
      if(row.initialPublishedDate) {
        entry.date = new Date(row.initialPublishedDate).getTime()
        entry.aphase = phase.cycle(entry.date-14*day)
//        entry.volume = row.totalWeeklyShareQuantity
      }
//      console.log(entry.date, begin)
      entry.date = (entry.date - begin) / day
      entry.symbol = 'AAPL' // bonk
      return entry
    }
  })
})

//console.log(ticker.series.row_data, shorts, ats.length))
*/
