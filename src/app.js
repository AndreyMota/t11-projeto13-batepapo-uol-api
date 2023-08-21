import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

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
  
    // Verifica se o número não excede o limite definido
    if (numero > limite) {
        console.log('maior que o limite');
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
    
    const name = req.body.name;
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
    const lista = await db.collection("messages").find().toArray();
    if (li) {
        try {
            if (verificaNumeroLimite(li, lista.length)) {
                const final = lista.slice(0, li);
                return res.status(201).send(final);
            } else {
                return res.sendStatus(422);
            }
        } catch (error) {
            res.status(500).send(error.message);
        }
    } else{
        try {
            res.status(200).send(lista);
        } catch (error) {
            res.status(500).send(error.message);
        }
    }
    
});

/* app.get('/messages', async (req, res) => {

}) */

app.post('/messages', async (req, res) => {
    const finalMessage = req.body;
    const validation = messageSchema.validate(req.body, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }
    const from = req.headers.user;
    console.log(from);
    try {
        if (from) {
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
})
