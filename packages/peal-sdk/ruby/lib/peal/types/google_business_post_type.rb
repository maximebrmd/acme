# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module GoogleBusinessPostType
      extend Peal::Internal::Types::Enum

      STANDARD = "standard"
      EVENT = "event"
      OFFER = "offer"
    end
  end
end
