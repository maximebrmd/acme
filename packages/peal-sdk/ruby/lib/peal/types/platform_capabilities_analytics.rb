# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlatformCapabilitiesAnalytics < Internal::Types::Model
      field :account_numbers, -> { Internal::Types::Array[Peal::Types::PlatformCapabilitiesAnalyticsAccountNumbersItem] }, optional: false, nullable: false, api_name: "accountNumbers"

      field :per_post, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "perPost"

      field :post_counts, -> { Internal::Types::Array[Peal::Types::PlatformCapabilitiesAnalyticsPostCountsItem] }, optional: false, nullable: false, api_name: "postCounts"
    end
  end
end
