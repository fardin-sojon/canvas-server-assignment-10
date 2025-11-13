const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000;

// middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_CANVAS}:${process.env.DB_PASS}@simple-crud-mongodb-pra.v6jm7nb.mongodb.net/?appName=simple-crud-mongodb-practice`;

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
    // await client.connect();

    const db = client.db('canvas-db')
    const canvasCollection = db.collection('canvas')
    const favoritesCollection = db.collection('favorites');

    app.get('/recent-artwork', async (req, res) => {
      const cursor = canvasCollection.find().sort({ createdAt: -1 }).limit(6)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/artwork', async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.artistEmail = email;
      }

      const cursor = canvasCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });


    app.get('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await canvasCollection.findOne(query)
      res.send(result)
    })

    app.post('/artwork', async (req, res) => {
      const newArtwork = req.body;
      const result = await canvasCollection.insertOne(newArtwork)
      res.send(result)
    })

    app.delete('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await canvasCollection.deleteOne(query);
      res.send(result);
    });



    app.patch('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const updateArtwork = req.body;
      const query = { _id: new ObjectId(id) };

      const update = {
        $set: updateArtwork,
      };

      const result = await canvasCollection.updateOne(query, update);
      res.send(result);
    });



    app.patch('/artwork/:id/like', async (req, res) => {
      const id = req.params.id;
      const result = await canvasCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { likes: 1 } }
      );
      res.send(result);
    });


    app.post('/favorites', async (req, res) => {
      const { artworkId, userEmail } = req.body;
      const exists = await favoritesCollection.findOne({ artworkId, userEmail });
      if (exists) return res.status(400).send({ message: 'Already in favorites' });
      const result = await favoritesCollection.insertOne({ artworkId, userEmail, addedAt: new Date() });
      res.send(result);
    });


    app.delete('/favorites', async (req, res) => {
      const { artworkId, userEmail } = req.body;
      const result = await favoritesCollection.deleteOne({ artworkId, userEmail });
      res.send(result);
    });

    app.get('/favorites/:email', async (req, res) => {
      const email = req.params.email;
      const favs = await favoritesCollection.find({ userEmail: email }).toArray();
      const artworkIds = favs.map(f => new ObjectId(f.artworkId));
      const artworks = await canvasCollection.find({ _id: { $in: artworkIds } }).toArray();
      res.send(artworks);
    });



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Canvas Server started on port: ${port}`)
})


module.exports = app;