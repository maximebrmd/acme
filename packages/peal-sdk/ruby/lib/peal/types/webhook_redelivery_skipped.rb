# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookRedeliverySkipped < Internal::Types::Model
      field :delivery_id, -> { String }, optional: false, nullable: false, api_name: "deliveryId"

      field :reason, -> { Peal::Types::WebhookRedeliverySkip }, optional: false, nullable: false
    end
  end
end
