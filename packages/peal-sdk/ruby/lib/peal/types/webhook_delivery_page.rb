# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookDeliveryPage < Internal::Types::Model
      field :items, -> { Internal::Types::Array[Peal::Types::WebhookDelivery] }, optional: false, nullable: false

      field :next_cursor, -> { String }, optional: false, nullable: true, api_name: "nextCursor"
    end
  end
end
