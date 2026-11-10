# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdReport < Internal::Types::Model
      field :account, -> { Peal::Types::AdAccount }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :rows, -> { Internal::Types::Array[Peal::Types::Ad] }, optional: false, nullable: false

      field :to, -> { String }, optional: false, nullable: false
    end
  end
end
