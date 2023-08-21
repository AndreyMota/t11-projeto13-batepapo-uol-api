import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";
import { stripHtml } from "string-strip-html";

dotenv.config()

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 5000;

const nameSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
})

function verificaNumeroLimite(numero, limite) {
    // Verifica se o número é um número e maior que 0
    if (isNaN(numero) || numero <= 0) {
        console.log('não é um number');
        return false;
    }

    console.log('retornou true');
    return true;
  }

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
mongoClient.connect()
.then(() => db = mongoClient.db())
.catch((err) => console.log(err.message));

app.listen(PORT);

app.get('/participants', async (req, res) => {
    try {
        const lista = await db.collection("participants").find().toArray();
        res.status(200).send(lista);
    } catch (error) {
        res.status(500).send(error.message);
    } 
});

app.post('/participants', async (req, res) => {
    /* {name: 'João', lastStatus: 12313123} */
    
    const name = stripHtml(req.body.name).result.trim();
    const finalParticipant = req.body;
    const validation = nameSchema.validate(req.body, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const jatem = await db.collection("participants").findOne({name});
        if (jatem) {
            return res.status(409).send("Participante já está cadastrado");
        }
    } catch (error) {
        res.status(500).send(error.message);
    }

    finalParticipant.lastStatus = Date.now();

    try {
        const messi = {
            from: name,
            to: 'Todos' ,
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        };
        await db.collection("participants").insertOne(finalParticipant);
        await db.collection("messages").insertOne(messi);
        res.status(201).send(finalParticipant);
    } catch (error) {
        res.status(500).send(error.message);
    }
    
});

app.get('/messages', async (req, res) => {
    const li = req.query.limit;
    const user = req.headers.user;
    /* const lista = await db.collection("messages").find().toArray(); */
    
    const query = {
        $or: [
            { to: 'Todos' },
            { to: user },
            { from: user }
        ]
    };
    
    if (li) {
        try {
            const lista = await db.collection("messages").find(query).toArray();
            if (verificaNumeroLimite(li, lista.length)) {
                let final;
                if (li > lista.length) {
                    final = lista.slice(0);
                } else {
                    final = lista.slice(0, li);
                }
                return res.status(200).send(final);
            } else {
                return res.sendStatus(422);
            }
        } catch (error) {
            res.status(500).send(error.message);
        }
    } else {
        const lista = await db.collection("messages").find(query).toArray();
        res.status(200).send(lista);
    }
});

/* app.get('/messages', async (req, res) => {

}) */

app.post('/messages', async (req, res) => {
    const finalMessage = req.body;
    finalMessage.text = stripHtml(finalMessage.text).result.trim();
    const validation = messageSchema.validate(req.body, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }
    const from = req.headers.user;
    console.log(from);
    try {
        if (from) {
            console.log(from);
            const tem = await db.collection("participants").findOne({name: from});
            if (tem) {
                finalMessage.from = from;
            } else {
                return res.status(422).send("User não cadastrado");
            }
        } else {
            return res.status(422).send("User não presente no headers");
        }
    } catch (error) {
        res.status(500).send(error.message);
    }

    try {
        finalMessage.time = dayjs().format('HH:mm:ss');
        await db.collection("messages").insertOne(finalMessage);
        res.sendStatus(201);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/status', async (req, res) => {
    const user = req.headers.user;
  
    try {
      const existingUser = await db.collection('participants').findOne({ name: user });
  
      if (!existingUser) {
        return res.status(404).send('Usuário não encontrado.');
      }
  
      await db.collection('participants').updateOne(
        { name: user },
        { $set: { lastStatus: Date.now() } }
      );
  
      res.status(200).send('Status atualizado com sucesso.');
    } catch (error) {
      res.status(500).send(error.message);
    }
});
  
const removeInactiveParticipants = async () => {
    try {
      const currentTime = Date.now();
      const thresholdTime = currentTime - 10000; // 10 segundos atrás
  
      const inactiveParticipants = await db.collection('participants').find({ lastStatus: { $lt: thresholdTime } }).toArray();
  
      for (const participant of inactiveParticipants) {
        const { name } = participant;
        await db.collection('participants').deleteOne({ name });
  
        const statusMessage = {
          from: name,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: new Date().toLocaleTimeString()
        };
  
        await db.collection('messages').insertOne(statusMessage);
      }
  
      console.log('Participantes inativos removidos e mensagens de saída adicionadas.');
    } catch (error) {
      console.error('Erro:', error.message);
    }
};

setInterval(removeInactiveParticipants, 15000);