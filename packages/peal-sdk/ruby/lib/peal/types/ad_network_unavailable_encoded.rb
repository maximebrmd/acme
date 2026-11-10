# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdNetworkUnavailableEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::AdNetworkUnavailableEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :retry_after_seconds, -> { Integer }, optional: false, nullable: true, api_name: "retryAfterSeconds"
    end
  end
end
