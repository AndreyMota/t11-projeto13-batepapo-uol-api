import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";

dotenv.config()

const app = express();
app.use(cors());
app.use(json());
const PORT = 5000;

const nameSchema = joi.object({
    name: joi.string().required()
})

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
    const finalParticipant = req.body;
    const validation = nameSchema.validate(req.body, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    finalParticipant.lastStatus = Date.now();

    try {
        await db.collection("participants").insertOne(finalParticipant);
        res.status(201).send(finalParticipant);
    } catch (error) {
        res.status(500).send(error.message);
    }
    
})
