const fs = require('fs')
const argv = require('minimist')(process.argv)
const sql = require('better-sqlite3')
const spear = require('spearman-rho')

const db = new sql('numerai.db')
db.pragma('cache_size=24000');
//console.log(db.pragma('cache_size', { simple: true }));
const train_pragma = db.prepare('PRAGMA table_info(train)')
const challenge_pragma = db.prepare('PRAGMA table_info(compete)')

const atob = require('typedarray-to-buffer')
const tp = train_pragma.all()
const cp = challenge_pragma.all()
const features = tp.map(e => /feature/.test(e.name) ? e.name : false).filter(Boolean)
const cfeatures = cp.map(e => /feature/.test(e.name) ? e.name : false).filter(Boolean)
const t_eras = db.prepare('select distinct(era) from train').all().map(e => e.era)//.sort()
const c_eras = db.prepare('select distinct(era) from compete').all().map(e => e.era).filter(e => Boolean(e.slice(3).length))//.sort()
const v_eras = db.prepare('select distinct(era) from compete where data_type="validation"').all().map(e => e.era).filter(e => Boolean(e.slice(3).length))//.sort()
//console.log(features.length, t_eras, c_eras)
//process.exit()
var valids = db.prepare('select count(distinct(id)) from compete where data_type="validation"').get()['count(distinct(id))']
var tests = db.prepare('select count(distinct(id)) from compete where data_type="test"').get()['count(distinct(id))']
var $ = require('../../projects/various/utils.js')
var {dense, rnn, conv, iir} = require('../../projects/various/topo.js')
var tf = $.tf
var batch_size = [argv.b || t_eras.length, features.length]
var era = 1
var stackSize = parseInt(argv.z) || 5
var headCount = parseInt(argv.h) || 5
var depth = parseInt(argv.d) || 3
var w_size = parseInt(argv.s) || 250 //25
var l_rate = parseFloat(argv.r)||.0001
var drillDown = 1 
const rootOp = e => e
const shuffle = () => Math.sin(2 * Math.PI * Math.random())
var optz = tf.train.adam(l_rate, .8667, .9)

var epochas = 0
var ravg = [], rcavg = [], llavg = []
var avg, cavg, lavg


//var ipad = tf.zeros([t_eras.length - c_eras.length, features.length])
//var tpad = tf.zeros([t_eras.length - c_eras.length, 1])
//let iter = getTrainData()

//var gradboost = iir({input_shape: batch_size, layers:[{size: 1, depth: 5}]})
//var boostoptz = tf.train.adam(l_rate * 4, .33, .66)

function boost(x, y, l, i){
  var result 
  boostoptz.minimize(() => {
    result = gradboost.flow(y, true)
  
  }, true)
  let ris = x.div(l)
  let fl = tf.losses.meanSquaredDistance(ris, result.transpose())
  let m = tf.losses.logLoss(y, x.add(fl).transpose())
  let n = tf.argmin(m)
  if(i === 0) return 
  //else return boost(...)
}

