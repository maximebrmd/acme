# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UploadPart < Internal::Types::Model
      field :byte_size, -> { Integer }, optional: false, nullable: false, api_name: "byteSize"

      field :part_number, -> { Integer }, optional: false, nullable: false, api_name: "partNumber"

      field :request, -> { Peal::Types::SignedRequest }, optional: false, nullable: false
    end
  end
end
