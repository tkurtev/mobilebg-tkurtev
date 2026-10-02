import { relations } from "drizzle-orm";
import { profiles, users } from "./auth";
import { dealerLocations, dealerMembers, dealerOpeningHours, dealers } from "./dealers";
import { favorites, savedSearches } from "./engagement";
import {
  listingAttributes,
  listingFeatures,
  listingImages,
  listingPriceHistory,
  listings,
} from "./listings";
import { cities, regions } from "./locations";
import { conversationParticipants, conversations, messages } from "./messaging";
import { listingReports, moderationActions } from "./moderation";
import { payments, promotions } from "./payments";
import { categories, vehicleGenerations, vehicleMakes, vehicleModels } from "./taxonomy";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  listings: many(listings),
  favorites: many(favorites),
  savedSearches: many(savedSearches),
  dealerMembership: one(dealerMembers, { fields: [users.id], references: [dealerMembers.userId] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  city: one(cities, { fields: [profiles.cityId], references: [cities.id] }),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  region: one(regions, { fields: [cities.regionId], references: [regions.id] }),
}));

export const vehicleMakesRelations = relations(vehicleMakes, ({ many }) => ({
  models: many(vehicleModels),
}));

export const vehicleModelsRelations = relations(vehicleModels, ({ one, many }) => ({
  make: one(vehicleMakes, { fields: [vehicleModels.makeId], references: [vehicleMakes.id] }),
  generations: many(vehicleGenerations),
}));

export const vehicleGenerationsRelations = relations(vehicleGenerations, ({ one }) => ({
  model: one(vehicleModels, { fields: [vehicleGenerations.modelId], references: [vehicleModels.id] }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  category: one(categories, { fields: [listings.categoryId], references: [categories.id] }),
  seller: one(users, { fields: [listings.sellerId], references: [users.id] }),
  dealer: one(dealers, { fields: [listings.dealerId], references: [dealers.id] }),
  make: one(vehicleMakes, { fields: [listings.makeId], references: [vehicleMakes.id] }),
  model: one(vehicleModels, { fields: [listings.modelId], references: [vehicleModels.id] }),
  generation: one(vehicleGenerations, { fields: [listings.generationId], references: [vehicleGenerations.id] }),
  region: one(regions, { fields: [listings.regionId], references: [regions.id] }),
  city: one(cities, { fields: [listings.cityId], references: [cities.id] }),
  images: many(listingImages),
  attributes: many(listingAttributes),
  features: many(listingFeatures),
  priceHistory: many(listingPriceHistory),
  promotions: many(promotions),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, { fields: [listingImages.listingId], references: [listings.id] }),
}));

export const listingAttributesRelations = relations(listingAttributes, ({ one }) => ({
  listing: one(listings, { fields: [listingAttributes.listingId], references: [listings.id] }),
}));

export const listingFeaturesRelations = relations(listingFeatures, ({ one }) => ({
  listing: one(listings, { fields: [listingFeatures.listingId], references: [listings.id] }),
}));

export const listingPriceHistoryRelations = relations(listingPriceHistory, ({ one }) => ({
  listing: one(listings, { fields: [listingPriceHistory.listingId], references: [listings.id] }),
}));

export const dealersRelations = relations(dealers, ({ one, many }) => ({
  city: one(cities, { fields: [dealers.cityId], references: [cities.id] }),
  region: one(regions, { fields: [dealers.regionId], references: [regions.id] }),
  members: many(dealerMembers),
  locations: many(dealerLocations),
  openingHours: many(dealerOpeningHours),
  listings: many(listings),
}));

export const dealerMembersRelations = relations(dealerMembers, ({ one }) => ({
  dealer: one(dealers, { fields: [dealerMembers.dealerId], references: [dealers.id] }),
  user: one(users, { fields: [dealerMembers.userId], references: [users.id] }),
}));

export const dealerLocationsRelations = relations(dealerLocations, ({ one }) => ({
  dealer: one(dealers, { fields: [dealerLocations.dealerId], references: [dealers.id] }),
  city: one(cities, { fields: [dealerLocations.cityId], references: [cities.id] }),
}));

export const dealerOpeningHoursRelations = relations(dealerOpeningHours, ({ one }) => ({
  dealer: one(dealers, { fields: [dealerOpeningHours.dealerId], references: [dealers.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  listing: one(listings, { fields: [favorites.listingId], references: [listings.id] }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, { fields: [savedSearches.userId], references: [users.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  listing: one(listings, { fields: [conversations.listingId], references: [listings.id] }),
  buyer: one(users, { fields: [conversations.buyerId], references: [users.id] }),
  seller: one(users, { fields: [conversations.sellerId], references: [users.id] }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, { fields: [conversationParticipants.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const listingReportsRelations = relations(listingReports, ({ one }) => ({
  listing: one(listings, { fields: [listingReports.listingId], references: [listings.id] }),
  reporter: one(users, { fields: [listingReports.reporterId], references: [users.id] }),
}));

export const moderationActionsRelations = relations(moderationActions, ({ one }) => ({
  listing: one(listings, { fields: [moderationActions.listingId], references: [listings.id] }),
  moderator: one(users, { fields: [moderationActions.moderatorId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  listing: one(listings, { fields: [payments.listingId], references: [listings.id] }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  listing: one(listings, { fields: [promotions.listingId], references: [listings.id] }),
  payment: one(payments, { fields: [promotions.paymentId], references: [payments.id] }),
}));