//console.log(batch_size)
var stack, save
function loadModel(){
  let saves = []
  const fiveTenths = tf.tensor1d([.5]), OneD = tf.tensor1d([1])
  var s = 0
  var heads = new Array(headCount).fill(0).map((e, i) => {
    return {q: iir({input_shape: batch_size, layers:[{size: w_size, activation: 'relu', depth: depth, id: `s${s}h${i}w${w_size}q`} ]}) , 
            k: iir({input_shape: batch_size, layers:[{size: w_size, activation: 'relu', depth: depth, id: `s${s}h${i}w${w_size}k`} ]}) , 
            v: iir({input_shape: batch_size, layers:[{size: w_size, activation: 'relu', depth: depth, id: `s${s}h${i}w${w_size}v`} ]})
    }  
  })

  stack = new Array(stackSize).fill(0).reduce((fn, e,i) => {
    let s = i
    //var ff = dense({input_shape: [batch_size[0], w_size * headCount], layers: [{size: 1, activation: 'tanh', depth: depth}]})//, id: `s${s}h${i}w${w_size}`}]})
    if(i === stackSize - 1) var z = dense({input_shape: [batch_size[0], w_size * headCount], layers: [{size: 1, activation: 'tanh', depth: depth, id: `s${s}z0w${1}`}]})
    else var z = dense({input_shape: [batch_size[0], w_size * headCount], layers: [{size: features.length, activation: 'relu', depth: depth, id: `s${s}z0w${w_size}`}]})
    
    let save = function(){
      z.save()
    }

    saves.push(save)

    return function(input, train){
      //let signal = input
      input = fn(input)
      let qvc = heads.map((e, i) => {
        let q = e.q.flow(input, train)
        let v = e.v.flow(input, train)
        let k = e.k.flow(input, train)
        //console.log(q, v, k)
        let qk = k.transpose().matMul(q)
        let smx = $.tf.softmax(qk.div($.tf.sqrt($.scalar(features.length))).add($.scalar(1e-5)))
        //console.log(qk, smx)
        let output = v.matMul(smx)
        return output
      })

      var result, loss
      if(headCount === 1){
        result = z.flow(qvc[0], train)
      }
      else{
        let q = tf.concat(qvc, 1)
        result = z.flow(q, train)
      }
      var output = result
      if(s < stackSize - 1) {
        output = result.add(input)
        return output
      }
      else return output//.sum(1).expandDims(1)//$.normalize(output)
    }
  }, rootOp)

  save = function(){
    heads.forEach(e => { 
      e.q.save()
      e.k.save()
      e.v.save()
    })
    saves.forEach(e => e())
  }
  
}

var tt = 0
var best = parseFloat(argv.b) || .686
if(argv.l) loadModel()
if(argv.x){
  if(argv.j) xcorre(require('./xcorre.neezy.json'))
  else if(argv.eras) xcorre(argv.eras.split(',').map(e => 'era'+e))
  else xcorre()
}
if(argv.t) {
  train()
  validate()
}
if(argv.p) {
  predict()
}
if(argv.c) {
  validate()
}

// TODO add padding and that crap
function train(era){
  //var {iter, total} = getTrainData()
  var {iter, total} = getTrainEraBatchSeq(era)
  var gotime = true
  console.log(era, total, epochas)
  while(gotime){
    tf.tidy(() => {
      var {result, loss, corr, logloss, id, pad} = fit(optz, iter, true)
      if(!result) {
        gotime=false
        return
      }
      ++epochas
      if(argv.v){
        let avgs = ravg.push(loss)
        let rcavgs = rcavg.push(corr)
        let llavgs = llavg.push(logloss)
        if(avgs == 11) {ravg.shift(); rcavg.shift(), llavg.shift()}
      //  if(epochas%15===0) console.log(loss, corr, logloss)
        avg = ravg.reduce((a,e) => a+e, 0)/10
        cavg = rcavg.reduce((a,e) => a+e, 0)/10
        lavg = llavg.reduce((a,e) => a+e, 0)/10
      }
      if(epochas%10===0 && argv.v){
        console.log('10 loss average @ epocha %d: %d', epochas, avg)
        console.log('10 corr average @ epocha %d: %d', epochas, cavg)
        console.log('10 logloss average @ epocha %d: %d', epochas, lavg)
      //  console.log(tf.memory())
      }
      $.dispose([result, loss, corr], true)

      if(pad || epochas == (argv.e || Infinity)) gotime =false
    })
    
  }
  //predict()
}

function combine(col1, col2){
  return col1.map((e, i) => e + ',' + col2[i]).join('\n')  // string addition auto-joins an array
}

