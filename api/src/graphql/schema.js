// https://github.com/jonatanhallenberg/utpost-graphql-labb/blob/main/api/src/graphql/schema.js

export const typeDefs = /* GraphQL */ `
  type Guide {
    id: ID!
    slug: String!
    title: String!
    region: String!
    difficulty: String!
    lengthKm: Float!
    "Guidens första stycke, klippt efter 180 tecken. Texten bor i CMS:et"
    excerpt: String!
    heroImage: String
    published: Boolean!
    updatedAt: String!
    "Redaktionens notiser som gäller just den här guiden, hämtade ur CMS:et"
    notices: [Notice!]!
  }

  "En textbit i ett stycke. Klienten bestämmer hur fet text och länkar ser ut"
  type TextRun {
    text: String!
    bold: Boolean!
    italic: Boolean!
    "Vart textbiten länkar, om den är en länk"
    href: String
  }

  "Ett stycke, en rubrik eller en listpunkt. kind är paragraph, heading-2, heading-3, bullet-item eller number-item"
  type Block {
    kind: String!
    runs: [TextRun!]!
  }

  "En notis från redaktionen. Innehållet bor i CMS:et, inte i databasen"
  type Notice {
    id: ID!
    title: String!
    "info eller varning. Det säger vad notisen är, inte vilken färg den har"
    level: String!
    body: [Block!]!
    "Vilken guide notisen gäller. Tom betyder att den gäller hela Utpost"
    guideSlug: String
    "published, draft eller changed. Allt utom published syns bara i förhandsgranskningen"
    status: String!
  }

  type User {
    id: ID!
    displayName: String!
  }

  type Photo {
    id: ID!
    filename: String!
    width: Int!
    height: Int!
  }

  type LogPoint {
    recordedAt: String!
    lat: Float!
    lon: Float!
    elevationM: Int
    heartRate: Int
  }

  type Tour {
    id: ID!
    title: String!
    startedAt: String!
    distanceM: Int!
    notes: String
    user: User!
    guide: Guide
    photos: [Photo!]!
    logs: [LogPoint!]!
  }

  type Query {
    "Alla guider, senast uppdaterad först"
    guides: [Guide!]!
    "Publicerade guider, nyast först - det startsidan kallar populärast"
    popularGuides(limit: Int = 6): [Guide!]!
    guide(slug: String!): Guide
    regions: [String!]!
    "Redaktionens notiser. preview: true visar även utkast och kräver rollen editor"
    notices(preview: Boolean = false): [Notice!]!
    "Senaste turerna"
    tours(limit: Int = 50): [Tour!]!
    tour(id: ID!): Tour
  }

`;
