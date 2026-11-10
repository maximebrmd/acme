# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostContentInvalidEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::PostContentInvalidEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :violations, -> { Internal::Types::Array[Peal::Types::ContentViolation] }, optional: false, nullable: false
    end
  end
end
