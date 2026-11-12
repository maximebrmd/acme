# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FeedPreview < Internal::Types::Model
      field :items, -> { Internal::Types::Array[Peal::Types::FeedPreviewItem] }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: true
    end
  end
end
