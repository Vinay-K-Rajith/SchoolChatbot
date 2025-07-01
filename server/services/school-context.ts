import { MongoClient } from "mongodb";

const uri = "mongodb+srv://vaishakhp11:PiPa7LUEZ5ufQo8z@cluster0.toscmfj.mongodb.net/";
const client = new MongoClient(uri);

export async function getSchoolData(schoolCode: string) {
  await client.connect();
  const db = client.db("test");
  const collection = db.collection("school_data");
  const school = await collection.findOne({ schoolCode });
  return school;
}
