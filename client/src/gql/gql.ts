// https://github.com/jonatanhallenberg/utpost-integration-provkorning/blob/main/client/src/gql/gql.ts

/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import * as types from './graphql';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n\tquery Startsidan {\n\t\tguides {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tpopularGuides(limit: 6) {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tregions\n\t\ttours(limit: 5) {\n\t\t\tid\n\t\t\ttitle\n\t\t\tdistance_m: distanceM\n\t\t}\n\t}\n": typeof types.StartsidanDocument,
};
const documents: Documents = {
    "\n\tquery Startsidan {\n\t\tguides {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tpopularGuides(limit: 6) {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tregions\n\t\ttours(limit: 5) {\n\t\t\tid\n\t\t\ttitle\n\t\t\tdistance_m: distanceM\n\t\t}\n\t}\n": types.StartsidanDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n\tquery Startsidan {\n\t\tguides {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tpopularGuides(limit: 6) {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tregions\n\t\ttours(limit: 5) {\n\t\t\tid\n\t\t\ttitle\n\t\t\tdistance_m: distanceM\n\t\t}\n\t}\n"): (typeof documents)["\n\tquery Startsidan {\n\t\tguides {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tpopularGuides(limit: 6) {\n\t\t\tid\n\t\t\tslug\n\t\t\ttitle\n\t\t\tregion\n\t\t\tdifficulty\n\t\t\tbody_html: bodyHtml\n\t\t\tlength_km: lengthKm\n\t\t}\n\t\tregions\n\t\ttours(limit: 5) {\n\t\t\tid\n\t\t\ttitle\n\t\t\tdistance_m: distanceM\n\t\t}\n\t}\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;
