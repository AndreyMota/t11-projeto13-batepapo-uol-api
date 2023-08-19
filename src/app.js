import express, { json } from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 5000;

app.listen(PORT);

app.get('/', (req, res) => {
    res.send('Opa');
})
