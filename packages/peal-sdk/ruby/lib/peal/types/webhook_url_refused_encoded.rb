# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookURLRefusedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::WebhookURLRefusedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :reason, -> { Peal::Types::WebhookURLRefusal }, optional: false, nullable: false
    end
  end
end
