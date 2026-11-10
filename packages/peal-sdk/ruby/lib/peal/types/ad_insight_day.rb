# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdInsightDay < Internal::Types::Model
      field :day, -> { String }, optional: false, nullable: false

      field :totals, -> { Peal::Types::PaidTotals }, optional: false, nullable: false
    end
  end
end
