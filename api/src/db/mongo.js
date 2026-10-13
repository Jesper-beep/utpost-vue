import { MongoClient } from "mongodb";
import { config } from "../config.js";

export const mongo = new MongoClient(config.mongodbUrl, {
	serverSelectionTimeoutMS: 3000,
});
export const mongoDb = () => mongo.db();
export const toursCollection = () => mongoDb().collection("tours");
