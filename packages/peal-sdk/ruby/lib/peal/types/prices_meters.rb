# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PricesMeters < Internal::Types::Model
      field :assistant_images, -> { Peal::Types::UnitPrice }, optional: false, nullable: false, api_name: "assistantImages"

      field :assistant_requests, -> { Peal::Types::UnitPrice }, optional: false, nullable: false, api_name: "assistantRequests"

      field :managed_ads, -> { Peal::Types::UnitPrice }, optional: false, nullable: false, api_name: "managedAds"

      field :outbound_messages, -> { Peal::Types::UnitPrice }, optional: false, nullable: false, api_name: "outboundMessages"

      field :x_api, -> { Peal::Types::UnitPrice }, optional: false, nullable: false, api_name: "xApi"
    end
  end
end
