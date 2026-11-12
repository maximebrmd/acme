# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ImageAspect
      extend Peal::Internal::Types::Enum

      SQUARE = "square"
      LANDSCAPE = "landscape"
      PORTRAIT = "portrait"
    end
  end
end
