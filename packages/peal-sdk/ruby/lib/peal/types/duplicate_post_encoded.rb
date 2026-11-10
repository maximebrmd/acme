# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class DuplicatePostEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :duplicates, -> { Internal::Types::Array[Peal::Types::DuplicateOnChannel] }, optional: false, nullable: false
    end
  end
end
