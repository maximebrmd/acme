# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ShortLinkDay < Internal::Types::Model
      field :clicks, -> { Integer }, optional: false, nullable: false

      field :day, -> { String }, optional: false, nullable: false
    end
  end
end
