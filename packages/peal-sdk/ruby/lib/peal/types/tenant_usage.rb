# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TenantUsage < Internal::Types::Model
      field :assistant_requests, -> { Integer }, optional: false, nullable: false, api_name: "assistantRequests"

      field :by_platform, -> { Internal::Types::Array[Peal::Types::PlatformPosts] }, optional: false, nullable: false, api_name: "byPlatform"

      field :channel_days, -> { Integer }, optional: false, nullable: false, api_name: "channelDays"

      field :channels, -> { Integer }, optional: false, nullable: false

      field :days_counted, -> { Integer }, optional: false, nullable: false, api_name: "daysCounted"

      field :external_id, -> { String }, optional: false, nullable: true, api_name: "externalId"

      field :home, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :media_storage, -> { Integer }, optional: false, nullable: true, api_name: "mediaStorage"

      field :metered_posts, -> { Internal::Types::Array[Peal::Types::MeteredPosts] }, optional: false, nullable: false, api_name: "meteredPosts"

      field :name, -> { String }, optional: false, nullable: false

      field :published_posts, -> { Integer }, optional: false, nullable: false, api_name: "publishedPosts"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
