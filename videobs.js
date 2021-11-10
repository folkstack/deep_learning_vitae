var fs = require('fs')
var spawn = require('child_process').spawn
var concat = require('concat-stream')
var buffers = require('buffers')

var train_frames = 20400
var test_frames = 10798
var fps = 20

module.exports = {getTestBatch, getTrainBatch}

function getTestBatch({size, train, scale=[25, 100], pixfmt='gray16LE'}, cb){

  var set = train ? 'train' : 'test'
  var total = train ? train_frames : test_frames
  var bytes = scale[0] * scale[1] * size * 2 
  var tb = (bytes / size / 2) * total
  var dframes = Math.ceil(tb / bytes)
  var ff = spawn('ffmpeg', ['-loglevel', '0', '-i', './data/'+set+'.mp4', '-vf', 'scale='+scale.join(':')+',fps='+fps, '-c:v','rawvideo','-f','image2pipe','-pix_fmt', pixfmt, '-'])

  var buff = buffers()

  ff.stderr.on('data', e=>console.log(e.toString()))
  
  var fc = 0
  ff.stdout.on('data', d =>{
    ff.stdout.pause()
    buff.push(d)
    //console.log(++fc, d.length, buff.length, bytes, bytes / (scale[0] * scale[1] * 2))
    if(buff.length < scale[0] * scale[1] * size * 2) ff.stdout.resume()
    else cb(redeem)
  })

  function redeem(){
    return [buff.splice(0, bytes).slice(), ff.stdout.readable || buff.length > 0]  
  }

  ff.stdout.resume()
  

  return function(){
    if(ff.stdout.readable) {
      ff.stdout.resume() 
      return true
    }
    else if(buff.length > 0) {
      cb(redeem)
      return true
    }
    else return false
  }

}


function getTrainBatch({size, frameStart=undefined, scale=[25, 100], pixfmt='rgba'}, cb){
  var max = train_frames / fps - size / fps
  var start = Math.random() * max
  if(frameStart){
    frame = frame % train_frames
    start = frame / fps + 1
  }
  else frame = Math.floor(start * fps) + 1
  var eof = frame + size - 1 
  //start = 0.00 
  //frame = Math.floor(start * fps) + 1
  //eof = frame + size - 1 
  let sed = spawn('sed', ['-n', frame + ',' + eof + 'p', './data/train.txt'])
  
  sed.stdout.pipe(concat(buf=>{
  
    let labels = buf.toString().split('\n').map(e => e.length > 0 ? Number(e) : NaN).filter(e => !isNaN(e)) // omit trailing newline

    var ff = spawn('ffmpeg', ['-ss', start.toString(), '-loglevel', '0', '-i', './data/train.mp4', '-vf', 'scale='+scale.join(':')+',fps='+fps, '-vframes', size, '-c:v','rawvideo','-f','image2pipe','-pix_fmt', pixfmt, '-'])
    
    ff.stdout.pipe(concat(batch=>{
      cb([batch, labels])
    }))
    
    ff.stdout.resume()

    ff.stderr.on('data', e=>console.log(e.toString()))
  
  }))

  sed.stdout.resume()

  return train_frames
}

function test({scale=[25, 100]}){
  var server = net.createServer()
  server.listen(11021, e => {
    var ff = spawn('ffmpeg', ['-i', './data/test.mp4', '-vf', 'scale='+scale.join(':')+',fps=20', '-c:v','rawvideo','-f','image2pipe','-pix_fmt', 'gray', 'tcp://localhost:11021'])
    ff.stderr.on('data', e=>console.log(e.toString()))
  })
  server.on('connection', socket => {
    socket.pause()
    socket.on('data', d => {
 //     console.log(d.length)
      socket.pause()  
      setTimeout(_ => socket.resume(), 100)
    })
  })

}
