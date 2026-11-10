# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookURLRefusedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::WebhookURLRefusedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :reason, -> { Peal::Types::WebhookURLRefusal }, optional: false, nullable: false
    end
  end
end
