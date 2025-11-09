const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000;

// middleware
app.use(cors())
app.use(express.json())

const uri = "mongodb+srv://canvasdb:30D7GNVeVFWx17MU@simple-crud-mongodb-pra.v6jm7nb.mongodb.net/?appName=simple-crud-mongodb-practice";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('Canvas Running On Server!')
})

async function run() {
  try {
    await client.connect();

    const db = client.db('canvas-db')
    const canvasCollection = db.collection('canvas')

    app.get('/recent-artwork', async(req, res)=>{
      const cursor = canvasCollection.find().sort({createdAt: -1}).limit(6)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/artwork', async(req, res)=>{
      const cursor = canvasCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/artwork/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await canvasCollection.findOne(query)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Canvas Server started on port ${port}`)
})