# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookEndpointSecret < Internal::Types::Model
      field :endpoint, -> { Peal::Types::WebhookEndpoint }, optional: false, nullable: false

      field :secret, -> { String }, optional: false, nullable: false
    end
  end
end