async function validate(cb){
  var {gcb, total} = getChallengeBatch(valids)
  var preds = ['prediction_kazutsugi'], vroom = true
  var losses = []
  var targets = []
  var ids = ['id']
  var epochas = 0, ravg = [], rcavg = [], llavg = []
  while(vroom){
    tf.tidy(_ => {
      var {result, loss, corr, logloss, id, pad, target} = fit(null, gcb, false)
      if(!result) vroom = false
      else{
        var l, c, r
        preds = preds.concat(Array.prototype.slice.call(result.dataSync()))
        ids = ids.concat(id)
        targets = targets.concat(Array.prototype.slice.call(target.dataSync()))
        //$.dispose([result, loss], true)
        ++epochas
        if(argv.v){
          let avgs = ravg.push(l=loss.dataSync()[0])
          let rcavgs = rcavg.push(c=corr.dataSync()[0])
          let llavgs = llavg.push(r=logloss.dataSync()[0])
          if(avgs == 101) {ravg.shift(); rcavg.shift(), llavg.shift()}
       //   if(epochas%15===0) console.log(l,c,r)
          var avg = ravg.reduce((a,e) => a+e, 0)/100
          var cavg = rcavg.reduce((a,e) => a+e, 0)/100
          var lavg = llavg.reduce((a,e) => a+e, 0)/100
        }
        if(epochas%100===0 && argv.v){
          console.log('100 loss average @ epocha %d: %d', epochas, avg)
          console.log('100 corr average @ epocha %d: %d', epochas, cavg)
          console.log('100 logloss average @ epocha %d: %d', epochas, lavg)
        //  console.log(tf.memory())
        }
     
      }
      $.dispose([result, loss, corr, logloss], true)
    })
  } 
  //let tl = losses.reduce((a,e) => a + e, 0)/losses.length
  let corr = $.pearson(tf.tensor(targets, [targets.length]), tf.tensor(preds.slice(1), [preds.length-1]))
  let scorr = await spearman(targets, preds.slice(1))
  
  async function spearman(a, b){
    return await new spear(a, b).calc()
  }
  
  console.log(corr.dataSync())
  console.log(scorr)
  if(cb) cb(corr)
  //fs.writeFileSync('./data/valids.csv', combine(ids.slice(0, total+1), preds.slice(0, total+1)), 'utf8')
  console.log('fin')
  
}

function xcorre(eras){
  var xc
  if(!eras){
    xc = []
    var r = argv.g || 5
    let gcb = getEraBatch().gcb
    for(var e = 0; e < t_eras.length; e++){
      var c = {era: t_eras[e], corr: 0}
      var gerb = getEraBatch(t_eras[e], 'train').gcb
        for(var j = 0; j < r; j++){
          tf.tidy(_ => {
            var input, erb
            erb = gerb(true).input//.dataSync()
            input = gcb(true).input//.dataSync()
            let x = $.pearson(erb.transpose(), input.transpose(), 1).sum().dataSync()[0]//batch_size[0]
          //let x = await spearman(erb, input)//, preds.slice(1))
            console.log(t_eras[e], j, x)
            c.corr += x
          })
        }
      xc.push(c)
      console.log(c)
    }
    xc = xc.sort((a, b) => a.corr < b.corr ? 1 : -1).map(e => e.era)//.slice(0, 20)
    fs.writeFileSync('./xcorre.neezy.json', JSON.stringify(xc))
  }
  else xc = eras
  console.log(xc)
  loadModel()
  xc.slice(60).reverse().forEach(e => train(e))
  validate() 
  if(argv.save) save() 
  //return xc.map( e => e.era )
  async function spearman(a, b){
    return await new spear(a, b).calc()
  }
}

