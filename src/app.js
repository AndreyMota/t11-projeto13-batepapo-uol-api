import express, { json } from "express";
import cors from "cors";
import { MonogClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config()

const app = express();
app.use(cors());
app.use(json());
const PORT = 5000;

const mongoClient = new MonogClient("mongodb://localhost:27017/BatepapoUol");
let db;
mongoClient.connect()
.then(() => db = mongoClient.db())
.catch((err) => console.log(err.message));

app.listen(PORT);

app.get('/', (req, res) => {
    res.send('Opa');
})
