# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Media < Internal::Types::Model
      field :alt_text, -> { String }, optional: false, nullable: true, api_name: "altText"

      field :byte_size, -> { Integer }, optional: false, nullable: false, api_name: "byteSize"

      field :codec, -> { String }, optional: false, nullable: true

      field :content_type, -> { Peal::Types::MediaContentType }, optional: false, nullable: false, api_name: "contentType"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :dimensions, -> { Peal::Types::MediaDimensions }, optional: false, nullable: true

      field :duration_ms, -> { Integer }, optional: false, nullable: true, api_name: "durationMs"

      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Peal::Types::MediaKind }, optional: false, nullable: false

      field :page_count, -> { Integer }, optional: false, nullable: true, api_name: "pageCount"

      field :status, -> { Peal::Types::MediaStatus }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"

      field :url, -> { String }, optional: false, nullable: true
    end
  end
end
