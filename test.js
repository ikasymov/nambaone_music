let searchApi = 'http://namba.kg/api/?service=home&action=search&token=3kW5eVl6W5nBmDAl&type=mp3&page=1&query=';
let request = require('request');
let getDownUrl = 'http://namba.kg/files/download.php?id=';
var Xray = require('x-ray');
var x = Xray();


async function getMusics(id){
  return await new Promise((resolve, reject)=>{
    x(getDownUrl + id, '.startdownload', ['a@href'])((error, result)=>{
      resolve(result[1])
    })
  });
}


getMusics('asdf').then(result=>{
  console.log(result)
})
