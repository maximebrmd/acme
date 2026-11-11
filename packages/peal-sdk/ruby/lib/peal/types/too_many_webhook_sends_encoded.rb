# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyWebhookSendsEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :allowed, -> { Integer }, optional: false, nullable: false

      field :retry_after_seconds, -> { Integer }, optional: false, nullable: false, api_name: "retryAfterSeconds"
    end
  end
end
