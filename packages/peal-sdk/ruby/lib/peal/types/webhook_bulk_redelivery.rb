# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookBulkRedelivery < Internal::Types::Model
      field :redelivered, -> { Internal::Types::Array[Peal::Types::WebhookDelivery] }, optional: false, nullable: false

      field :remaining, -> { Integer }, optional: false, nullable: false

      field :skipped, -> { Internal::Types::Array[Peal::Types::WebhookRedeliverySkipped] }, optional: false, nullable: false
    end
  end
end
