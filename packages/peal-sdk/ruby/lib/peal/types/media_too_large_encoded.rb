# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaTooLargeEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :byte_size, -> { Integer }, optional: false, nullable: false, api_name: "byteSize"

      field :kind, -> { Peal::Types::MediaTooLargeEncodedKind }, optional: false, nullable: false

      field :max_byte_size, -> { Integer }, optional: false, nullable: false, api_name: "maxByteSize"
    end
  end
end
