require('dotenv').config();
const rocket = require('@rocket.chat/sdk');
const respmap  = require('./reply');
const moment = require('moment');
// const env = require('./env')

// customize the following with your server and BOT account information
const HOST = process.env.URL;
const USER = process.env.USER;
const PASS = process.env.PASS;
const BOTNAME = process.env.BOT;  // name  bot response to
const SSL = process.env.SSL;  // server uses https ?
const ROOMS = [process.env.ROOMS];
const TIME_DIALOG = '16:25:00'
const TIME_PUBLISH= '16:25:30'
let time = {
    dialog: TIME_DIALOG,
    publish:TIME_PUBLISH
}
let channelId='';
let users = []
let submited = []
let indexCount = 0

var myuserid;
// this simple bot does not handle errors, different messsage types, server resets 
// and other production situations 

const runbot = async () => {
    const conn = await rocket.driver.connect( { host: HOST, useSsl: SSL})
    myuserid = await rocket.driver.login({username: USER, password: PASS});
    const roomsJoined = await rocket.driver.joinRooms(ROOMS);
    console.log('joined rooms');

    // set up subscriptions - rooms we are interested in listening to
    const subscribed = await rocket.driver.subscribeToMessages();
    console.log('subscribed');

    // connect the processMessages callback
    const msgloop = await rocket.driver.reactToMessages( processMessages );
    console.log('connected and waiting for messages');

    // when a message is created in one of the ROOMS, we 
    // receive it in the processMesssages callback

    // greets from the first room in ROOMS 
    const sent = await rocket.driver.sendToRoom( BOTNAME + ' is listening ...',ROOMS[0]);
    console.log('Greeting message sent');
}

// callback for incoming messages filter and processing
const processMessages = async(err, message, messageOptions) => {
    
  if (!err) {
    // filter our own message
    if (message.u._id === myuserid) return;
    // can filter further based on message.rid
    const roomname = await rocket.driver.getDirectMessageRoomId(message.u.username);
    if (message.msg.toLowerCase()) {
      let response
     // if 
      let inpmsg = message.msg.toLowerCase()
      if (indexCount== 0) {
        submited.push({
            user: message.u,
            message1: inpmsg,
            message2: '',
            message3: '',
        })
        response = respmap.yesterday
        indexCount=1
      }
      else if(indexCount == 1){
        let indexSubmit = findInSubmit(message.u.username)
        submited[indexSubmit].message2 = inpmsg
        response = respmap.today
          indexCount=2
      }
      else if (indexCount == 2){
            let indexSubmit = findInSubmit(message.u.username)
            submited[indexSubmit].message3 = inpmsg
            response = respmap.blocking
          if (moment().format('HH:mm:ss') > time.publish) {
            let submit = submited[indexSubmit]
    
            rocket.driver.sendMessage({
                rid: channelId,
                msg: 'Hey @here, @'+submit.user.name+' was submited a stand-up\n'+
                     '**1. What did you do since yesterday?**\n'+
                     '> '+submit.message1+'\n'+
                     '** ** \n'+
                     '**2. What will you do today?**\n'+
                     '> '+submit.message2+'\n'+
                     '** ** \n'+
                     '**3. Anything is blocking your progress?**\n'+
                     '> '+submit.message3+'\n'
            })
            .then(response => {
                submited.splice(indexSubmit, 1)
                b.respond('Thank you 👋')
            })
            .catch(error => {
                b.respond('Alice ngantuk, nanti lagi ya~')
            })
        }
        indexCount = 0
    }
    else{
        response = message.u.username + 
        ', how can ' + BOTNAME + ' help you with ' +
        message.msg.substr(BOTNAME.length + 1)
      }
      const sentmsg = await rocket.driver.sendToRoom(response, roomname);
      
    }
    
}
}
    
function getChannelMemberList() {
    rocket.api.get('channels.members', {
        roomId: channelId
    })
    .then(response => {
        users = []
        response.members.forEach(user => {
            if(!user.username.toLowerCase().includes('bot')) {
                users.push(user)
            }
        })
    })
    .catch(error => {
        console.log(error)
    })
}

function inviteUserToChannel(username){
    rocket.api.post('channels.invite', {
        roomId: channelId,
        username: username
    })
    .then(response => {
        console.log('invite '+username+' to channel')
    })
    .catch(error => {
        console.log(error)
    })
}

function findInSubmit(username){
    let response = submited.find(submit => {
        return submit.user.username == username
    })
    return submited.indexOf(response)
}

rocket.api.get('channels.list')
.then(response => {
    response.channels.forEach(channel => {
        if (channel.name == 'test'){
            channelId = channel._id
        }
    })
    getChannelMemberList()
})

setInterval(() => {
    if(moment().format('HH:mm:ss') == time.dialog) {
        users.forEach(user => {
            if (user.username) {
                rocket.driver.getDirectMessageRoomId(user.username)
                .then(userRoomId => {
                    rocket.driver.sendMessage({
                        rid: userRoomId,
                        msg: 'Hi, '+user.name+'. What did you do since yesterday? (answer with "yesterday {your answer}")'
                    })  
                })
                .catch(error => {
                    console.log(error)
                })
            }
        })
    }

    if(moment().format('HH:mm:ss') == time.publish) {
        let message1 = ''
        let message2 = ''
        let message3 = ''
        let unsubmited = ''
        users.forEach(user => {
            if (findInSubmit(user.username) < 0) {
                unsubmited+=' @'+user.username
            }
        })

        if (unsubmited.length > 0) {
            unsubmited = "i didn't hear from"+unsubmited
        }
        
        submited.forEach(submit => {
            message1+='> '+submit.user.name+'\n'+'> '+submit.message1+'\n'+'** ** \n'
            message2+='> '+submit.user.name+'\n'+'> '+submit.message2+'\n'+'** ** \n'
            message3+='> '+submit.user.name+'\n'+'> '+submit.message3+'\n'+'** ** \n'
        })

        rocket.driver.sendMessage({
            rid: channelId,
            msg: 'Hey, @here our daily stand-up team :coffee:\n'+
                 '**1. What did you do since yesterday?**\n'+
                 message1+
                 '**2. What will you do today?**\n'+
                 message2+
                 '**3. Anything is blocking your progress?**\n'+
                 message3+
                 unsubmited
        })
        .then(response => {
            submited = []
        })
        .catch(error => {
            console.log(error)
        })

    }
}, 1000)


runbot()