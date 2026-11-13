# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RateCardXRates < Internal::Types::Model
      field :dm_create, -> { Integer }, optional: false, nullable: false, api_name: "dmCreate"

      field :dm_event_read, -> { Integer }, optional: false, nullable: false, api_name: "dmEventRead"

      field :owned_read, -> { Integer }, optional: false, nullable: false, api_name: "ownedRead"

      field :post_create, -> { Integer }, optional: false, nullable: false, api_name: "postCreate"

      field :post_create_with_url, -> { Integer }, optional: false, nullable: false, api_name: "postCreateWithUrl"

      field :post_read, -> { Integer }, optional: false, nullable: false, api_name: "postRead"

      field :user_read, -> { Integer }, optional: false, nullable: false, api_name: "userRead"
    end
  end
end