function predict(){
  var {gcb, total} = getChallengeBatch()
  var preds = ['prediction_kazutsugi'], vroom = true
  var losses = []
  var ids = ['id']
  var epochas = 0, ravg = [], rcavg = [],llavg=[]
  var count = 0
  while(vroom){
    tf.tidy(_ => {
      var {result, loss, corr, logloss, id, pad} = fit(null, gcb, false)
      if(!result) vroom = false
      else{
        var l, c
        preds = preds.concat(Array.prototype.slice.call(result.dataSync()))
        ids = ids.concat(id)
        //$.dispose([result, loss], true)
        ++epochas
        if(argv.v){
          let avgs = ravg.push(l=loss.dataSync()[0])
          let rcavgs = rcavg.push(c=corr.dataSync()[0])
          let llavgs = llavg.push(r=logloss.dataSync()[0])
          if(avgs == 101) {ravg.shift(); rcavg.shift(), llavg.shift()}
       //   if(epochas%15===0) console.log(l,c,r)
          var avg = ravg.reduce((a,e) => a+e, 0)/100
          var cavg = rcavg.reduce((a,e) => a+e, 0)/100
          var lavg = llavg.reduce((a,e) => a+e, 0)/100
          if(epochas%100===0){
            console.log('100 loss average @ epocha %d: %d', epochas, avg)
            console.log('100 corr average @ epocha %d: %d', epochas, cavg)
            console.log('100 logloss average @ epocha %d: %d', epochas, lavg)
          //  console.log(tf.memory())
          }
        } 
      }
      count+=batch_size[0]
      $.dispose([result, loss, corr, logloss], true)
    })
  } 
  //let tl = losses.reduce((a,e) => a + e, 0)/losses.length
  fs.writeFileSync('./data/neezy.csv', combine(ids.slice(0, total+1), preds.slice(0, total+1)), 'utf8')
  console.log('fin')
}
// TODO add optimization to prediction, by drilling into validation data
// TODO also numerai accepts updated submissions, as long as the model is improving..., so checking validation is must
function fit(optz, iterator, train){
  let {input, target, pad, id} = iterator()
  if(!input) return {input, target, pad}
  if(pad > 0){ 
    //console.log(input, target, pad) 
    input = tf.concat([input, tf.ones([pad, features.length])], 0)
    target = tf.concat([target, tf.ones([1, pad])], 1)
  }
  //target = target.sub($.scalar(.5))
  //input = input.sub($.scalar(.5))
  var loss = Infinity, corr = 0, logloss = Infinity
  var result, peer
  var drill = 0
  if(train){
    while(drill<drillDown){
      let l = optz.minimize(()=>{
        result = stack(input, train)//.add($.scalar(.5))
        //result = $.normalize(stack(input, train))//.dataSync()
        logloss = tf.losses.logLoss(target, result.transpose())//.dataSync()[0]
        corr = $.pearson(target, result.transpose())
        //loss = logloss.sub(corr)
        //loss = logloss.add(tf.abs($.scalar(-1).add(corr)))//.add(logloss)
        loss = tf.neg($.scalar(-2.5).add(corr))//.add(logloss)
        if(argv.v){
          corr = corr.dataSync()[0]
          logloss = logloss.dataSync()[0]
        }
        return loss
      }, true)
      loss = l.dataSync()[0]
  //    $.dispose([l], false)
      drill++
    }
  }
  else {
    result = stack(input, train)//.add($.scalar(.5))
    //result = $.normalize(stack(input, false))//.dataSync()
    logloss = tf.losses.logLoss(target, result.transpose())//.dataSync()[0]
    corr = $.pearson(target, result.transpose())
    //loss = logloss.sub(corr)//
    //loss = logloss.sub(corr.pow($.scalar(2)))
    //loss = logloss.add(tf.abs($.scalar(-.01).add(corr)))//.add(logloss)
    loss = tf.neg($.scalar(-2.5).add(corr))//.add(logloss)
    //corr= corr.dataSync()[0]
  }

  return {result, loss, corr, logloss, id, pad, target}
}

