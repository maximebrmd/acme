# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ShortLinkReport < Internal::Types::Model
      field :days, -> { Internal::Types::Array[Peal::Types::ShortLinkDay] }, optional: false, nullable: false

      field :link, -> { Peal::Types::ShortLink }, optional: false, nullable: false

      field :period, -> { Peal::Types::ShortLinkPeriod }, optional: false, nullable: false
    end
  end
end
