const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, ] });

client.on('ready', () => {
    client.channels.cache.forEach((item, i) => {
        console.log(`item-${i}`, item.history);
    })
    
});
client.on('messageCreate', async (message) => {
    if(message.author.bot) return
    console.log('message', message.guild.members);
    message.channel.send('hello')
})

client.login('OTEyMDA1ODExNTExOTAyMzA4.YZppmQ.DRm2A2AYIMRVvEJ690V6TK5c3M8');