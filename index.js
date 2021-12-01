import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import express from 'express';
import { URLSearchParams } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';
dotenv.config();
const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
const app = express();
import { Client, Intents } from 'discord.js';

const docs = google.docs('v1');
const drive = google.drive('v3');
export const authenticateGoogle = async () => {
  const auth = await authenticate({
    keyfilePath: path.join(path.resolve(), 'g-secret.json'),
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  google.options({ auth });
};

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
  ],
});

const commands = [
  {
    name: 'idea',
    description: 'sends doc',
    options: [
      {
        name: 'title',
        description: 'title of doc',
        type: 3,
        required: true,
      },
      {
        name: 'desc',
        description: 'description of idea',
        type: 3,
        required: true,
      },
    ],
  },
];
client.on('ready', () => {
  console.log('Logged in as ', client.user.tag);
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  message.channel.send('hello');
});
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'idea') {
    try {
      const options = interaction.options._hoistedOptions;
      console.log({ options });
      await interaction.reply('Logging in to google!');
      if (options.length) {
        await authenticateGoogle();
        const title = options.find((i) => i.name === 'title');
        const desc = options.find((i) => i.name === 'desc');
        const createResponse = await docs.documents.create({
          requestBody: {
            title: title.value,
          },
        });
        await docs.documents.batchUpdate({
          documentId: createResponse.data.documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  // The first text inserted into the document must create a paragraph,
                  // which can't be done with the `location` property.  Use the
                  // `endOfSegmentLocation` instead, which assumes the Body if
                  // unspecified.
                  endOfSegmentLocation: {},
                  text: desc.value,
                },
              },
            ],
          },
        });
        if (process.env.DRIVE_FOLDER) {
          await drive.files.update({
            fileId: createResponse.data.documentId,
            addParents: process.env.DRIVE_FOLDER,
          });
        }

        await interaction.editReply(
          `https://docs.google.com/document/d/${createResponse.data.documentId}`
        );
      }
    } catch (e) {
      console.log({ e });
      await interaction.editReply('Something went wrong!');
    }
  }
});
client.login(process.env.TOKEN);

app.use(express.json());
//Getting list of members in a server
app.get('/members', async (req, res) => {
  try {
    const response = await rest.get(Routes.guildMembers(process.env.GUILD_ID), {
      query: 'limit=100',
    });
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.json({ error: error });
  }
});

//Create discord command
app.post('/command/create', async (req, res) => {
  try {
    const command = req.body;
    const response = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: command?.length ? command : commands,
      }
    );
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.json({ error: error });
  }
});

//Create google drive folder, input folderName
app.post('/drive/folder/create', async (req, res) => {
  try {
    const { folderName } = req.body;
    if (!folderName) {
      return res.status(400).json({ error: 'folderName is required!' });
    }
    await authenticateGoogle();
    var fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const response = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    res.json({ folderId: response?.data?.id });
  } catch (error) {
    console.error(error);
    res.json({ error: error });
  }
});
//List discord commands
app.get('/command/list', async (req, res) => {
  try {
    const response = await rest.get(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      )
    );
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.json({ error: error });
  }
});
//Update discord command
app.put('/command/update/:id', async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: 'command id not provided!' });
    }
    const command = req.body;
    const response = await rest.patch(
      Routes.applicationGuildCommand(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
        req.params.id
      ),
      {
        body: command,
      }
    );
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.json({ error: error });
  }
});
//Delete discord command
app.delete('/command/delete/:id', async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ error: 'command id not provided!' });
    }
    const response = await rest.delete(
      Routes.applicationGuildCommand(
        process.env.CLIENT_ID,
        process.env.GUILD_ID,
        req.params.id
      )
    );
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.json({ error: error });
  }
});

//Getting list of channel messages
app.get('/channels/messages/:id', async (req, res, next) => {
  try {
    const response = await rest.get(Routes.channelMessages(req.params.id), {
      query: 'limit=10&after=912314688941985865',
    });
    res.json({ response, total: response.length });
  } catch (error) {
    console.error(error);
    res.json({ error: error });
  }
});

//Authorization of bot
app.get('/discord', async (req, res) => {
  try {
    // Add the parameters
    const params = new URLSearchParams();
    params.append('client_id', process.env.CLIENT_ID);
    params.append('client_secret', process.env.CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', req.query.code);
    params.append('scope', 'bot');
    params.append('redirect_uri', process.env.REDIRECT_URI);
    console.log(params.toString());
    fetch('https://discord.com/api/oauth2/token', {
      method: 'post',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    })
      .then((r) => r.json())
      .then((Response) => {
        // Handle it...
        res.json({ res: Response });
      });
  } catch (e) {
    res.json({ e: e });
  }
});

//Authorization of gclient
app.get('/docs', async (req, res) => {
  console.log(req);
  try {
    const auth = await authenticate({
      keyfilePath: path.join(path.resolve(), 'g-secret.json'),
      scopes: 'https://www.googleapis.com/auth/documents',
    });
    google.options({ auth });
    const createResponse = await docs.documents.create({
      requestBody: {
        title: 'Your new document!',
      },
    });
    const updateResponse = await docs.documents.batchUpdate({
      documentId: createResponse.data.documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              // The first text inserted into the document must create a paragraph,
              // which can't be done with the `location` property.  Use the
              // `endOfSegmentLocation` instead, which assumes the Body if
              // unspecified.
              endOfSegmentLocation: {},
              text: 'Hello there!',
            },
          },
        ],
      },
    });
    console.log(createResponse.data);
    res.json({ createResponse: createResponse.data });
  } catch (e) {
    res.json({ e: e.message });
  }
});
app.listen(3003, () => {
  console.log('Running');
});
