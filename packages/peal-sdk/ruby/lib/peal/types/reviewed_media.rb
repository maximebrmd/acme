# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReviewedMedia < Internal::Types::Model
      field :alt_text, -> { String }, optional: false, nullable: false, api_name: "altText"

      field :kind, -> { Peal::Types::MediaKind }, optional: false, nullable: true

      field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"

      field :url, -> { String }, optional: false, nullable: true
    end
  end
end
