# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaAttachment < Internal::Types::Model
      field :alt_text, -> { String }, optional: false, nullable: false, api_name: "altText"

      field :media_id, -> { String }, optional: false, nullable: false, api_name: "mediaId"
    end
  end
end
