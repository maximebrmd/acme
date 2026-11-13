# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UsageDay < Internal::Types::Model
      field :assistant_requests, -> { Integer }, optional: false, nullable: true, api_name: "assistantRequests"

      field :billable_accounts, -> { Integer }, optional: false, nullable: true, api_name: "billableAccounts"

      field :by_platform, -> { Internal::Types::Array[Peal::Types::PlatformPosts] }, optional: false, nullable: false, api_name: "byPlatform"

      field :channels, -> { Integer }, optional: false, nullable: true

      field :day, -> { String }, optional: false, nullable: false

      field :media_storage, -> { Integer }, optional: false, nullable: true, api_name: "mediaStorage"

      field :members, -> { Integer }, optional: false, nullable: true

      field :published_posts, -> { Integer }, optional: false, nullable: false, api_name: "publishedPosts"
    end
  end
end
