# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartPreview < Internal::Types::Model
      field :hashtags, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :links, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :media, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :mentions, -> { Peal::Types::LimitedCount }, optional: false, nullable: false

      field :part, -> { Integer }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false

      field :text_counts, -> { Internal::Types::Array[Peal::Types::TextCount] }, optional: false, nullable: false, api_name: "textCounts"
    end
  end
end
