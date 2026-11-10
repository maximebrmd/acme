# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyWebhookEndpointsEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::TooManyWebhookEndpointsEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :allowed, -> { Integer }, optional: false, nullable: false
    end
  end
end
