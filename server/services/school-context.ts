import { MongoClient, ObjectId } from "mongodb";

const uri = "mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/";
const client = new MongoClient(uri);

export async function getSchoolData(schoolCode: string) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("school_data");
  const school = await collection.findOne({ schoolCode });
  return school;
}

export async function getAllSessionsBySchool(schoolCode: string) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_sessions");
  return collection.find({ schoolCode }).toArray();
}

export async function getMessagesBySession(sessionId: string, schoolCode: string) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_messages");
  return collection.find({ sessionId, schoolCode }).toArray();
}

export async function storeSession(session: any) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_sessions");
  await collection.insertOne(session);
}

export async function storeMessage(message: any) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_messages");
  await collection.insertOne(message);
}

export async function countMessagesBySession(sessionId: string, schoolCode: string) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("chat_messages");
  return collection.countDocuments({ sessionId, schoolCode });
}
