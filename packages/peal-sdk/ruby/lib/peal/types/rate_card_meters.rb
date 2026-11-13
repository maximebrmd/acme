# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCardMeters < Internal::Types::Model
      field :assistant_images, -> { Peal::Types::MeterTerms }, optional: false, nullable: false, api_name: "assistantImages"

      field :assistant_requests, -> { Peal::Types::MeterTerms }, optional: false, nullable: false, api_name: "assistantRequests"

      field :managed_ads, -> { Peal::Types::MeterTerms }, optional: false, nullable: false, api_name: "managedAds"

      field :outbound_messages, -> { Peal::Types::MeterTerms }, optional: false, nullable: false, api_name: "outboundMessages"

      field :x_api, -> { Peal::Types::MeterTerms }, optional: false, nullable: false, api_name: "xApi"
    end
  end
end