function getTrainData(which='train', eras=t_eras){// a train batch has one case from each era
  var predict = false
  if(which=='compete'){
    eras=c_eras
    predict = true
  }
  let iters = []
  var valids = []
  let index = 0
  //console.log(eras)
  var y = parseInt(eras[0].slice(3)) 
  //console.log(y)
  var x = 0, z
  for(x; x < eras.length; x++){
    if(eras[x].slice(3) === 'X') z = 'X'
    else z = x + y
    iters.push(db.prepare(`select * from ${which} where era="era${z}"`).iterate())
  }
   
  var iter = function(){ // fn call => array of datum with features array, target, era, and id
    ++index
    let batch = iters.map((e,i) => {
      var junk = e.next().value
      if(!junk) junk = {era: i, index: index, target: 0, features: Array(310).fill(0)}
      else{
        let features = Object.keys(junk).map(k => /feature/.test(k) ? Number(junk[k]) : NaN).filter(e => !isNaN(e))
        junk.features = features
        junk.index = index
        if(which==='train')junk.target = Object.keys(junk).map(k => /target/.test(k) ? Number(junk[k]) : NaN).filter(e => !isNaN(e))
      }
      //console.log(junk)
      //process.exit()
      return junk
    })
    //if(shuffle) batch = batch.sort(shuffle).sort(shuffle).sort(shuffle).sort(shuffle).sort(shuffle)
    var input = batch.map((e, era) => {
      if(!e.features){ 
        console.log(e, index, batch.length)
        process.exit()
      }
      return tf.tensor(e.features, [1, features.length], 'float32')//.add($.scalar(Math.sin(Math.PI * 2 * (era+1) / (c_eras.length+t_eras.length))))
    })
    var id = batch.map(e => e.id)
    
    input  = tf.squeeze(tf.stack(input, 1))
    var target = tf.stack(batch.map(e => tf.tensor(e.target, [1])), 1)
    return {input, target, id}
  }
  var total = parseInt(argv.e) * 120
  return {iter, total }
}
function getTrainBatchSeq(count, offset=0){

  var total = db.prepare('select count(distinct(id)) from train').get()
  total = total['count(distinct(id))']
  if(count) total=count
  var i = 0
  var iter = function(oof){
    if(oof) offset = oof
    if(offset + i * batch_size[0] >=total ) return {input: null, target: null, pad: null}
    var j = total - (i * batch_size[0] + offset), ii = 0, jj = batch_size[0], pad = 0
    if(j<batch_size[0]) { jj = j; pad = batch_size[0] - j}
    ii = i * batch_size[0]
    let batch = db.prepare(`select * from train limit ${jj} offset ${ii}`).all()
    //console.log(i, j, ii, batch.length)
    batch = batch.map((junk, i) => {
      let features = Object.keys(junk).map(k => /feature/.test(k) ? parseFloat(junk[k]) : NaN).filter(e => !isNaN(e))
      junk.features = features
      junk.target = Object.keys(junk).map(k => /target/.test(k) ? Number(junk[k]) : NaN).filter(e => !isNaN(e))
      return junk
    })
    i++
    remain = total - i * batch_size[0]
    var input = batch.map((e, era) => {
//      if(e.features.length < 310) console.log(e)
      return tf.tensor(e.features, [1, features.length], 'float32')
    })
    var id = batch.map(e => e.id)
    input  = tf.squeeze(tf.stack(input, 1))
    var target = tf.stack(batch.map(e => tf.tensor(e.target, [1])), 1)

    return {input, target, pad, id}
  }
  return {iter, total}
}
function getTrainEraBatchSeq(era, count, offset=0){

  var total = db.prepare(`select count(distinct(id)) from train where era="${era}"`).get()
  total = total['count(distinct(id))']
  if(count) total=count
  var i = 0
  var iter = function(oof){
    if(oof) offset = oof
    if(offset + i * batch_size[0] >=total ) return {input: null, target: null, pad: null}
    var j = total - (i * batch_size[0] + offset), ii = 0, jj = batch_size[0], pad = 0
    if(j<batch_size[0]) { jj = j; pad = batch_size[0] - j}
    ii = i * batch_size[0]
    let batch = db.prepare(`select * from train where era="${era}" limit ${jj} offset ${ii}`).all()
    //console.log(i, j, ii, batch.length)
    batch = batch.map((junk, i) => {
      let features = Object.keys(junk).map(k => /feature/.test(k) ? parseFloat(junk[k]) : NaN).filter(e => !isNaN(e))
      junk.features = features
      junk.target = Object.keys(junk).map(k => /target/.test(k) ? Number(junk[k]) : NaN).filter(e => !isNaN(e))
      return junk
    })
    i++
    remain = total - i * batch_size[0]
    var input = batch.map((e, era) => {
//      if(e.features.length < 310) console.log(e)
      return tf.tensor(e.features, [1, features.length], 'float32')
    })
    var id = batch.map(e => e.id)
    input  = tf.squeeze(tf.stack(input, 1))
    var target = tf.stack(batch.map(e => tf.tensor(e.target, [1])), 1)

    return {input, target, pad, id}
  }
  return {iter, total}
}

