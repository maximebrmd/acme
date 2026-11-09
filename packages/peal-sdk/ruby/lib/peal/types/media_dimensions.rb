# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaDimensions < Internal::Types::Model
      field :height, -> { Integer }, optional: false, nullable: false

      field :width, -> { Integer }, optional: false, nullable: false
    end
  end
end
