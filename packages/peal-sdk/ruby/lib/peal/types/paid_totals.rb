# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PaidTotals < Internal::Types::Model
      field :clicks, -> { Integer }, optional: false, nullable: false

      field :impressions, -> { Integer }, optional: false, nullable: false

      field :reach, -> { Integer }, optional: false, nullable: false

      field :results, -> { Integer }, optional: false, nullable: true

      field :spend, -> { Integer }, optional: false, nullable: false
    end
  end
end
