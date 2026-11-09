# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostContent < Internal::Types::Model
      field :media, -> { Internal::Types::Array[Peal::Types::MediaAttachment] }, optional: false, nullable: false

      field :overrides, -> { Internal::Types::Array[Peal::Types::TextOverride] }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
