# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UploadTargetMultipart < Internal::Types::Model
      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"

      field :part_size, -> { Integer }, optional: false, nullable: false, api_name: "partSize"

      field :parts, -> { Internal::Types::Array[Peal::Types::UploadPart] }, optional: false, nullable: false
    end
  end
end
