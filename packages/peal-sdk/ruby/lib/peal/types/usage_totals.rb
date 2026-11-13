# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UsageTotals < Internal::Types::Model
      field :billable_account_days, -> { Integer }, optional: false, nullable: true, api_name: "billableAccountDays"

      field :by_platform, -> { Internal::Types::Array[Peal::Types::PlatformPosts] }, optional: false, nullable: false, api_name: "byPlatform"

      field :channel_days, -> { Integer }, optional: false, nullable: false, api_name: "channelDays"

      field :days_counted, -> { Integer }, optional: false, nullable: false, api_name: "daysCounted"

      field :metered_posts, -> { Internal::Types::Array[Peal::Types::MeteredPosts] }, optional: false, nullable: false, api_name: "meteredPosts"

      field :published_posts, -> { Integer }, optional: false, nullable: false, api_name: "publishedPosts"
    end
  end
end
