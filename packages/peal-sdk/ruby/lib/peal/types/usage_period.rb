# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UsagePeriod < Internal::Types::Model
      field :from, -> { String }, optional: false, nullable: false

      field :to, -> { String }, optional: false, nullable: false
    end
  end
end