function getChallengeBatch(count, offset=0){

  var total = db.prepare('select count(distinct(id)) from compete').get()
  total = total['count(distinct(id))']
  if(count) total=count

  var i = 0
  var gcb = function(){
    if(offset + i * batch_size[0] >=total ) return {input: null, target: null, pad: null}
    var j = total - (i * batch_size[0] + offset), ii = 0, jj = batch_size[0], pad = 0
    if(j<batch_size[0]) { jj = j; pad = batch_size[0] - j}
    ii = i * batch_size[0]
    let batch = db.prepare(`select * from compete limit ${jj} offset ${ii}`).all()
    //console.log(i, j, ii, batch.length)
    batch = batch.map((junk, i) => {
      let features = Object.keys(junk).map(k => /feature/.test(k) ? parseFloat(junk[k]) : NaN).filter(e => !isNaN(e))
      junk.features = features
      junk.target = Object.keys(junk).map(k => /target/.test(k) ? Number(junk[k]) : NaN).filter(e => !isNaN(e))
      return junk
    })
    i++
    remain = total - i * batch_size[0]
    var input = batch.map((e, era) => {
//      if(e.features.length < 310) console.log(e)
      return tf.tensor(e.features, [1, features.length], 'float32')
    })
    var id = batch.map(e => e.id)
    input  = tf.squeeze(tf.stack(input, 1))
    var target = tf.stack(batch.map(e => tf.tensor(e.target, [1])), 1)

    return {input, target, pad, id}
  }
  return {gcb, total}
}

function getEraBatch(era='eraX', table='compete', offset=0, count=null){ // defaults to live era

  var total = db.prepare(`select count(distinct(id)) from ${table} where era="${era}"`).get()
  total = total['count(distinct(id))']
  //if(count) total=count

  var i = 0
  var gcb = function(oof){
    var pad = null
    if(oof)
      offset = Math.floor(Math.random() * total - batch_size[0])
    //if(offset + i * batch_size[0] >=total ) return {input: null, target: null, pad: null}
    //var j = total - (batch_size[0] + offset), ii = 0, jj = batch_size[0], pad = 0
    //if(j<batch_size[0]) { jj = j; pad = batch_size[0] - j}
    //ii = batch_size[0]
    let batch = db.prepare(`select * from ${table} where era="${era}" limit ${batch_size[0]} offset ${offset}`).all()
    //console.log(i, j, ii, batch.length)
    batch = batch.map((junk, i) => {
      let features = Object.keys(junk).map(k => /feature/.test(k) ? parseFloat(junk[k]) : NaN).filter(e => !isNaN(e))
      junk.features = features
      junk.target = Object.keys(junk).map(k => /target/.test(k) ? Number(junk[k]) : NaN).filter(e => !isNaN(e))
      return junk
    })
    //i++
    //remain = total - i * batch_size[0]
    var input = batch.map((e, era) => {
//      if(e.features.length < 310) console.log(e)
      /*
      let rank = e.features.reduce((a,e) => {a[e*100] += 1; return a}, new Array(101).fill(0))
      let sorted = e.features.sort((a,b) => a < b ? 1 : -1).map(e => {
            if(e==1) return 1
            if(e==0.75) return rank[100] + 1
            if(e==0.5) return rank[75] + rank[100] + 1
            if(e==0.25) return rank[50] + rank[75] + rank[100] + 1
            if(e==0) return rank[25] + rank[50] + rank[75] + rank[100] + 1
      })
//      sorted.forEach(e => {if(isNaN(e)) console.log(era)})//(sorted)
        return tf.tensor(sorted, [1, features.length], 'float32')
    */
      return tf.tensor(e.features, [1, features.length], 'float32')
    })
    var id = batch.map(e => e.id)
    input  = tf.squeeze(tf.stack(input, 1))
    var target = tf.stack(batch.map(e => tf.tensor(e.target, [1])), 1)
    //console.log(era, offset, total, input)

    return {input, target, pad, id}
  }
  return {gcb, total}
}
