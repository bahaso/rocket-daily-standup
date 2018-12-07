const bot = require('bbot')
const moment = require('moment')
const rocket = require('@rocket.chat/sdk')

let channelId = ''
let submited = []
let users = []
let time = {
    dialog: process.env.BOT_TIME_DIALOG,
    publish: process.env.BOT_TIME_PUBLISH
}

function getChannelMemberList() {
    console.log('try to get members from channel '+process.env.BOT_CHANNEL_NAME)

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

        console.log('get '+users.length+' members from channel '+process.env.BOT_CHANNEL_NAME)
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
        return submit.user.name == username
    })

    return submited.indexOf(response)
}

rocket.api.get('channels.list')
.then(response => {
    response.channels.forEach(channel => {
        if (channel.name == process.env.BOT_CHANNEL_NAME){
            channelId = channel._id
        }
    })

    getChannelMemberList()
})


setInterval(() => {
    if(moment().format('HH:mm:ss') == time.dialog) {
        users.forEach(user => {
            if (user.username == 'levi') {
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
            message1+='> '+submit.user.fullName+'\n'+'> '+submit.message1+'\n'+'** ** \n'
            message2+='> '+submit.user.fullName+'\n'+'> '+submit.message2+'\n'+'** ** \n'
            message3+='> '+submit.user.fullName+'\n'+'> '+submit.message3+'\n'+'** ** \n'
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

bot.global.direct(/yesterday(.*)/, (b) => {
    submited.push({
        user: b.message.user,
        message1: b.conditions.captured,
        message2: '',
        message3: '',
    })

    rocket.driver.getDirectMessageRoomId(b.message.user.name)
    .then(userRoomId => {
        rocket.driver.sendMessage({
            rid: userRoomId,
            msg: 'How about what will you do today? (answer with "today {your answer}")'
        })
    })
    .catch(error => {
        console.log(error)
    })
}, {
    id: 'yesterday-submited'
})

bot.global.direct(/today(.*)/, (b) => {
    let indexSubmit = findInSubmit(b.message.user.name)

    submited[indexSubmit].message2 = b.conditions.captured

    rocket.driver.getDirectMessageRoomId(b.message.user.name)
    .then(userRoomId => {
        rocket.driver.sendMessage({
            rid: userRoomId,
            msg: 'is anything blocking your progress? (answer with "blocking {your answer}")'
        })
    })
    .catch(error => {
        console.log(error)
    })
}, {
    id: 'today-submited'
})

bot.global.direct(/blocking(.*)/, (b) => {
    let indexSubmit = findInSubmit(b.message.user.name)

    submited[indexSubmit].message3 = b.conditions.captured

    inviteUserToChannel(b.message.user.name)

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
            console.log(error)
            b.respond('Alice ngantuk, nanti lagi ya~')
        })

    }
}, {
    id: 'thank-you-submited'
})

bot.start()
