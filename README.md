
# rocket-daily-standup

## Project setup
1. Run this command
```
npm install
```
2. Change BOT for bot identifiaction
3. Change ROOMS for rooms name where bot will post user's stand-up
4. TIME_DIALOG for when bot will asking user's. (Example : '09:00:00)
5. TIME_PUBLISH for when bot will post user's stand-up to channel BOT_CHANNEL_NAME. (Example : '10:00:00)
6. change URL for bot server. (Example: https://chat.bahaso.com)
7. USER for rocketchat username login
8. PASS for rocketchat password login

### Compiles for development
```
npm run watch
```
or you can use
```
npm run debug
```

### Compiles for production
```
npm run start
```


### Usefull links
- [bBot API](https://amazebot.github.io/bbot/index.html)
- [Rocket.Chat SDK](https://github.com/RocketChat/Rocket.Chat.js.SDK)
- [Rocket.Chat API](https://rocket.chat/docs/developer-guides/rest-api/)