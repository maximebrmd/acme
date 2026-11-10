# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class YouTubePlaylist < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :privacy, -> { String }, optional: false, nullable: true

      field :title, -> { String }, optional: false, nullable: false
    end
  end
end
