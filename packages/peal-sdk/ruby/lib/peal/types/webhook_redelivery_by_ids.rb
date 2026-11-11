# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookRedeliveryByIDs < Internal::Types::Model
      field :delivery_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "deliveryIds"
    end
  end
end
