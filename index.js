import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const username = process.env.DB_CANVAS;
const password = process.env.DB_PASS;
const uri = `mongodb+srv://${username}:${password}@simple-crud-mongodb-pra.v6jm7nb.mongodb.net/?retryWrites=true&w=majority&appName=simple-crud-mongodb-practice`;

let client;
let db;

// Function to ensure DB is connected before processing request
async function connectToDB() {
  if (db) return db; // Return existing connection if valid

  if (!uri) {
    throw new Error("⚠️ No MongoDB connection string found in .env");
  }

  try {
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: "1",
          strict: true,
          deprecationErrors: true,
        },
      });
      await client.connect();
      console.log("Connected to MongoDB");
    }
    db = client.db("canvas-db");
    return db;
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    throw error;
  }
}

// --- ROUTES ---

// Root Route
app.get("/", (req, res) => {
  res.send("CanvasConnect Server is Running Successfully!");
});

// GET all artwork
app.get("/artwork", async (req, res) => {
  try {
    const database = await connectToDB();
    const email = req.query.email;
    let query = {};
    if (email) {
      query = { artistEmail: email };
    } else {
      // If no email (Explore page), exclude 'Private' posts
      query = { visibility: { $ne: "Private" } };
    }
    const artworks = await database.collection("canvas").find(query).toArray();
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent artwork
app.get("/recent-artwork", async (req, res) => {
  try {
    const database = await connectToDB();
    const artworks = await database.collection("canvas")
      .find({ visibility: { $ne: "Private" } })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single artwork
app.get("/artwork/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const database = await connectToDB();
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    const artwork = await database.collection("canvas").findOne({ _id: new ObjectId(id) });
    if (!artwork) {
      return res.status(404).json({ error: "Artwork not found" });
    }
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new artwork
app.post("/artwork", async (req, res) => {
  try {
    const database = await connectToDB();
    const newArtwork = req.body;
    const result = await database.collection("canvas").insertOne(newArtwork);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH artwork (Update)
app.patch("/artwork/:id", async (req, res) => {
  const id = req.params.id;
  const updatedArtwork = req.body;

  // Remove _id from the update payload if present to avoid immutable field error
  delete updatedArtwork._id;

  try {
    const database = await connectToDB();
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: updatedArtwork,
    };
    const result = await database.collection("canvas").updateOne(filter, updateDoc);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE artwork
app.delete("/artwork/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const database = await connectToDB();
    const query = { _id: new ObjectId(id) };
    const result = await database.collection("canvas").deleteOne(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET favorites
app.get("/favorites/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const database = await connectToDB();
    const favorites = await database.collection("favorites").aggregate([
      { $match: { userEmail: email } },
      {
        $addFields: {
          artworkObjectId: { $toObjectId: "$artworkId" }
        }
      },
      {
        $lookup: {
          from: "canvas",
          localField: "artworkObjectId",
          foreignField: "_id",
          as: "artwork"
        }
      },
      { $unwind: "$artwork" },
      {
        $project: {
          _id: 1,
          userEmail: 1,
          artworkId: 1,
          title: "$artwork.title",
          image: "$artwork.image",
          category: "$artwork.category",
          artistName: "$artwork.artistName"
        }
      }
    ]).toArray();
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST favorites
app.post("/favorites", async (req, res) => {
  try {
    const database = await connectToDB();
    const favoriteItem = req.body;
    const exists = await database.collection("favorites").findOne({
      artworkId: favoriteItem.artworkId,
      userEmail: favoriteItem.userEmail
    });
    if (exists) {
      return res.status(409).json({ message: "Already in favorites" });
    }
    const result = await database.collection("favorites").insertOne(favoriteItem);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE favorites
app.delete("/favorites", async (req, res) => {
  try {
    const database = await connectToDB();
    const { artworkId, userEmail } = req.body;
    const result = await database.collection("favorites").deleteOne({ artworkId, userEmail });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Routes
app.post("/users", async (req, res) => {
  try {
    const database = await connectToDB();
    const user = req.body;
    const query = { email: user.email };
    const existingUser = await database.collection("users").findOne(query);
    if (existingUser) {
      return res.send({ message: "User already exists", insertedId: null });
    }
    const result = await database.collection("users").insertOne(user);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const database = await connectToDB();
    const result = await database.collection("users").find().toArray();
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const database = await connectToDB();
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = { $set: { role: "admin" } };
    const result = await database.collection("users").updateOne(filter, updatedDoc);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User Profile (General)
app.patch("/users/:email", async (req, res) => {
  const email = req.params.email;
  const { name, photoURL } = req.body;
  try {
    const database = await connectToDB();
    const filter = { email: email };
    const updatedDoc = {
      $set: {
        name: name,
        photoURL: photoURL
      }
    };
    const result = await database.collection("users").updateOne(filter, updatedDoc);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const database = await connectToDB();
    const query = { _id: new ObjectId(id) };
    const result = await database.collection("users").deleteOne(query);
    res.send(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Stats
app.get("/admin-stats", async (req, res) => {
  try {
    const database = await connectToDB();
    const usersCount = await database.collection("users").estimatedDocumentCount();
    const artworksCount = await database.collection("canvas").estimatedDocumentCount();

    // Calculate total revenue (assuming price field exists and is a string/number)
    // For now, we'll return a mock or simple sum if possible. 
    // Let's just return counts for now as price might be string formatted like "$20".

    res.send({
      usersCount,
      artworksCount,
      revenue: 12450, // Mock for now unless we parse all prices
      growth: 24 // Mock
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Local Development
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
