require('dotenv').config()

const rocket = require('@rocket.chat/sdk')
const respmap  = require('./reply')
const moment = require('moment')

const HOST = process.env.ROCKETCHAT_URL
const USER = process.env.ROCKETCHAT_USER
const PASS = process.env.ROCKETCHAT_PASSWORD
const BOTNAME = process.env.BOT_NAME
const SSL = process.env.ROCKETCHAT_USE_SSL
const ROOMS = [process.env.ROCKETCHAT_ROOM]
let time = {
    dialog: process.env.BOT_TIME_DIALOG,
    publish: process.env.BOT_TIME_PUBLISH
}
let channelId=''
let users = []
let submited = []
let indexCount = 0

let myuserid

const runbot = async () => {
    const conn = await rocket.driver.connect( { host: HOST, useSsl: SSL})
    myuserid = await rocket.driver.login({username: USER, password: PASS})
    const roomsJoined = await rocket.driver.joinRooms(ROOMS)

    const subscribed = await rocket.driver.subscribeToMessages()
    const msgloop = await rocket.driver.reactToMessages( processMessages )
}

const processMessages = async(err, message, messageOptions) => {
    
  if (!err && moment().format('dddd') != 'Saturday' && moment().format('dddd') != 'Sunday') {
    if (message.u._id === myuserid) return
    const roomname = await rocket.driver.getDirectMessageRoomId(message.u.username)

    if (message.msg.toLowerCase() && message.rid == roomname) {
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        console.log('get dm from '+message.u.username)
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        
        let response
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
                    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
                    console.log('Error send message to channel')
                    console.log(error)
                    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
                })
            }
            indexCount = 0
        }
        else{
            response = message.u.username + 
            ', how can ' + BOTNAME + ' help you with ' +
            message.msg.substr(BOTNAME.length + 1)
        }
        const sentmsg = await rocket.driver.sendToRoom(response, roomname)
        
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
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        console.log('Error when get channel member list :')
        console.log(error)
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
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
        if (ROOMS.indexOf(channel.name) >= 0){
            channelId = channel._id
        }
    })
    getChannelMemberList()
})

setInterval(() => {
    if(moment().format('HH:mm:ss') == time.dialog && moment().format('dddd') != 'Saturday' && moment().format('dddd') != 'Sunday') {
        users.forEach(user => {
            if (user.username) {
                rocket.driver.getDirectMessageRoomId(user.username)
                .then(userRoomId => {
                    rocket.driver.sendMessage({
                        rid: userRoomId,
                        msg: 'Hi, '+user.name+'. What did you do since yesterday?'
                    })  
                })
                .catch(error => {
                    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
                    console.log('Error when send DM to ' +user.name)
                    console.log(error)
                    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
                })
            }
        })
    }

    if(moment().format('HH:mm:ss') == time.publish && moment().format('dddd') != 'Saturday' && moment().format('dddd') != 'Sunday') {
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
            console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
            console.log('Error when sending message to channel :')
            console.log(error)
            console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        })

    }
}, 1000)


runbot()