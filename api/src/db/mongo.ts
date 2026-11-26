import { type Collection, type Db, MongoClient } from "mongodb";
import { config } from "../config/env.ts";
import type { TourDocument } from "../types/tour-logs.ts";

export const mongo = new MongoClient(config.mongodbUrl, {
	serverSelectionTimeoutMS: 3000,
});

export const mongoDb = (): Db => {
	return mongo.db();
};

export const toursCollection = (): Collection<TourDocument> => {
	return mongoDb().collection<TourDocument>("tours");
};
