var express = require('express');
var router = express.Router();
let config = require('../config');
let request = require('request');
var soap = require('soap');
let db = require('../models');
var Xray = require('x-ray');
var x = Xray();
var superagent = require("superagent")
let wsdlUrl = 'http://212.42.117.151:83/checksever/checksever.asmx?WSDL';
let searchApi = 'http://namba.kg/api/?service=home&action=search&token=3kW5eVl6W5nBmDAl&type=mp3&page=1&query=';
let getDownUrl = 'http://namba.kg/files/download.php?id=';
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
  
});

async function setTyppingStatus(chatId, status){
  let setStatus = {
    true: 'typing',
    false: 'stoptyping'
  };
  let data = {
    url: 'https://namba1.co/api' + '/chats/' + chatId + '/' + setStatus[status],
    method: 'GET',
    headers: {
      'X-Namba-Auth-Token': config.token
    }
  };
  return new Promise((resolve, reject)=>{
    request(data, (error, req, body)=>{
      if(error){
        reject(error)
      }
      resolve(true)
    })
  });
};

async function searchMusics(content, user){
  let data = {
    url: searchApi + content,
    method: 'GET',
  };
  return await new Promise((resolve, reject)=>{
    request(data, (error, res, body)=>{
      if(error){
        reject(error)
      }
      let mp3 = JSON.parse(body);
      let text = 'Выберите файл но номеру \n';
      for(let i in mp3.mp3Files){
        let current = mp3.mp3Files[i];
        text += i + ': ' + current.filename + '\n'
      }
      user.update({current_data: JSON.stringify(mp3.mp3Files)}).then(result=>{
        resolve(text)
      })
    });
  });
}
async function getMusics(id){
  return await new Promise((resolve, reject)=>{
    x(getDownUrl + id, '.startdownload', ['a@href'])((error, result)=>{
      resolve(result[1])
    })
  });
}

async function sendMusic(chat_id, file) {
  return new Promise((resolve, reject)=>{
    let url = 'https://api.namba1.co' + '/chats/' + chat_id + '/write';
    let data = {
      url: url,
      method: 'POST',
      body: {
        'type': 'audio/mp4',
        'content': file
      },
      headers: {
        'X-Namba-Auth-Token': config.token
      },
      json: true
    };
  
    request(data, function (error, res, body) {
      if (error){
        reject(error)
      }
      resolve(body)
    });
  });
}

async function sendFile(coldlink, user_id, chat_id){
  return new Promise((resolve, reject)=>{
    var stream = request(coldlink).pipe(fs.createWriteStream('./' + user_id + 'user.mp3'));
    stream.on('finish', function () {
      superagent.post('https://files.namba1.co')
       .attach("file", './' + user_id + 'user.mp3').end(function (error, req) {
        if (!error){
          sendMusic(chat_id, req.body['file'])
           .then(body => {
             fs.unlink('./' + user_id + 'user.mp3');
             resolve(true)
           })
        }else {
          reject(error)
        }
      });
    });
  });
}

async function start(chat_id, res, step){
  let text = '';
  await sendMessage(chat_id, text);
  await step.update({key: 'wait_result'});
  return res.end()
}


router.post('/', async function(req, res, next){
  const event = req.body.event;
  if(event === 'message/new'){
    let step = await db.Step.findOne({
      include:[{
        model: db.User,
        where:{
          sender_id: req.body.data.sender_id
        }
      }],
    });
    let user = await db.User.findOrCreate({
      where: {
        sender_id: req.body.data.sender_id
      },
      defaults: {
        sender_id: req.body.data.sender_id
      }
    });
    if(step === null){
      step = await db.Step.create({user_id: user[0].id, key: 'new'})
    }
    let content = req.body.data.content;
    let chat_id = req.body.data.chat_id;
    if(step.key === 'wait_music'){
      let musics = JSON.parse(user[0].current_data);
      let downUrl = await getMusics(musics[parseInt(content)].id)
      if (downUrl === undefined){
        sendMessage(chat_id, 'Введите правильный номер файла')
        return res.end()
      }
      await sendMessage(chat_id, 'Это может занять от 5 секунды до 1 минуты в зависимости от вашего скорости интернета')
      await sendFile(downUrl, user.sender_id, chat_id)
    }
    let text = await searchMusics(content, user[0]);
    await sendMessage(chat_id, text);
    await step.update({
      key: 'wait_music'
    })
  }else if(event === 'user/follow'){
    const data = {
      url: 'https://namba1.co/api' + '/chats/create',
      method: 'POST',
      body: {
        name: 'new chat',
        members: [req.body.data.id]
      },
      headers: {
        'X-Namba-Auth-Token': config.token
      },
      json: true
    };
    return new Promise((resolve, reject)=>{
      request(data, (error, req, body)=>{
        if(!error){
          db.User.findOrCreate({
            where:{
              sender_id: body.data.interlocutor_id
            },
            defaults:{
              sender_id: body.data.interlocutor_id
            }
          }).then(user=>{
            return db.Step.create({
              key: 'new',
              user_id: user[0].id
            })
          }).then(step=>{
            let sendText = 'Данный бот позволяет скачивать музыку введите название песни';
            let chatId = body.data.membership.chat_id;
            sendMessage(chatId, sendText).then(result=>{
              res.end()
            })
          });
        }
        reject(error)
      });
    })
  }else if(event === 'user/unfollow'){
    let user = await db.User.findOne({
      where:{
        sender_id: req.body.data.id
      }
    });
    await user.destroy();
    return res.end()
  }
  else{
    console.log('not event');
  }
  res.end()
});

function sendMessage(chat_id, message){
  const data = {
    url: 'https://namba1.co/api' + '/chats/' + chat_id + '/write',
    method: 'POST',
    body: {
      type: 'text/plain',
      content: message
    },
    headers: {
      'X-Namba-Auth-Token': config.token
    },
    json: true
  };
  return new Promise((resolve, reject)=>{
    request(data, (error, req, body)=>{
      if(error){
        reject(error)
      }
      resolve(body)
    })
  })
}

module.exports = router;
