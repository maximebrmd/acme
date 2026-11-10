# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdsStatus < Internal::Types::Model
      field :mode, -> { Peal::Types::AdsMode }, optional: false, nullable: false

      field :networks, -> { Internal::Types::Array[Peal::Types::AdNetwork] }, optional: false, nullable: false
    end
  end
end
