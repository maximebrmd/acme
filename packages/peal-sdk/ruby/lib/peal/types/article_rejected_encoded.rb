# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleRejectedEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :violations, -> { Internal::Types::Array[Peal::Types::ArticleViolation] }, optional: false, nullable: false
    end
  end
end
